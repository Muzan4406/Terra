import type { LucideIcon } from "lucide-react";

interface AuthFieldIconProps {
  icon: LucideIcon;
}

export function AuthFieldIcon({ icon: Icon }: AuthFieldIconProps) {
  return (
    <span
      aria-hidden="true"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#dce8db] bg-white text-[#14553f] shadow-sm"
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}