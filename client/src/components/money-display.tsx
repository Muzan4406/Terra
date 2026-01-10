interface MoneyDisplayProps {
  amount: number;
  className?: string;
  showCurrency?: boolean;
}

export function MoneyDisplay({ amount, className = "", showCurrency = true }: MoneyDisplayProps) {
  const formatted = new Intl.NumberFormat("fr-FR").format(amount);
  return (
    <span className={className}>
      {formatted}{showCurrency ? " FCFA" : ""}
    </span>
  );
}

export function formatMoney(amount: number, showCurrency = true): string {
  const formatted = new Intl.NumberFormat("fr-FR").format(amount);
  return showCurrency ? `${formatted} FCFA` : formatted;
}
