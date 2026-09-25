interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <img
      src="/terra-logo.png"
      alt="Terra — solaire et durable"
      className={`block object-contain ${className}`}
    />
  );
}