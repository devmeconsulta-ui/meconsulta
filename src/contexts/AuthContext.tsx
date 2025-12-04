import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CurrentUser {
  id: string;
  nome: string;
  email: string;
  tipo: "admin" | "medico" | "paciente";
  papel?: "atendente" | "supervisor" | "admin" | "superadmin";
}

interface AuthContextType {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved user in localStorage on mount
    const savedUser = localStorage.getItem("meconsulta_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("meconsulta_user");
      }
    }
    setIsLoading(false);
  }, []);

  const handleSetCurrentUser = (user: CurrentUser | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem("meconsulta_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("meconsulta_user");
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("meconsulta_user");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
