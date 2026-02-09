import { ReactNode } from "react";
import { OmniHeader } from "./OmniHeader";

interface OmniLayoutProps {
  children: ReactNode;
  clinicaId?: string;
}

export function OmniLayout({ children, clinicaId }: OmniLayoutProps) {
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
