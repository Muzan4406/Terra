import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentMethodPngIcon } from "@/components/beko-icons";
import { PAYMENT_METHODS_BY_COUNTRY } from "@shared/schema";

interface PaymentMethodSelectProps {
  country: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  options?: string[];
}

export function PaymentMethodSelect({
  country,
  value,
  onValueChange,
  disabled,
  options,
}: PaymentMethodSelectProps) {
  const methods = options ?? PAYMENT_METHODS_BY_COUNTRY[country] ?? [];

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || methods.length === 0}>
      <SelectTrigger data-testid="select-payment-method" className="w-full">
        <SelectValue placeholder="Moyen de paiement" />
      </SelectTrigger>
      <SelectContent className="operator-select-content">
        {methods.map((method) => (
          <SelectItem key={method} value={method} data-testid={`payment-${method}`}>
            <span className="flex items-center gap-2">
              <PaymentMethodPngIcon method={method} className="h-7 w-7 rounded-lg p-0.5" />
              <span>{method}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
