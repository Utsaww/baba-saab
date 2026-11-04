import fs from "node:fs";
import path from "node:path";
import sparticuz from "@sparticuz/chromium";
import { chromium } from "playwright-core";
import { buildTimeline } from "./timeline";

/**
 * Plays the live page as a first-time guest on a phone and keeps every screencast frame with its real time
 * (seconds from the first frame). Frames arrive only when the page changes, so holds show as gaps.
 */
export async function record({ url, tmpDir }: { url: string; tmpDir: string }): Promise<{ frames: { file: string; t: number }[]; seconds: number }> {
  const browser = await chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args });
  try {
    const page = await browser.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 8 / 3, isMobile: true, hasTouch: true });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2500); // React hydration

    const cdp = await page.context().newCDPSession(page);
    const frames: { file: string; t: number }[] = [];
    cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      const file = path.join(tmpDir, `${String(frames.length + 1).padStart(5, "0")}.jpg`);
      fs.writeFileSync(file, Buffer.from(data, "base64"));
      frames.push({ file, t: metadata.timestamp ?? 0 });
      cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
    await page.waitForTimeout(1500); // the closed opening

    await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[role="dialog"] button')].pop()?.click());
    await page.waitForTimeout(1000);
    // A scratch opening is still a canvas after the tap: scratch it with a zig-zag stroke, as a guest's finger would.
    const canvas = page.locator('[role="dialog"] canvas').first();
    const box = (await canvas.count()) ? await canvas.boundingBox() : null;
    if (box) {
      await page.mouse.move(box.x, box.y);
      await page.mouse.down();
      for (let i = 0; i < 8; i++) {
        await page.mouse.move(i % 2 ? box.x : box.x + box.width, box.y + (box.height * (i + 1)) / 8, { steps: 10 });
        await page.waitForTimeout(50); // 8 passes ≈ 400 ms
      }
      await page.mouse.up();
    }
    await page.waitForTimeout(3000);

    // Stops in page order: cover names, the couple block (first match to last), the big date, each event; then the closing.
    const measured = await page.evaluate(() => {
      const mid = (el: Element) => el.getBoundingClientRect().top + scrollY + (el as HTMLElement).offsetHeight / 2 - innerHeight / 2;
      const pick = (sel: string) => [...document.querySelectorAll(sel)];
      const couple = pick('[class*="base_couple"]');
      const coupleStop = couple.length
        ? [(couple[0].getBoundingClientRect().top + couple.at(-1)!.getBoundingClientRect().bottom) / 2 + scrollY - innerHeight / 2]
        : [];
      const stops = [...pick('[class*="coverNames"]').map(mid), ...coupleStop, ...pick('[class*="bigDate"]').map(mid), ...pick('li[class*="base_event"]').map(mid)];
      const max = document.documentElement.scrollHeight - innerHeight;
      const closing = pick("section").at(-1);
      const end = closing ? Math.min(closing.getBoundingClientRect().bottom + scrollY - innerHeight + 40, max) : max;
      return { stops, end: Math.max(0, Math.round(end)) };
    });
    const timeline = buildTimeline(measured);

    // Glide (eased, min 400 ms) from the top through every target, holding after each; the last hold is finalHold.
    await page.evaluate(
      ({ targets, speed, hold, finalHold }) =>
        new Promise<void>((done) => {
          const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
          scrollTo(0, 0);
          let i = 0;
          const glide = () => {
            const from = scrollY;
            const to = targets[i++];
            const T = Math.max(400, (Math.abs(to - from) / speed) * 1000);
            const t0 = performance.now();
            const step = (now: number) => {
              const x = Math.min((now - t0) / T, 1);
              scrollTo(0, from + (to - from) * ease(x));
              if (x < 1) requestAnimationFrame(step);
              else setTimeout(i < targets.length ? glide : done, (i < targets.length ? hold : finalHold) * 1000);
            };
            requestAnimationFrame(step);
          };
          glide();
        }),
      timeline,
    );

    await cdp.send("Page.stopScreencast");
    if (!frames.length) throw new Error("screencast produced no frames");
    // A still screen sends no frames, so the final hold has none: repeat the last frame at the stop time to keep it.
    frames.push({ file: frames.at(-1)!.file, t: Date.now() / 1000 }); // metadata.timestamp is epoch seconds too
    const t0 = frames[0].t;
    for (const f of frames) f.t -= t0;
    return { frames, seconds: frames.at(-1)!.t + 1 / 30 };
  } finally {
    await browser.close();
  }
}
