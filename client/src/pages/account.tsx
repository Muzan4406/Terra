import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { getCountryDialCode } from "@/components/country-select";
import { BekoUtilityIcon, type BekoUtilityIconName } from "@/components/beko-icons";
import { useToast } from "@/hooks/use-toast";
import aboutIcon from "@assets/images_(33)_1791122614367.jpeg";
import productsIcon from "@assets/images_(12)_1791122614400.png";
import passwordIcon from "@assets/10772639_1791122614312.png";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeInfo,
  Check,
  ChevronRight,
  Copy,
  FileCheck2,
  Headphones,
  LockKeyhole,
  LogOut,
  Package,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import "./beko-pages.css";

const formatMoney = (amount: number) =>
  Number(amount || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export default function AccountPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  const copyReferralCode = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      toast({
        title: "Code copié",
        description: "Votre code de parrainage est prêt à être partagé.",
      });
    } catch {
      toast({
        title: "Copie impossible",
        description: "Autorisez l’accès au presse-papiers puis réessayez.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      toast({
        title: "Déconnexion impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
      setLoggingOut(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="beko-page">
        <div className="beko-shell space-y-4 p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-3xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      icon: WalletCards,
      image: "wallet" as BekoUtilityIconName,
      title: "Lier / gérer un portefeuille de retrait",
      detail: "Mettre à jour vos moyens de réception",
      action: () => navigate("/wallets"),
    },
    {
      icon: Package,
      customImage: productsIcon,
      title: "Mes produits",
      detail: "Consulter vos produits actifs",
      action: () => navigate("/my-products"),
    },
    {
      icon: BadgeInfo,
      customImage: aboutIcon,
      title: "À propos de Beko",
      detail: "En savoir plus sur nos services",
      action: () => navigate("/about"),
    },
    {
      icon: FileCheck2,
      image: "receipt" as BekoUtilityIconName,
      title: "Preuves de retrait",
      detail: "Consulter les justificatifs",
      action: () => navigate("/withdrawal-proofs"),
    },
    {
      icon: Headphones,
      image: "support" as BekoUtilityIconName,
      title: "Service client",
      detail: "Chaîne et assistance sur Telegram",
      action: () => navigate("/customer-service"),
    },
    {
      icon: LockKeyhole,
      customImage: passwordIcon,
      title: "Modifier le mot de passe",
      detail: "Sécuriser l’accès à votre compte",
      action: () => navigate("/change-password"),
    },
  ];

  return (
    <div className="beko-page">
      <div className="beko-shell">
        <header className="beko-topbar">
          <span className="beko-brand">BEKO</span>
          <h1>Mon compte</h1>
          <span className="beko-icon-button" aria-hidden="true"><WalletCards size={17} /></span>
        </header>

        <main className="beko-content">
          <section className="beko-hero beko-fade-in">
            <p className="beko-eyebrow">Votre espace personnel</p>
            <h2>Heureux de vous revoir.</h2>
            <p>{getCountryDialCode(user.country)} {user.phone}</p>
            <div className="beko-profile-id">
              <span>Code · {user.referralCode}</span>
              <button type="button" onClick={() => void copyReferralCode()} aria-label="Copier le code de parrainage" data-testid="button-copy-id">
                <Copy size={14} />
              </button>
            </div>
          </section>

          <section className="beko-balance-card" aria-label="Soldes du compte">
            <div className="beko-balance-top">
              <div>
                <p>Vos soldes disponibles</p>
                <strong>Compte Beko</strong>
              </div>
              <span className="beko-balance-mark"><WalletCards size={21} /></span>
            </div>
            <div className="beko-balance-grid">
              <div className="beko-balance-cell" data-testid="text-balance">
                <span>Solde dépôt</span>
                <strong>{formatMoney(user.depositBalance)} FCFA</strong>
              </div>
              <div className="beko-balance-cell" data-testid="text-withdrawal-balance">
                <span>Solde retrait</span>
                <strong>{formatMoney(user.withdrawalBalance)} FCFA</strong>
              </div>
            </div>
          </section>

          <section className="beko-shortcuts" aria-label="Actions rapides">
            <button type="button" className="beko-shortcut beko-shortcut--action" onClick={() => navigate("/deposit")} data-testid="button-deposit">
              <span className="beko-shortcut-icon"><ArrowDownToLine size={21} /></span>
              <span className="beko-shortcut-copy"><strong>Déposer</strong><small>Ajouter des fonds</small></span>
              <ChevronRight className="beko-shortcut-arrow" size={20} />
            </button>
            <button type="button" className="beko-shortcut beko-shortcut--action" onClick={() => navigate("/withdraw")} data-testid="button-withdraw">
              <span className="beko-shortcut-icon"><ArrowUpFromLine size={21} /></span>
              <span className="beko-shortcut-copy"><strong>Retirer</strong><small>Demander un retrait</small></span>
              <ChevronRight className="beko-shortcut-arrow" size={20} />
            </button>
            <button type="button" className="beko-shortcut beko-shortcut--wide" onClick={() => navigate("/history")} data-testid="button-invoice">
              <BekoUtilityIcon name="receipt" className="h-[2.85rem] w-[2.85rem] rounded-[.95rem]" />
              <span className="beko-shortcut-copy"><strong>Historique</strong><small>Voir mes opérations</small></span>
              <ChevronRight className="beko-shortcut-arrow" size={20} />
            </button>
          </section>

          <section className="beko-panel overflow-hidden p-2" aria-label="Actions du compte">
            {menuItems.map((item, index) => (
              <button
                type="button"
                key={item.title}
                onClick={item.action}
                className={`beko-action border-0 bg-transparent shadow-none ${index ? "border-t border-[#e3eee0]" : ""}`}
                data-testid={`menu-${item.title === "Lier / gérer un portefeuille de retrait" ? "wallets" : item.title === "Service client" ? "support" : item.title === "Mes produits" ? "products" : item.title === "À propos de Beko" ? "about" : item.title === "Preuves de retrait" ? "withdrawal-proofs" : item.title === "Utiliser un code bonus" ? "exchange" : "password"}`}
              >
                {item.customImage ? (
                  <img
                    src={item.customImage}
                    alt=""
                    aria-hidden="true"
                    className="h-[2.45rem] w-[2.45rem] shrink-0 rounded-[.85rem] bg-white object-contain"
                  />
                ) : item.image ? (
                  <BekoUtilityIcon name={item.image} className="h-[2.45rem] w-[2.45rem] rounded-[.85rem]" />
                ) : (
                  <span className="beko-action-icon"><item.icon size={19} /></span>
                )}
                <span className="beko-action-copy">
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <ChevronRight className="beko-arrow" size={18} />
              </button>
            ))}
          </section>

          {user.isAdmin && (
            <button type="button" className="beko-action" onClick={() => navigate("/admin")} data-testid="button-admin">
              <span className="beko-action-icon"><ShieldCheck size={19} /></span>
              <span className="beko-action-copy"><strong>Administration</strong><small>Accéder au panneau de gestion</small></span>
              <ChevronRight className="beko-arrow" size={18} />
            </button>
          )}

          <button
            type="button"
            className="beko-action justify-center border-[#eed6cd] bg-[#fff7f2] text-[#9c493a]"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            data-testid="button-logout"
          >
            {loggingOut ? <Check size={18} /> : <LogOut size={18} />}
            <span className="font-bold">{loggingOut ? "Déconnexion…" : "Déconnexion"}</span>
          </button>
        </main>
      </div>
    </div>
  );
}