export const PHONE = { width: 390, height: 844 };
const BEZEL = 6;

// Renders a page inside a scaled phone-sized iframe so previews match a real handset.
export default function PhoneFrame({ src, title, scale = 0.6, iframeRef, lazy = true }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-[28px] bg-stone-900 shadow-lg"
      style={{ width: PHONE.width * scale + BEZEL * 2, height: PHONE.height * scale + BEZEL * 2, padding: BEZEL }}
    >
      <div className="overflow-hidden rounded-[22px]" style={{ width: PHONE.width * scale, height: PHONE.height * scale }}>
        <iframe
          src={src}
          title={title}
          ref={iframeRef}
          loading={lazy ? "lazy" : undefined}
          className="origin-top-left bg-white"
          style={{ width: PHONE.width, height: PHONE.height, transform: `scale(${scale})`, border: 0 }}
        />
      </div>
    </div>
  );
}
