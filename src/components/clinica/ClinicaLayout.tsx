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
    if (!isLoading && (!currentUser || currentUser.tipo !== "clinica")) {
      navigate("/entrar");
    }
  }, [currentUser, isLoading, navigate]);

  useEffect(() => {
    async function fetchClinicaData() {
      if (!currentUser?.id) return;

      const { data } = await supabase
        .from("clinicas")
        .select("*")
        .eq("usuario_id", currentUser.id)
        .maybeSingle();

      setClinicaData(data);
      setDataLoading(false);
    }

    if (currentUser?.tipo === "clinica") {
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
        <ClinicaHeader clinicaData={clinicaData} />
        <main className="flex-1 p-4 sm:p-6 overflow-auto pt-16 lg:pt-6">
          {dataLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Outlet context={{ clinicaData }} />
          )}
        </main>
      </div>
    </div>
  );
}
