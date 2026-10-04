import { CreditCard } from "lucide-react";
import burkinaFlag from "@assets/323312_1791106022988.png";
import togoFlag from "@assets/323326_1791106023006.png";
import beninFlag from "@assets/323347_1791106023029.png";
import ivoryCoastFlag from "@assets/images_(26)_1791106023054.jpeg";
import waveLogo from "@assets/images_(7)_1791106023073.png";
import mtnLogo from "@assets/mtn-momo-icon-logo-png_seeklogo-659243_1791106023103.png";
import mixxLogo from "@assets/unnamed_1791106023124.png";
import moovLogo from "@assets/Moov_Money_Flooz_1791106023154.png";
import orangeMoneyLogo from "@assets/Orange-Money-logo_1791106023180.png";
import walletImage from "@assets/images_(27)_1791106022965.jpeg";
import receiptImage from "@assets/images_(29)_1791106022925.jpeg";
import supportImage from "@assets/images_(17)_1791106023230.jpeg";

const countryFlagImages: Record<string, string> = {
  BF: burkinaFlag,
  TG: togoFlag,
  BJ: beninFlag,
  CI: ivoryCoastFlag,
};

interface CountryFlagIconProps {
  code: string;
  className?: string;
}

export function CountryFlagIcon({ code, className = "" }: CountryFlagIconProps) {
  const image = countryFlagImages[code];

  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef3ed] ${className}`}
      aria-hidden="true"
      title={code}
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[8px] font-extrabold text-[#527268]">{code}</span>
      )}
    </span>
  );
}

const paymentMethodImages = [
  { test: (name: string) => name.includes("wave"), image: waveLogo },
  { test: (name: string) => name.includes("mtn") || name === "momo", image: mtnLogo },
  { test: (name: string) => name.includes("mixx") || name.includes("yas"), image: mixxLogo },
  { test: (name: string) => name.includes("moov"), image: moovLogo },
  { test: (name: string) => name.includes("orange"), image: orangeMoneyLogo },
];

interface PaymentMethodPngIconProps {
  method: string;
  className?: string;
}

export function PaymentMethodPngIcon({
  method,
  className = "",
}: PaymentMethodPngIconProps) {
  const normalized = method
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const image = paymentMethodImages.find(({ test }) => test(normalized))?.image;

  return (
    <span
      className={`inline-grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#dce9d9] bg-white p-1 ${className}`}
      aria-hidden="true"
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-contain" />
      ) : (
        <CreditCard className="h-4 w-4 text-[#668078]" />
      )}
    </span>
  );
}

const utilityImages = {
  wallet: walletImage,
  receipt: receiptImage,
  support: supportImage,
} as const;

export type BekoUtilityIconName = keyof typeof utilityImages;

interface BekoUtilityIconProps {
  name: BekoUtilityIconName;
  className?: string;
}

export function BekoUtilityIcon({ name, className = "" }: BekoUtilityIconProps) {
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#dce9d9] bg-white p-0.5 ${className}`}
      aria-hidden="true"
    >
      <img src={utilityImages[name]} alt="" className="h-full w-full object-contain" />
    </span>
  );
}