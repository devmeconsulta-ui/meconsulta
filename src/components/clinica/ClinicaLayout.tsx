import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClinicaSidebar } from "./ClinicaSidebar";
import { ClinicaHeader } from "./ClinicaHeader";
import { Loader2 } from "lucide-react";
import { useTrackAgentPresence } from "@/hooks/useAgentPresence";

export function ClinicaLayout() {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [clinicaData, setClinicaData] = useState<any>(null);
  const [usuarioClinicaId, setUsuarioClinicaId] = useState<string | null>(null);
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

      console.log("[ClinicaLayout] Fetching data for user:", currentUser.id, currentUser.email);

      let clinicaId: string | null = null;

      // If user is a clinic employee (has clinicaId in context), use that
      if (currentUser.clinicaId) {
        clinicaId = currentUser.clinicaId;
        console.log("[ClinicaLayout] Using clinicaId from context:", clinicaId);
      } else if (currentUser.tipo === "clinica") {
        // If user is the clinic owner, fetch clinic by usuario_id
        const { data } = await supabase
          .from("clinicas")
          .select("id")
          .eq("usuario_id", currentUser.id)
          .maybeSingle();
        
        if (data) {
          clinicaId = data.id;
          console.log("[ClinicaLayout] Fetched clinicaId for owner:", clinicaId);
        }
      }

      if (clinicaId) {
        const { data } = await supabase
          .from("clinicas")
          .select("*")
          .eq("id", clinicaId)
          .maybeSingle();

        console.log("[ClinicaLayout] Clinic data loaded:", data?.id, data?.nome_fantasia);
        setClinicaData(data);
        
        // Fetch usuarioClinicaId for the user
        if (currentUser.email) {
          const { data: usuarioClinica } = await supabase
            .from("usuarios_clinica")
            .select("id, nome")
            .eq("clinica_id", clinicaId)
            .eq("email", currentUser.email)
            .eq("ativo", true)
            .maybeSingle();
          
          if (usuarioClinica) {
            console.log("[ClinicaLayout] ✅ Found usuarioClinica:", usuarioClinica.id, usuarioClinica.nome);
            setUsuarioClinicaId(usuarioClinica.id);
          } else {
            // Clinic owner has no usuarios_clinica entry — set null to avoid FK violations
            console.log("[ClinicaLayout] ⚠️ No usuarioClinica found for clinic owner, setting null");
            setUsuarioClinicaId(null);
          }
        } else {
          console.log("[ClinicaLayout] No email, setting usuarioClinicaId to null");
          setUsuarioClinicaId(null);
        }
      }
      
      setDataLoading(false);
    }

    if (currentUser) {
      fetchClinicaData();
    }
  }, [currentUser]);

  // Log presence tracking params
  useEffect(() => {
    console.log("[ClinicaLayout] 🔍 Presence tracking params:", {
      clinicaId: clinicaData?.id || "not loaded",
      usuarioClinicaId: usuarioClinicaId || "not loaded",
      userName: currentUser?.nome || "not loaded"
    });
  }, [clinicaData?.id, usuarioClinicaId, currentUser?.nome]);

  // Track agent/staff presence at the layout level
  // This ensures all clinic staff are tracked when they're logged in
  useTrackAgentPresence(
    clinicaData?.id || null,
    usuarioClinicaId || null,
    currentUser?.nome || null
  );

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <ClinicaSidebar />
      <div className="flex-1 flex flex-col lg:ml-64 overflow-hidden">
        {/* Header fixo */}
        <div className="flex-shrink-0 z-40 bg-card">
          <ClinicaHeader clinicaData={clinicaData} />
        </div>
        {/* Área de conteúdo com scroll contido */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {dataLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Outlet context={{ clinicaData, currentUser: { ...currentUser, usuarioClinicaId } }} />
          )}
        </main>
      </div>
    </div>
  );
}
