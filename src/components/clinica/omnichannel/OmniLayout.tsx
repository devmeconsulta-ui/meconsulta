import { ReactNode } from "react";
import { OmniHeader } from "./OmniHeader";

interface OmniLayoutProps {
  children: ReactNode;
}

export function OmniLayout({ children }: OmniLayoutProps) {
  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] -m-4 sm:-m-6">
      {/* Header fixo do omnichannel */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <OmniHeader />
      </div>
      
      {/* Conteúdo com padding */}
      <div className="flex-1 p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
