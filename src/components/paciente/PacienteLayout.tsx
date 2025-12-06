import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PacienteSidebar } from "./PacienteSidebar";
import { PacienteHeader } from "./PacienteHeader";
import { supabase } from "@/integrations/supabase/client";

export function PacienteLayout() {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [notificacoesCount, setNotificacoesCount] = useState(0);

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

        // Contar consultas com pagamento pendente como "notificações"
        if (data?.id) {
          const { count } = await supabase
            .from("consultas")
            .select("*", { count: "exact", head: true })
            .eq("paciente_id", data.id)
            .eq("status_pagamento", "pendente");
          setNotificacoesCount(count || 0);
        }
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
    <div className="min-h-screen bg-background">
      <PacienteSidebar pacienteId={pacienteData?.id} />
      <div className="lg:pl-64">
        <PacienteHeader pacienteData={pacienteData} notificacoesCount={notificacoesCount} />
        <main className="p-6 lg:p-8">
          <Outlet context={{ pacienteData, setPacienteData }} />
        </main>
      </div>
    </div>
  );
}
