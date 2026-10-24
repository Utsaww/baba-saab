const ERROR = { ok: false, reason: "error" };

// Posts a live reply to the RSVP route. Never throws and never hangs: a network failure, a timeout or an
// unreadable answer all come back as { ok: false, reason: "error" }.
export async function postRsvp(slug, reply, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, reply }),
      signal: controller.signal,
    });
    const body = await res.json();
    return body && typeof body === "object" && typeof body.ok === "boolean" ? body : ERROR;
  } catch {
    return ERROR;
  } finally {
    clearTimeout(timer);
  }
}
