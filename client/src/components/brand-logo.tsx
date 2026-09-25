interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <img
      src="/terra-oil-logo.png"
      alt="Terra oil"
      className={`block object-contain ${className}`}
    />
  );
}