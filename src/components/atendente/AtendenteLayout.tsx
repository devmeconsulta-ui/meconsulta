import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { AtendenteHeader } from "./AtendenteHeader";
import { AtendenteOmniNav } from "./AtendenteOmniNav";
import { useTrackAgentPresence } from "@/hooks/useAgentPresence";

export function AtendenteLayout() {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [clinicaData, setClinicaData] = useState<any>(null);
  const [usuarioClinicaData, setUsuarioClinicaData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      navigate("/entrar");
      return;
    }

    // Verify this is a clinic user (has clinicaId)
    if (!isLoading && currentUser && !currentUser.clinicaId) {
      navigate("/entrar");
    }
  }, [currentUser, isLoading, navigate]);

  useEffect(() => {
    async function fetchData() {
      if (!currentUser?.clinicaId) return;

      try {
        // Fetch clinic data
        const { data: clinica } = await supabase
          .from("clinicas")
          .select("*")
          .eq("id", currentUser.clinicaId)
          .maybeSingle();

        setClinicaData(clinica);

        // Fetch usuario_clinica data
        const { data: usuarioClinica } = await supabase
          .from("usuarios_clinica")
          .select("*")
          .eq("email", currentUser.email)
          .eq("clinica_id", currentUser.clinicaId)
          .maybeSingle();

        setUsuarioClinicaData(usuarioClinica);
      } catch (error) {
        console.error("Error fetching atendente data:", error);
      } finally {
        setDataLoading(false);
      }
    }

    if (currentUser?.clinicaId) {
      fetchData();
    }
  }, [currentUser]);

  // Track agent presence at the layout level - this ensures all agents are tracked
  // regardless of which page they're viewing
  useTrackAgentPresence(
    clinicaData?.id || null,
    usuarioClinicaData?.id || null,
    usuarioClinicaData?.nome || null
  );

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header com navegação do omnichannel */}
      <AtendenteHeader 
        clinicaData={clinicaData} 
        usuarioClinicaData={usuarioClinicaData}
      />
      
      {/* Navegação do omnichannel (estilo do OmniHeader) */}
      <AtendenteOmniNav clinicaId={clinicaData?.id} />
      
      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {dataLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Outlet context={{ clinicaData, usuarioClinicaData, currentUser }} />
        )}
      </main>
    </div>
  );
}
