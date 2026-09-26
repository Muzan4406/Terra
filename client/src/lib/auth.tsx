import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { apiRequest, fetchWithTimeout } from "./queryClient";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  authError: string | null;
  login: (phone: string, country: string, password: string) => Promise<void>;
  register: (data: { fullName: string; phone: string; country: string; password: string; invitationCode?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchUser = async () => {
    setAuthError(null);
    try {
      const res = await fetchWithTimeout("/api/auth/me", {
        credentials: "include",
      });

      if (res.status === 401) {
        setUser(null);
        return;
      }

      if (!res.ok) {
        throw new Error(
          "Le serveur ne peut pas vérifier votre session pour le moment.",
        );
      }

      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Le serveur ne peut pas vérifier votre session pour le moment.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (phone: string, country: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { phone, country, password });
    const data = await res.json();
    if (!res.ok) {
      const diagnostic = data.diagnosticCode ? ` (${data.diagnosticCode})` : "";
      throw new Error(`${data.message || "Erreur de connexion"}${diagnostic}`);
    }
    setUser(data.user);
    setAuthError(null);
  };

  const register = async (data: { fullName: string; phone: string; country: string; password: string; invitationCode?: string }) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || "Erreur d'inscription");
    setUser(resData.user);
    setAuthError(null);
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout", {});
    setUser(null);
    setAuthError(null);
  };

  const refetchUser = async () => {
    setIsLoading(true);
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, authError, login, register, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
