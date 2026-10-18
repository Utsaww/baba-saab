import { makeSample } from "../sample-base";

const base = makeSample({
  templateId: "temple",
  palette: "kumkum",
  language: "both",
  bride: { en: "Meera", hi: "मीरा" },
  groom: { en: "Arjun", hi: "अर्जुन" },
});

// A fictional temple-town wedding in Varanasi: parents named in full, every function with a dress
// code, and the shared sample's story photos for the "Forever us" gallery.
export const templeSample = {
  ...base,
  couple: {
    bride: {
      ...base.couple.bride,
      parentsLine: { en: "Daughter of Smt. Sunita & Shri Rajesh Sharma", hi: "सुपुत्री श्रीमती सुनीता एवं श्री राजेश शर्मा" },
    },
    groom: {
      ...base.couple.groom,
      parentsLine: { en: "Son of Smt. Kavita & Shri Anil Mehra", hi: "सुपुत्र श्रीमती कविता एवं श्री अनिल मेहरा" },
    },
  },
  mainDate: "2027-11-27",
  venue: {
    name: { en: "Ganga Mahal Ghat", hi: "गंगा महल घाट" },
    address: { en: "Assi Ghat Road, Varanasi, Uttar Pradesh", hi: "अस्सी घाट रोड, वाराणसी, उत्तर प्रदेश" },
    mapsUrl: "https://maps.google.com/?q=Assi+Ghat+Varanasi",
    travelNotes: {
      en: "Lal Bahadur Shastri Airport is 26 km away.\nVaranasi Junction railway station is 7 km away.\nNovember evenings by the river are cool — carry a light shawl.",
      hi: "लाल बहादुर शास्त्री हवाई अड्डा 26 किमी दूर है।\nवाराणसी जंक्शन रेलवे स्टेशन 7 किमी दूर है।\nनवंबर में नदी किनारे की शामें ठंडी होती हैं — हल्की शॉल साथ रखें।",
    },
  },
  events: [
    {
      id: "haldi",
      name: { en: "Haldi", hi: "हल्दी" },
      date: "2027-11-25",
      time: "10:30",
      venueName: { en: "The Courtyard", hi: "आँगन" },
      dressCode: { en: "Shades of yellow", hi: "पीले रंग" },
    },
    {
      id: "mehendi",
      name: { en: "Mehendi", hi: "मेहंदी" },
      date: "2027-11-25",
      time: "16:00",
      venueName: { en: "The Garden Terrace", hi: "गार्डन टैरेस" },
      dressCode: { en: "Greens and pastels", hi: "हरा और हल्के रंग" },
    },
    {
      id: "sangeet",
      name: { en: "Sangeet", hi: "संगीत" },
      date: "2027-11-26",
      time: "19:30",
      venueName: { en: "The Durbar Hall", hi: "दरबार हॉल" },
      description: { en: "An evening of music, dance and family performances", hi: "संगीत, नृत्य और पारिवारिक प्रस्तुतियों की एक शाम" },
      dressCode: { en: "Indo-western glamour", hi: "इंडो-वेस्टर्न" },
    },
    {
      id: "vivah",
      name: { en: "Vivah", hi: "विवाह" },
      date: "2027-11-27",
      time: "19:00",
      description: { en: "Pheras by the Ganga, followed by dinner", hi: "गंगा तट पर फेरे, उसके बाद रात्रिभोज" },
      dressCode: { en: "Traditional", hi: "पारंपरिक" },
    },
    {
      id: "reception",
      name: { en: "Reception", hi: "स्वागत समारोह" },
      date: "2027-11-28",
      time: "20:00",
      dressCode: { en: "Evening formal", hi: "शाम की औपचारिक पोशाक" },
    },
  ],
  rsvp: { ...base.rsvp, deadline: "2027-11-05" },
};
