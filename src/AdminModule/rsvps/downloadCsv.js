export const csvFileName = ({ slug, id }) => `${slug || id}-rsvps.csv`;

/** Saves the CSV text as a file. `toCsv` already starts with the BOM, so none is added here. */
export function downloadCsv(text, fileName) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
