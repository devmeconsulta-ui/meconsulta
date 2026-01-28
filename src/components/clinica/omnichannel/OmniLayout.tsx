import { ReactNode } from "react";
import { OmniHeader } from "./OmniHeader";

interface OmniLayoutProps {
  children: ReactNode;
}

export function OmniLayout({ children }: OmniLayoutProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 sm:-m-6">
      {/* Header fixo do omnichannel */}
      <div className="flex-shrink-0 bg-background border-b border-border">
        <OmniHeader />
      </div>
      
      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
