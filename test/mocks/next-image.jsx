export default function Image({ src, alt, fill, priority, sizes, ...rest }) {
  return <img src={typeof src === "string" ? src : src?.src} alt={alt} {...rest} />;
}
