import { makeSample } from "../sample-base";

const base = makeSample({
  templateId: "velvet",
  palette: "plum-gold",
  language: "both",
  bride: { en: "Meera", hi: "मीरा" },
  groom: { en: "Arjun", hi: "अर्जुन" },
});

// A fictional lakeside wedding in Udaipur, with the four functions most families hold.
export const velvetSample = {
  ...base,
  mainDate: "2027-11-21",
  venue: {
    name: { en: "Rajbagh Lake Palace", hi: "राजबाग़ लेक पैलेस" },
    address: { en: "Lake Pichola Road, Udaipur, Rajasthan", hi: "लेक पिछोला रोड, उदयपुर, राजस्थान" },
    mapsUrl: "https://maps.google.com/?q=Lake+Pichola+Udaipur",
    travelNotes: {
      en: "Maharana Pratap Airport is 22 km away.\nUdaipur City railway station is 4 km away.\nNovember evenings by the lake are cool — carry a light shawl.",
      hi: "महाराणा प्रताप हवाई अड्डा 22 किमी दूर है।\nउदयपुर सिटी रेलवे स्टेशन 4 किमी दूर है।\nनवंबर में झील किनारे की शामें ठंडी होती हैं — हल्की शॉल साथ रखें।",
    },
  },
  events: [
    {
      id: "mehendi",
      name: { en: "Mehendi", hi: "मेहंदी" },
      date: "2027-11-19",
      time: "15:00",
      venueName: { en: "The Garden Courtyard", hi: "गार्डन कोर्टयार्ड" },
      dressCode: { en: "Greens and pastels", hi: "हरा और हल्के रंग" },
    },
    {
      id: "haldi",
      name: { en: "Haldi", hi: "हल्दी" },
      date: "2027-11-20",
      time: "10:30",
      venueName: { en: "The Lakeside Lawn", hi: "लेकसाइड लॉन" },
      dressCode: { en: "Shades of yellow", hi: "पीले रंग" },
    },
    {
      id: "sangeet",
      name: { en: "Sangeet", hi: "संगीत" },
      date: "2027-11-20",
      time: "19:30",
      venueName: { en: "The Durbar Hall", hi: "दरबार हॉल" },
      description: { en: "An evening of music, dance and family performances", hi: "संगीत, नृत्य और पारिवारिक प्रस्तुतियों की एक शाम" },
      dressCode: { en: "Indo-western glamour", hi: "इंडो-वेस्टर्न" },
    },
    {
      id: "wedding",
      name: { en: "Wedding", hi: "विवाह" },
      date: "2027-11-21",
      time: "18:00",
      description: { en: "Pheras under the stars, followed by dinner", hi: "तारों की छाँव में फेरे, उसके बाद रात्रिभोज" },
      dressCode: { en: "Traditional", hi: "पारंपरिक" },
    },
  ],
  rsvp: { ...base.rsvp, deadline: "2027-10-31" },
};
