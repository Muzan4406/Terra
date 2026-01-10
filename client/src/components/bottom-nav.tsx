import { Home, ClipboardList, ShoppingBag, Users, User } from "lucide-react";
import { useLocation, Link } from "wouter";

const navItems = [
  { path: "/", icon: Home, label: "Accueil" },
  { path: "/tasks", icon: ClipboardList, label: "Tâches" },
  { path: "/invest", icon: ShoppingBag, label: "Investir" },
  { path: "/team", icon: Users, label: "Équipe" },
  { path: "/account", icon: User, label: "Compte" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <button
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
