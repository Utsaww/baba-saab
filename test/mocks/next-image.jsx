export default function Image({ src, alt, fill, priority, sizes, ...rest }) {
  // data-priority lets tests check which images are preloaded.
  return <img src={typeof src === "string" ? src : src?.src} alt={alt} data-priority={priority ? "true" : undefined} {...rest} />;
}
