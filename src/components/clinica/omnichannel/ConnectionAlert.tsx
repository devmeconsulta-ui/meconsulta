import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useOmniConnectionMonitor } from "@/hooks/useOmniConnectionMonitor";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ConnectionAlertProps {
  clinicaId: string | null;
  className?: string;
}

export function ConnectionAlert({ clinicaId, className }: ConnectionAlertProps) {
  const { hasDisconnectedQueues, disconnectedQueues, isChecking, checkNow } = useOmniConnectionMonitor(clinicaId);

  if (!hasDisconnectedQueues) return null;

  return (
    <Alert 
      variant="destructive" 
      className={cn("border-destructive/50 bg-destructive/10", className)}
    >
      <WifiOff className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Conexão WhatsApp Perdida
        <Badge variant="destructive" className="text-xs">
          {disconnectedQueues.length} fila{disconnectedQueues.length > 1 ? "s" : ""}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            As seguintes filas estão desconectadas e não podem enviar/receber mensagens:
          </p>
          <ul className="text-sm list-disc list-inside">
            {disconnectedQueues.map((q) => (
              <li key={q.filaId}>
                <strong>{q.filaNome}</strong> (instância: {q.instanciaNome})
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkNow}
              disabled={isChecking}
              className="gap-1"
            >
              <RefreshCw className={cn("h-3 w-3", isChecking && "animate-spin")} />
              {isChecking ? "Verificando..." : "Verificar novamente"}
            </Button>
            <Link to="/clinica/omnichannel/filas">
              <Button variant="destructive" size="sm" className="gap-1">
                <Wifi className="h-3 w-3" />
                Reconectar WhatsApp
              </Button>
            </Link>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Compact version for header
export function ConnectionAlertBadge({ clinicaId }: { clinicaId: string | null }) {
  const { hasDisconnectedQueues, disconnectedQueues, isChecking, checkNow } = useOmniConnectionMonitor(clinicaId);

  if (!hasDisconnectedQueues) return null;

  return (
    <Link to="/clinica/omnichannel/filas">
      <Badge 
        variant="destructive" 
        className="gap-1 cursor-pointer hover:bg-destructive/80 animate-pulse"
      >
        <WifiOff className="h-3 w-3" />
        {disconnectedQueues.length} desconectada{disconnectedQueues.length > 1 ? "s" : ""}
      </Badge>
    </Link>
  );
}
