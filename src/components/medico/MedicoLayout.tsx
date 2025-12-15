import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MedicoSidebar } from "./MedicoSidebar";
import { MedicoHeader } from "./MedicoHeader";
import { supabase } from "@/integrations/supabase/client";

export function MedicoLayout() {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [medicoData, setMedicoData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Check if user is atendente (clinic staff)
  const isAtendente = currentUser?.papel === 'atendente';

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.tipo !== "medico")) {
      navigate("/entrar");
    }
  }, [currentUser, isLoading, navigate]);

  useEffect(() => {
    async function fetchMedicoData() {
      if (!currentUser?.id) {
        setDataLoading(false);
        return;
      }

      if (isAtendente) {
        // For atendente, fetch medico data using medicoId from currentUser
        if (currentUser.medicoId) {
          const { data } = await supabase
            .from("medicos")
            .select("*")
            .eq("id", currentUser.medicoId)
            .maybeSingle();
          setMedicoData(data);
        }
      } else {
        // For regular medico, fetch using usuario_id
        const { data } = await supabase
          .from("medicos")
          .select("*")
          .eq("usuario_id", currentUser.id)
          .maybeSingle();
        setMedicoData(data);
      }
      setDataLoading(false);
    }
    fetchMedicoData();
  }, [currentUser, isAtendente]);

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error if medicoData couldn't be loaded after dataLoading is done
  if (!dataLoading && !medicoData) {
    return (
      <div className="min-h-screen bg-background">
        <MedicoSidebar />
        <div className="lg:pl-64">
          <MedicoHeader medicoData={null} isAtendente={isAtendente} />
          <main className="p-6 lg:p-8">
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-destructive font-medium text-lg">Erro ao carregar dados do médico</p>
              <p className="text-muted-foreground text-sm text-center max-w-md">
                Não foi possível encontrar os dados do médico vinculado à sua conta. 
                Verifique se o cadastro está completo ou entre em contato com o suporte.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MedicoSidebar />
      <div className="lg:pl-64">
        <MedicoHeader medicoData={medicoData} isAtendente={isAtendente} />
        <main className="p-6 lg:p-8">
          {dataLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Outlet context={{ medicoData, isAtendente }} />
          )}
        </main>
      </div>
    </div>
  );
}
