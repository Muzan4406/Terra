import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountryFlagIcon } from "@/components/beko-icons";
import { ELIGIBLE_COUNTRIES } from "@shared/schema";

export { CountryFlagIcon };

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
      <SelectContent className="country-select-content">
        {ELIGIBLE_COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.code} data-testid={`country-${country.code}`}>
            <span className="flex items-center gap-2">
              <CountryFlagIcon code={country.code} />
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
  const country = ELIGIBLE_COUNTRIES.find((c) => c.code === code);
  return country?.flag ?? code;
}

export function getCountryDialCode(code: string): string {
  const country = ELIGIBLE_COUNTRIES.find((c) => c.code === code);
  return country ? `+${country.dialCode}` : "";
}
