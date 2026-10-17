export const SLUG_MIN = 3;
export const SLUG_MAX = 60;
export const RESERVED_SLUGS = ["new", "preview", "admin", "api"];
const SUFFIX_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** Random characters from an alphabet without look-alikes (no 0/o, 1/l). Works in the browser and Node. */
export function randomSuffix(n, randomBytes = (len) => crypto.getRandomValues(new Uint8Array(len))) {
  return Array.from(randomBytes(n), (b) => SUFFIX_ALPHABET[b % SUFFIX_ALPHABET.length]).join("");
}

export function slugify(text) {
  return String(text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "<bride>-weds-<groom>-<4char>" (groom first when the invitation says so) from the English names, or "invitation-<6char>" when one is missing. */
export function generateSlug(content, random = randomSuffix) {
  let bride = slugify(content?.couple?.bride?.name?.en);
  let groom = slugify(content?.couple?.groom?.name?.en);
  if (content?.couple?.order === "groom-first") [bride, groom] = [groom, bride];
  if (!bride || !groom) return `invitation-${random(6)}`;
  const suffix = `-${random(4)}`;
  const middle = "-weds-";
  // Trim each name evenly so the whole slug fits.
  const room = SLUG_MAX - suffix.length - middle.length;
  const half = Math.floor(room / 2);
  const trim = (s, n) => s.slice(0, n).replace(/-+$/, "");
  return `${trim(bride, half)}${middle}${trim(groom, room - half)}${suffix}`;
}

/** null when the slug is acceptable, otherwise a sentence for staff. */
export function validateSlug(slug) {
  if (typeof slug !== "string" || slug.length < SLUG_MIN || slug.length > SLUG_MAX) return "Use 3 to 60 characters.";
  if (!/^[a-z0-9-]+$/.test(slug)) return "Use only lowercase letters, numbers and dashes.";
  if (slug.startsWith("-") || slug.endsWith("-") || slug.includes("--")) {
    return "Don't start or end with a dash, or use two dashes together.";
  }
  if (RESERVED_SLUGS.includes(slug)) return "That link name is reserved — choose another.";
  return null;
}
