import { ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import { OmniHeader } from "./OmniHeader";
import { useOmniAtendimentos } from "@/hooks/useOmniAtendimentos";

interface OmniLayoutProps {
  children: ReactNode;
}

export function OmniLayout({ children }: OmniLayoutProps) {
  // Get clinicaId from context
  const context = useOutletContext<{ clinicaData?: { id: string } }>();
  const clinicaId = context?.clinicaData?.id || null;

  // Fetch atendimentos count for badge
  const { atendimentos } = useOmniAtendimentos(clinicaId, {
    status: ["aguardando", "em_atendimento"],
  });

  const atendimentosCount = atendimentos?.length || 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] -m-4 sm:-m-6">
      {/* Header fixo do omnichannel */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <OmniHeader atendimentosCount={atendimentosCount} />
      </div>
      
      {/* Conteúdo com padding */}
      <div className="flex-1 p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
