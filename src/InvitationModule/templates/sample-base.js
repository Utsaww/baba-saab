const GALLERY = [
  "https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1530023367847-a683933f4172?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1631857455684-a54a2f03665f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1623788452350-4c8596ff40bb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1595407753234-0882f1e77954?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
];

// Sample invitation shown in the template gallery. Every section has content so staff see the full design.
export function makeSample({ templateId, palette, language, bride, groom }) {
  return {
    templateId,
    theme: { palette },
    status: "draft",
    language,
    couple: {
      bride: { name: bride, parentsLine: { en: "D/o Smt. Sunita & Shri Rajesh Sharma", hi: "सुपुत्री श्रीमती सुनीता एवं श्री राजेश शर्मा" } },
      groom: { name: groom, parentsLine: { en: "S/o Smt. Kavita & Shri Anil Mehra", hi: "सुपुत्र श्रीमती कविता एवं श्री अनिल मेहरा" } },
    },
    hosts: {
      closingLine: {
        en: "With love and blessings from the Sharma and Mehra families",
        hi: "शर्मा एवं मेहरा परिवार की ओर से सप्रेम",
      },
      families: [
        { en: "Smt. Sunita & Shri Rajesh Sharma", hi: "श्रीमती सुनीता एवं श्री राजेश शर्मा" },
        { en: "Smt. Kavita & Shri Anil Mehra", hi: "श्रीमती कविता एवं श्री अनिल मेहरा" },
      ],
      contactPhone: "+91 98765 43210",
    },
    invocation: { deity: "ganesh", presetId: "vakratunda" },
    mainDate: "2027-02-14",
    venue: {
      name: { en: "Sheesh Mahal Gardens", hi: "शीश महल गार्डन्स" },
      address: { en: "Amer Road, Jaipur, Rajasthan", hi: "आमेर रोड, जयपुर, राजस्थान" },
      mapsUrl: "https://maps.google.com/?q=Amer+Road+Jaipur",
      travelNotes: {
        en: "Jaipur International Airport is 25 km away.\nJaipur Junction railway station is 12 km away.\nFebruary evenings are cool — carry a light shawl.",
        hi: "जयपुर अंतरराष्ट्रीय हवाई अड्डा 25 किमी दूर है।\nजयपुर जंक्शन रेलवे स्टेशन 12 किमी दूर है।\nफ़रवरी की शामें ठंडी होती हैं — हल्की शॉल साथ रखें।",
      },
    },
    events: [
      { id: "haldi", name: { en: "Haldi", hi: "हल्दी" }, date: "2027-02-12", time: "10:00", dressCode: { en: "Shades of yellow", hi: "पीले रंग" } },
      { id: "mehendi", name: { en: "Mehendi", hi: "मेहंदी" }, date: "2027-02-12", time: "16:00", dressCode: { en: "Green and pastels", hi: "हरा और हल्के रंग" } },
      { id: "sangeet", name: { en: "Sangeet", hi: "संगीत" }, date: "2027-02-13", time: "19:30", description: { en: "An evening of music and dance", hi: "संगीत और नृत्य की एक शाम" } },
      { id: "vivah", name: { en: "Vivah", hi: "विवाह" }, date: "2027-02-14", time: "19:00", dressCode: { en: "Traditional", hi: "पारंपरिक" } },
      { id: "reception", name: { en: "Reception", hi: "स्वागत समारोह" }, date: "2027-02-15", time: "20:00" },
    ],
    media: {
      coverKey: GALLERY[2],
      gallery: GALLERY.map((key, i) => ({ key, caption: i === 0 ? { en: "Where it began", hi: "जहाँ से शुरुआत हुई" } : undefined })),
    },
    rsvp: { enabled: true, deadline: "2027-01-31", askGuestCount: true, askMeal: true },
    showCredit: true,
  };
}
