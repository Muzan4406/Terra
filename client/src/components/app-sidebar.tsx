import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Clock3,
  Home,
  Menu,
  TrendingUp,
  User,
  UsersRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const menuItems = [
  { path: "/", label: "Accueil", icon: Home },
  { path: "/deposit", label: "Dépôt", icon: ArrowDownToLine },
  { path: "/withdraw", label: "Retrait", icon: ArrowUpFromLine },
  { path: "/invest", label: "Investir", icon: TrendingUp },
  { path: "/withdrawal-proofs", label: "Preuves de retrait", icon: ClipboardCheck },
  { path: "/team", label: "Équipe", icon: UsersRound },
  { path: "/history", label: "Historique", icon: Clock3 },
  { path: "/account", label: "Compte", icon: User },
];

export function AppSidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Ouvrir le menu de navigation"
          data-testid="button-open-sidebar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dce8db] bg-white text-[#14553f] shadow-sm transition-colors hover:bg-[#f0f7ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65a878]"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[85vw] max-w-xs border-r border-[#dce8db] bg-[#f8faf6] p-0 text-[#163d2f]"
      >
        <div className="border-b border-[#e1eadf] px-5 pb-5 pt-7 pr-12">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-12 w-12 rounded-lg object-contain" alt="" />
            <div>
              <SheetTitle className="text-left text-lg font-bold text-[#14553f]">Beko</SheetTitle>
              <SheetDescription className="mt-1 text-left text-xs text-[#687a70]">
                Navigation principale
              </SheetDescription>
            </div>
          </div>
        </div>
        <nav aria-label="Menu latéral" className="grid gap-1 p-3">
          {menuItems.map(({ path, label, icon: Icon }) => {
            const isActive =
              location === path || (path === "/team" && location.startsWith("/team/"));

            return (
              <Link
                key={path}
                href={path}
                aria-current={isActive ? "page" : undefined}
                data-testid={`sidebar-link-${path === "/" ? "home" : path.slice(1).replaceAll("/", "-")}`}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-[#e6f2e3] text-[#14553f]"
                    : "text-[#4d665b] hover:bg-white hover:text-[#14553f]"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}