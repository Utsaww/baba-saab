import { isDevanagari, textFor } from "../lib/i18n";

// Localised text. For "both", English comes first and Hindi follows on its own line.
export default function T({ v, lang, as: Tag = "span", className }) {
  if (lang === "both") {
    const en = v?.en?.trim();
    const hi = v?.hi?.trim();
    if (!en && !hi) return null;
    if (!en || !hi) {
      const only = en || hi;
      return (
        <Tag className={className} lang={isDevanagari(only) ? "hi" : undefined}>
          {only}
        </Tag>
      );
    }
    return (
      <Tag className={className}>
        {en}
        <span className="hiLine" lang="hi">
          {hi}
        </span>
      </Tag>
    );
  }
  const text = textFor(v, lang);
  if (!text) return null;
  return (
    <Tag className={className} lang={isDevanagari(text) ? "hi" : undefined}>
      {text}
    </Tag>
  );
}
