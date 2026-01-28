import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClinicaSidebar } from "./ClinicaSidebar";
import { ClinicaHeader } from "./ClinicaHeader";
import { Loader2 } from "lucide-react";

export function ClinicaLayout() {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [clinicaData, setClinicaData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    // Allow clinica owners AND clinic employees (usuarios_clinica with clinica_id)
    if (!isLoading && !currentUser) {
      navigate("/entrar");
      return;
    }

    // If user is not clinica type and doesn't have clinicaId, redirect
    if (!isLoading && currentUser && currentUser.tipo !== "clinica" && !currentUser.clinicaId) {
      navigate("/entrar");
    }
  }, [currentUser, isLoading, navigate]);

  useEffect(() => {
    async function fetchClinicaData() {
      if (!currentUser) return;

      let clinicaId: string | null = null;

      // If user is a clinic employee (has clinicaId in context), use that
      if (currentUser.clinicaId) {
        clinicaId = currentUser.clinicaId;
      } else if (currentUser.tipo === "clinica") {
        // If user is the clinic owner, fetch clinic by usuario_id
        const { data } = await supabase
          .from("clinicas")
          .select("id")
          .eq("usuario_id", currentUser.id)
          .maybeSingle();
        
        if (data) {
          clinicaId = data.id;
        }
      }

      if (clinicaId) {
        const { data } = await supabase
          .from("clinicas")
          .select("*")
          .eq("id", clinicaId)
          .maybeSingle();

        setClinicaData(data);
      }
      
      setDataLoading(false);
    }

    if (currentUser) {
      fetchClinicaData();
    }
  }, [currentUser]);

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <ClinicaSidebar />
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header fixo */}
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-card">
          <ClinicaHeader clinicaData={clinicaData} />
        </div>
        {/* Espaçador para o header fixo */}
        <div className="h-16" />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {dataLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Outlet context={{ clinicaData, currentUser }} />
          )}
        </main>
      </div>
    </div>
  );
}
