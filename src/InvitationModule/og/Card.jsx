export function InvitationCard({ model }) {
  return (
    <div style={{ width: 1200, height: 630, display: "flex", position: "relative", background: model.colors.bg, fontFamily: model.fontFamily }}>
      {model.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={model.coverUrl} width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} alt="" />
      ) : null}
      <div
        style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 64,
          background: model.coverUrl ? "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0) 60%)" : "transparent",
        }}
      >
        <div style={{ fontSize: 76, color: model.coverUrl ? "#ffffff" : model.colors.text, lineHeight: 1.1 }}>{model.names}</div>
        <div style={{ marginTop: 20, fontSize: 36, color: model.coverUrl ? "#f5f5f4" : model.colors.accent }}>{model.date}</div>
      </div>
    </div>
  );
}

export function PreviewCard() {
  return (
    <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f5f0e6", fontFamily: "Display" }}>
      <div style={{ fontSize: 64, color: "#3f3f46" }}>Wedding invitation preview</div>
      <div style={{ marginTop: 24, fontSize: 32, color: "#78716c" }}>Baba Saab Events</div>
    </div>
  );
}
