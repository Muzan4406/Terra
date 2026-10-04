import { useLocation, Link } from "wouter";
import homeNavIcon from "@assets/nav-home.png";
import proofsNavIcon from "@assets/2098276_1768062243190.png";
import investNavIcon from "@assets/4985809_1768062243229.png";
import teamNavIcon from "@assets/377005_1768062243282.png";
import accountNavIcon from "@assets/nav-account.png";

const navItems = [
  { path: "/", image: homeNavIcon, label: "Accueil" },
  { path: "/withdrawal-proofs", image: proofsNavIcon, label: "Preuves de retrait" },
  { path: "/invest", image: investNavIcon, label: "Investir" },
  { path: "/team", image: teamNavIcon, label: "Équipe" },
  { path: "/account", image: accountNavIcon, label: "Compte" },
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
              <img
                src={item.image}
                alt=""
                aria-hidden="true"
                className={`h-7 w-7 shrink-0 object-contain transition-opacity ${isActive ? "opacity-100" : "opacity-80"}`}
              />
              <span className={`max-w-[4.5rem] whitespace-normal text-center text-xs font-bold leading-tight ${isActive ? "text-primary" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
