import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import HomePage from "@/pages/home";
import TasksPage from "@/pages/tasks";
import InvestPage from "@/pages/invest";
import AccountPage from "@/pages/account";
import DepositPage from "@/pages/deposit";
import WithdrawPage from "@/pages/withdraw";
import WalletsPage from "@/pages/wallets";
import HistoryPage from "@/pages/history";
import AboutPage from "@/pages/about";
import RulesPage from "@/pages/rules";
import CustomerServicePage from "@/pages/customer-service";
import CustomerServiceChatPage from "@/pages/customer-service-chat";
import ChangePasswordPage from "@/pages/change-password";
import ExchangeCodePage from "@/pages/exchange-code";
import MyProductsPage from "@/pages/my-products";
import WithdrawalProofsPage from "@/pages/withdrawal-proofs";
import AdminDashboard from "@/pages/admin/index";
import AdminDepositsPage from "@/pages/admin/deposits";
import AdminWithdrawalsPage from "@/pages/admin/withdrawals";
import AdminWithdrawalProofsPage from "@/pages/admin/withdrawal-proofs";
import AdminUsersPage from "@/pages/admin/users";
import AdminChannelsPage from "@/pages/admin/channels";
import AdminProductsPage from "@/pages/admin/products";
import AdminSettingsPage from "@/pages/admin/settings";
import AdminBonusCodesPage from "@/pages/admin/bonus-codes";
import AdminUserTeamPage from "@/pages/admin/user-team";
import AdminSupportPage from "@/pages/admin/support";
import { Loader2 } from "lucide-react";

function AuthUnavailable({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-sm space-y-4 text-center">
        <p role="alert" className="text-sm text-muted-foreground">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, authError, refetchUser } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authError && !user) {
    return (
      <AuthUnavailable
        message={authError}
        onRetry={() => void refetchUser()}
      />
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.isBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Compte suspendu</h1>
          <p className="text-muted-foreground">Votre compte a été suspendu. Contactez le support.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, authError, refetchUser } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authError && !user) {
    return (
      <AuthUnavailable
        message={authError}
        onRetry={() => void refetchUser()}
      />
    );
  }

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <AuthRoute>
          <LoginPage />
        </AuthRoute>
      </Route>
      <Route path="/register">
        <AuthRoute>
          <RegisterPage />
        </AuthRoute>
      </Route>

      <Route path="/">
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      </Route>
      <Route path="/tasks">
        <ProtectedRoute>
          <TasksPage />
        </ProtectedRoute>
      </Route>
      <Route path="/invest">
        <ProtectedRoute>
          <InvestPage />
        </ProtectedRoute>
      </Route>
      <Route path="/team">
        <ProtectedRoute>
          <Redirect to="/withdrawal-proofs" />
        </ProtectedRoute>
      </Route>
      <Route path="/team/level/:level">
        <ProtectedRoute>
          <Redirect to="/withdrawal-proofs" />
        </ProtectedRoute>
      </Route>
      <Route path="/account">
        <ProtectedRoute>
          <AccountPage />
        </ProtectedRoute>
      </Route>
      <Route path="/deposit">
        <ProtectedRoute>
          <DepositPage />
        </ProtectedRoute>
      </Route>
      <Route path="/withdraw">
        <ProtectedRoute>
          <WithdrawPage />
        </ProtectedRoute>
      </Route>
      <Route path="/wallets">
        <ProtectedRoute>
          <WalletsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/history">
        <ProtectedRoute>
          <HistoryPage />
        </ProtectedRoute>
      </Route>
      <Route path="/about">
        <ProtectedRoute>
          <AboutPage />
        </ProtectedRoute>
      </Route>
      <Route path="/rules">
        <ProtectedRoute>
          <RulesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/customer-service">
        <ProtectedRoute>
          <CustomerServicePage />
        </ProtectedRoute>
      </Route>
      <Route path="/customer-service/chat">
        <ProtectedRoute>
          <CustomerServiceChatPage />
        </ProtectedRoute>
      </Route>
      <Route path="/change-password">
        <ProtectedRoute>
          <ChangePasswordPage />
        </ProtectedRoute>
      </Route>
      <Route path="/exchange-code">
        <ProtectedRoute>
          <ExchangeCodePage />
        </ProtectedRoute>
      </Route>
      <Route path="/my-products">
        <ProtectedRoute>
          <MyProductsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/withdrawal-proofs">
        <ProtectedRoute>
          <WithdrawalProofsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin">
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      </Route>
      <Route path="/admin/support">
        <AdminRoute>
          <AdminSupportPage />
        </AdminRoute>
      </Route>
      <Route path="/admin/deposits">
        <AdminRoute>
          <AdminDepositsPage />
        </AdminRoute>
      </Route>
      <Route path="/admin/withdrawals">
        <AdminRoute>
          <AdminWithdrawalsPage />
        </AdminRoute>
      </Route>
      <Route path="/admin/withdrawal-proofs">
        <AdminRoute>
          <AdminWithdrawalProofsPage />
        </AdminRoute>
      </Route>
      <Route path="/admin/users">
        <AdminRoute>
          <AdminUsersPage />
        </AdminRoute>
      </Route>
      <Route path="/admin/channels">
        <AdminRoute>
          <AdminChannelsPage />
        </AdminRoute>
      </Route>
      <Route path="/admin/products">
        <AdminRoute>
          <AdminProductsPage />
        </AdminRoute>
      </Route>
      <Route path="/admin/settings">
        <AdminRoute>
          <AdminSettingsPage />
        </AdminRoute>
      </Route>
      <Route path="/admin/bonus-codes">
        <AdminRoute>
          <AdminBonusCodesPage />
        </AdminRoute>
      </Route>
      <Route path="/admin/users/:id/team">
        <AdminRoute>
          <AdminUserTeamPage />
        </AdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <div className="site-app">
            <Toaster />
            <div className="site-page">
              <Router />
            </div>
          </div>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
