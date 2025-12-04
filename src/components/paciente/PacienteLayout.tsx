import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PacienteBottomNav } from "./PacienteBottomNav";
import { PacienteHeader } from "./PacienteHeader";
import { supabase } from "@/integrations/supabase/client";

export function PacienteLayout() {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [pacienteData, setPacienteData] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.tipo !== "paciente")) {
      navigate("/entrar");
    }
  }, [currentUser, isLoading, navigate]);

  useEffect(() => {
    async function fetchPacienteData() {
      if (currentUser?.id) {
        const { data } = await supabase
          .from("pacientes")
          .select("*")
          .eq("usuario_id", currentUser.id)
          .maybeSingle();
        setPacienteData(data);
      }
    }
    fetchPacienteData();
  }, [currentUser]);

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20 lg:pb-0">
      <PacienteHeader pacienteData={pacienteData} />
      <main className="p-4 lg:p-8 max-w-6xl mx-auto">
        <Outlet context={{ pacienteData, setPacienteData }} />
      </main>
      <PacienteBottomNav />
    </div>
  );
}
