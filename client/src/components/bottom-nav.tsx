import { useLocation, Link } from "wouter";
import { ClipboardList, Home, TrendingUp, User, Users } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Accueil" },
  { path: "/tasks", icon: ClipboardList, label: "Tâches" },
  { path: "/invest", icon: TrendingUp, label: "Investir" },
  { path: "/team", icon: Users, label: "Équipe" },
  { path: "/account", icon: User, label: "Compte" },
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
                <item.icon className={`w-6 h-6 ${isActive ? "opacity-100" : "opacity-70"}`} aria-hidden="true" />
                <span className={`text-xs font-bold ${isActive ? "text-primary" : ""}`}>{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
