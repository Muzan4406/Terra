import { useLocation, Link } from "wouter";

import homeIcon from "@assets/images_(15)_1768062331204.png";
import tasksIcon from "@assets/2098276_1768062331254.png";
import investIcon from "@assets/4985809_1768062331285.png";
import teamIcon from "@assets/377005_1768062331316.png";
import accountIcon from "@assets/images_(16)_1768062331347.png";

const navItems = [
  { path: "/", icon: homeIcon, label: "Accueil" },
  { path: "/tasks", icon: tasksIcon, label: "Tâches" },
  { path: "/invest", icon: investIcon, label: "Investir" },
  { path: "/team", icon: teamIcon, label: "Équipe" },
  { path: "/account", icon: accountIcon, label: "Compte" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50 pb-6">
      <div className="flex justify-around items-center h-20 max-w-md mx-auto pt-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <button
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex flex-col items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <img 
                  src={item.icon} 
                  alt={item.label} 
                  className={`w-9 h-9 object-contain ${isActive ? "opacity-100" : "opacity-70"}`}
                />
                <span className={`text-xs font-bold ${isActive ? "text-primary" : ""}`}>{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
