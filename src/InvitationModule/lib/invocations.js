export const INVOCATIONS = [
  {
    id: "vakratunda",
    name: "Ganesh Vandana",
    text: "वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।\nनिर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥",
  },
  { id: "shri-ganeshaya", name: "Shri Ganeshaya Namah", text: "॥ श्री गणेशाय नमः ॥" },
  {
    id: "mangalam",
    name: "Mangal Shloka",
    text: "मङ्गलम् भगवान विष्णुः मङ्गलम् गरुड़ध्वजः।\nमङ्गलम् पुण्डरीकाक्षः मङ्गलाय तनो हरिः॥",
  },
  { id: "shubh-vivah", name: "Shubh Vivah", text: "॥ शुभ विवाह ॥" },
  { id: "om", name: "Om", text: "॥ ॐ ॥" },
];

export function invocationText(invocation) {
  const preset = INVOCATIONS.find((i) => i.id === invocation?.presetId);
  return preset ? { hi: preset.text } : invocation?.text ?? {};
}
