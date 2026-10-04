import { useLocation, Link } from "wouter";
import { FileCheck2, Home, TrendingUp, UsersRound, User } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Accueil" },
  { path: "/withdrawal-proofs", icon: FileCheck2, label: "Preuves de retrait" },
  { path: "/invest", icon: TrendingUp, label: "Investir" },
  { path: "/team", icon: UsersRound, label: "Équipe" },
  { path: "/account", icon: User, label: "Compte" },
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
              <item.icon className={`w-6 h-6 ${isActive ? "opacity-100" : "opacity-70"}`} aria-hidden="true" />
              <span className={`max-w-[4.5rem] whitespace-normal text-center text-xs font-bold leading-tight ${isActive ? "text-primary" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
