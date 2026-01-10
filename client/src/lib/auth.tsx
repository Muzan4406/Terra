import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { apiRequest } from "./queryClient";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phone: string, country: string, password: string) => Promise<void>;
  register: (data: { fullName: string; phone: string; country: string; password: string; invitationCode?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
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
    if (!res.ok) throw new Error(data.message || "Erreur de connexion");
    setUser(data.user);
  };

  const register = async (data: { fullName: string; phone: string; country: string; password: string; invitationCode?: string }) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || "Erreur d'inscription");
    setUser(resData.user);
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout", {});
    setUser(null);
  };

  const refetchUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
