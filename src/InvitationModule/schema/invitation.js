import { z } from "zod";

export const TEMPLATE_IDS = ["royal", "floral", "temple", "minimal"];
export const LANGUAGES = ["en", "hi", "both"];
export const STATUSES = ["draft", "published", "archived", "deleted"];
// The cover always renders first and cannot be hidden, so it is not a section id.
export const SECTION_IDS = [
  "invocation",
  "couple",
  "saveTheDate",
  "countdown",
  "venue",
  "travel",
  "schedule",
  "gallery",
  "film",
  "rsvp",
  "closing",
];

const localised = z
  .object({ en: z.string().trim().optional(), hi: z.string().trim().optional() })
  .default({});
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const time24 = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24-hour)");
const url = z.string().url();

const person = z.object({
  name: localised,
  parentsLine: localised,
  photoKey: z.string().optional(),
});

const event = z.object({
  id: z.string().min(1),
  name: localised,
  date: isoDate,
  time: time24.optional(),
  venueName: localised.optional(),
  address: localised.optional(),
  mapsUrl: url.optional(),
  dressCode: localised.optional(),
  description: localised.optional(),
});

export const invitationSchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  templateId: z.enum(TEMPLATE_IDS),
  theme: z.object({
    palette: z.string().min(1),
    sectionOrder: z.array(z.enum(SECTION_IDS)).default(SECTION_IDS),
    hidden: z.array(z.enum(SECTION_IDS)).default([]),
  }),
  status: z.enum(STATUSES).default("draft"),
  language: z.enum(LANGUAGES).default("en"),
  couple: z.object({ bride: person, groom: person }),
  hosts: z
    .object({
      closingLine: localised,
      families: z.array(localised).default([]),
      contactPhone: z.string().optional(),
    })
    .default({}),
  invocation: z
    .object({
      deity: z.enum(["ganesh", "om", "none"]).default("ganesh"),
      presetId: z.string().optional(),
      text: localised,
    })
    .default({}),
  mainDate: isoDate,
  venue: z.object({
    name: localised,
    address: localised,
    mapsUrl: url.optional(),
    travelNotes: localised.optional(),
  }),
  events: z.array(event).default([]),
  media: z
    .object({
      coverKey: z.string().optional(),
      gallery: z.array(z.object({ key: z.string().min(1), caption: localised.optional() })).default([]),
      music: z
        .object({ type: z.enum(["library", "upload"]), trackId: z.string().optional(), key: z.string().min(1) })
        .optional(),
      film: z
        .object({ type: z.enum(["youtube", "upload"]), url: url.optional(), key: z.string().optional() })
        .optional(),
    })
    .default({}),
  rsvp: z
    .object({
      enabled: z.boolean().default(false),
      deadline: isoDate.optional(),
      askGuestCount: z.boolean().default(true),
      askMeal: z.boolean().default(false),
    })
    .default({}),
  showCredit: z.boolean().default(true),
});

export function parseInvitation(data) {
  return invitationSchema.parse(data);
}
