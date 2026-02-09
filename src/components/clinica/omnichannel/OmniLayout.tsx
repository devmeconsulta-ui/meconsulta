import { ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import { OmniHeader } from "./OmniHeader";
import { useTrackAgentPresence } from "@/hooks/useAgentPresence";

interface OmniLayoutProps {
  children: ReactNode;
  clinicaId?: string;
}

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string; usuarioClinicaId?: string } | null;
}

export function OmniLayout({ children, clinicaId }: OmniLayoutProps) {
  // Get user context for presence tracking
  const context = useOutletContext<ClinicaContext>();
  const currentUser = context?.currentUser;
  
  // Track agent presence - this makes the current user appear as online
  useTrackAgentPresence(
    clinicaId || null,
    currentUser?.usuarioClinicaId || currentUser?.id || null,
    currentUser?.nome || null
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 sm:-m-6 overflow-hidden">
      {/* Header fixo do omnichannel */}
      <div className="flex-shrink-0 bg-background border-b border-border">
        <OmniHeader clinicaId={clinicaId} />
      </div>
      
      {/* Conteúdo com scroll independente */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
