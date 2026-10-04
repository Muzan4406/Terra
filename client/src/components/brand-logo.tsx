export function BrandLogo({
  className,
  alt = "Beko — Appareils électroménagers",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src="/beko-logo.png"
      alt={alt}
      className={className ?? "h-24 w-24 object-contain"}
      draggable={false}
    />
  );
}