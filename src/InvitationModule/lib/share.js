// Personal guest codes and preview tokens must never travel with a forwarded link.
export function shareableUrl(href) {
  const url = new URL(href);
  url.searchParams.delete("g");
  url.searchParams.delete("preview");
  url.hash = "";
  return url.toString();
}

export function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
