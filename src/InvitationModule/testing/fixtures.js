// Smallest valid invitation input. Returns a fresh object each call so tests can mutate it.
export function minimalInvitation() {
  return {
    templateId: "royal",
    theme: { palette: "maroon-gold" },
    couple: { bride: { name: { en: "Akriti" } }, groom: { name: { en: "Ankit" } } },
    mainDate: "2026-12-04",
    venue: { name: { en: "Riviera Resort" } },
  };
}
