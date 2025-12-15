import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CurrentUser {
  id: string;
  nome: string;
  email: string;
  tipo: "admin" | "medico" | "paciente" | "clinica";
  papel?: "atendente" | "supervisor" | "admin" | "superadmin";
  pacienteId?: string;
  medicoId?: string;
  clinicaId?: string;
  permissoes?: string[];
  todosMedicos?: boolean;
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
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        // Fetch related IDs if not present
        if (user && !user.pacienteId && !user.medicoId) {
          fetchRelatedIds(user);
        }
      } catch {
        localStorage.removeItem("meconsulta_user");
      }
    }
    setIsLoading(false);
  }, []);

  async function fetchRelatedIds(user: CurrentUser) {
    if (user.tipo === "paciente" && !user.pacienteId) {
      const { data } = await supabase
        .from("pacientes")
        .select("id")
        .eq("usuario_id", user.id)
        .maybeSingle();
      
      if (data) {
        const updatedUser = { ...user, pacienteId: data.id };
        setCurrentUser(updatedUser);
        localStorage.setItem("meconsulta_user", JSON.stringify(updatedUser));
      }
    } else if (user.tipo === "medico" && !user.medicoId) {
      const { data } = await supabase
        .from("medicos")
        .select("id")
        .eq("usuario_id", user.id)
        .maybeSingle();
      
      if (data) {
        const updatedUser = { ...user, medicoId: data.id };
        setCurrentUser(updatedUser);
        localStorage.setItem("meconsulta_user", JSON.stringify(updatedUser));
      }
    } else if (user.tipo === "clinica" && !user.clinicaId) {
      const { data } = await supabase
        .from("clinicas")
        .select("id")
        .eq("usuario_id", user.id)
        .maybeSingle();
      
      if (data) {
        const updatedUser = { ...user, clinicaId: data.id };
        setCurrentUser(updatedUser);
        localStorage.setItem("meconsulta_user", JSON.stringify(updatedUser));
      }
    }
  }

  const handleSetCurrentUser = async (user: CurrentUser | null) => {
    if (user) {
      // Fetch related IDs on login (only if not already provided)
      let updatedUser = { ...user };
      
      if (user.tipo === "paciente" && !user.pacienteId) {
        const { data } = await supabase
          .from("pacientes")
          .select("id")
          .eq("usuario_id", user.id)
          .maybeSingle();
        
        if (data) {
          updatedUser.pacienteId = data.id;
        }
      } else if (user.tipo === "medico" && !user.medicoId) {
        const { data } = await supabase
          .from("medicos")
          .select("id")
          .eq("usuario_id", user.id)
          .maybeSingle();
        
        if (data) {
          updatedUser.medicoId = data.id;
        }
      } else if (user.tipo === "clinica" && !user.clinicaId) {
        const { data } = await supabase
          .from("clinicas")
          .select("id")
          .eq("usuario_id", user.id)
          .maybeSingle();
        
        if (data) {
          updatedUser.clinicaId = data.id;
        }
      }
      
      setCurrentUser(updatedUser);
      localStorage.setItem("meconsulta_user", JSON.stringify(updatedUser));
    } else {
      setCurrentUser(null);
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