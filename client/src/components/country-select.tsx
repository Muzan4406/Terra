import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ELIGIBLE_COUNTRIES } from "@shared/schema";

const FLAG_EMOJIS: Record<string, string> = {
  CM: "🇨🇲",
  BF: "🇧🇫", 
  TG: "🇹🇬",
  BJ: "🇧🇯",
  CI: "🇨🇮",
};

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function CountrySelect({ value, onValueChange, disabled }: CountrySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger data-testid="select-country" className="w-full">
        <SelectValue placeholder="Sélectionner un pays" />
      </SelectTrigger>
      <SelectContent>
        {ELIGIBLE_COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.code} data-testid={`country-${country.code}`}>
            <span className="flex items-center gap-2">
              <span>{FLAG_EMOJIS[country.code]}</span>
              <span>{country.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function getCountryName(code: string): string {
  const country = ELIGIBLE_COUNTRIES.find((c) => c.code === code);
  return country ? country.name : code;
}

export function getCountryFlag(code: string): string {
  return FLAG_EMOJIS[code] || "";
}

export function getCountryDialCode(code: string): string {
  const country = ELIGIBLE_COUNTRIES.find((c) => c.code === code);
  return country ? `+${country.dialCode}` : "";
}
