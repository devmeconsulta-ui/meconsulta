import { supabase } from "@/integrations/supabase/client";

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    nome: string;
    email: string;
    tipo: "admin" | "medico" | "paciente" | "clinica";
    papel?: string;
    pacienteId?: string;
    medicoId?: string;
    clinicaId?: string;
    todosMedicos?: boolean;
    permissoes?: string[];
    deveTrocarSenha?: boolean;
    isClinicaUser?: boolean;
  };
  error?: string;
}

interface RegisterData {
  email: string;
  password: string;
  nome: string;
  tipo: "paciente" | "clinica";
  telefone?: string;
  cpf?: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
  cidade?: string;
  estado?: string;
}

export async function secureLogin(email: string, password: string): Promise<LoginResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("secure-auth/login", {
      body: { email, password },
    });

    if (error) {
      console.error("Login error:", error);
      return { success: false, error: "Erro ao conectar com o servidor" };
    }

    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, user: data.user };
  } catch (err) {
    console.error("Unexpected login error:", err);
    return { success: false, error: "Erro inesperado. Tente novamente." };
  }
}

export async function secureRegister(registerData: RegisterData): Promise<LoginResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("secure-auth/register", {
      body: registerData,
    });

    if (error) {
      console.error("Register error:", error);
      return { success: false, error: "Erro ao conectar com o servidor" };
    }

    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, user: data.user };
  } catch (err) {
    console.error("Unexpected register error:", err);
    return { success: false, error: "Erro inesperado. Tente novamente." };
  }
}

export async function secureChangePassword(
  userId: string,
  userTable: "usuarios" | "usuarios_clinica",
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("secure-auth/change-password", {
      body: { userId, userTable, newPassword },
    });

    if (error) {
      console.error("Change password error:", error);
      return { success: false, error: "Erro ao conectar com o servidor" };
    }

    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected change password error:", err);
    return { success: false, error: "Erro inesperado. Tente novamente." };
  }
}

/**
 * Hash a password using the secure edge function
 * Use this when creating/updating user passwords through the clinic panel
 */
export async function hashPassword(password: string): Promise<{ hash?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("hash-password", {
      body: { action: "hash", password },
    });

    if (error || data.error) {
      return { error: data?.error || "Erro ao processar senha" };
    }

    return { hash: data.hash };
  } catch (err) {
    console.error("Hash password error:", err);
    return { error: "Erro ao processar senha" };
  }
}
