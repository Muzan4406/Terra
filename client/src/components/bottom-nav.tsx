import { useLocation, Link } from "wouter";
import { ClipboardCheck, Home, TrendingUp, UsersRound, User } from "lucide-react";
import walletImage from "@assets/images_(27)_1791106022965.jpeg";
import receiptImage from "@assets/images_(29)_1791106022925.jpeg";
import bankImage from "@assets/pngtree-bank-money-finance-icon-symbolizing-secure-transaction_1791106023203.png";

const navItems = [
  { path: "/", icon: Home, image: null, label: "Accueil" },
  { path: "/withdrawal-proofs", icon: ClipboardCheck, image: receiptImage, label: "Preuves de retrait" },
  { path: "/invest", icon: TrendingUp, image: bankImage, label: "Investir" },
  { path: "/team", icon: UsersRound, image: null, label: "Équipe" },
  { path: "/account", icon: User, image: walletImage, label: "Compte" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav aria-label="Navigation principale" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 pb-6 shadow-[0_-6px_24px_rgba(26,43,66,0.08)] backdrop-blur-xl">
      <div className="flex justify-around items-center h-20 max-w-md mx-auto pt-2">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path === "/team" && location.startsWith("/team/"));
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition-all ${
                isActive
                  ? "bg-accent/70 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  aria-hidden="true"
                  className={`h-7 w-7 shrink-0 object-contain transition-opacity ${isActive ? "opacity-100" : "opacity-80"}`}
                />
              ) : (
                <item.icon
                  className={`h-6 w-6 ${isActive ? "opacity-100" : "opacity-70"} ${isActive && item.path === "/" ? "fill-primary" : ""}`}
                  aria-hidden="true"
                />
              )}
              <span className={`max-w-[4.5rem] whitespace-normal text-center text-xs font-bold leading-tight ${isActive ? "text-primary" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
