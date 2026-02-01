import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pause, 
  Circle,
  MessageSquare,
  Loader2 
} from "lucide-react";
import { useOmniFilas, OmniFila } from "@/hooks/useOmniFilas";
import { useOmniAtendimentos, OmniAtendimento } from "@/hooks/useOmniAtendimentos";
import { cn } from "@/lib/utils";

interface AtendenteContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  usuarioClinicaData: { id: string; nome: string } | null;
  currentUser: { id: string; nome: string } | null;
}

// Citações motivacionais
const quotes = [
  { text: "Acredite que você pode e você já está no meio do caminho.", author: "Theodore Roosevelt" },
  { text: "O sucesso nasce do querer, da determinação e persistência.", author: "Ayrton Senna" },
  { text: "Seja a mudança que você quer ver no mundo.", author: "Mahatma Gandhi" },
  { text: "Grandes coisas nunca vieram de zonas de conforto.", author: "Neil Strauss" },
];

export default function AtendenteDashboard() {
  const context = useOutletContext<AtendenteContext>();
  const clinicaData = context?.clinicaData;
  const usuarioClinicaData = context?.usuarioClinicaData;
  
  const clinicaId = clinicaData?.id || null;
  const agenteId = usuarioClinicaData?.id;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusAgente, setStatusAgente] = useState<"disponivel" | "pausa" | "offline">("disponivel");
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  // Use memoized options to prevent infinite loops
  const atendimentosOptions = useMemo(() => ({
    agenteId: agenteId,
    status: ["aguardando", "em_atendimento"] as string[],
  }), [agenteId]);

  const { filas, loading: loadingFilas } = useOmniFilas(clinicaId);
  const { atendimentos, loading: loadingAtendimentos } = useOmniAtendimentos(clinicaId, atendimentosOptions);

  // Atualizar hora a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Wait for context to be ready
  const dataReady = clinicaData !== null && clinicaData !== undefined;
  const loading = !dataReady || loadingFilas || loadingAtendimentos;

  // Contar atendimentos por fila
  const getAtendimentosFilaCount = (filaId: string) => {
    return atendimentos.filter((a) => a.fila_id === filaId).length;
  };

  // Saudação baseada no horário
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const userName = usuarioClinicaData?.nome?.split(" ")[0] || "Atendente";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Lado esquerdo - Gerenciar filas */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Gerenciar filas</h2>
            
            {/* Status do serviço */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Circle className={cn(
                  "w-2 h-2",
                  statusAgente === "disponivel" && "fill-green-500 text-green-500",
                  statusAgente === "pausa" && "fill-yellow-500 text-yellow-500",
                  statusAgente === "offline" && "fill-red-500 text-red-500"
                )} />
                {statusAgente === "disponivel" && "Online"}
                {statusAgente === "pausa" && "Em pausa"}
                {statusAgente === "offline" && "Offline"}
              </Badge>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={statusAgente === "offline" ? "destructive" : "outline"}
                  className="h-8 w-8 p-0"
                  onClick={() => setStatusAgente("offline")}
                >
                  <Circle className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant={statusAgente === "pausa" ? "secondary" : "outline"}
                  className="h-8 w-8 p-0"
                  onClick={() => setStatusAgente("pausa")}
                >
                  <Pause className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant={statusAgente === "disponivel" ? "default" : "outline"}
                  className="h-8 w-8 p-0"
                  onClick={() => setStatusAgente("disponivel")}
                >
                  <Play className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de filas */}
          <div className="space-y-3">
            {filas.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nenhuma fila disponível
                </CardContent>
              </Card>
            ) : (
              filas.map((fila) => (
                <Card 
                  key={fila.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: fila.cor || "#3b82f6" }}
                      >
                        <Play className="w-4 h-4 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{fila.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {statusAgente === "disponivel" ? "Logado" : "Deslogado"}
                        </p>
                      </div>

                      <Badge variant="secondary" className="shrink-0">
                        {getAtendimentosFilaCount(fila.id)} atendimentos
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Lado direito - Widget de boas-vindas */}
        <div className="lg:w-80 space-y-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6 text-center">
              <p className="text-lg text-muted-foreground">
                {getGreeting()} {userName}!
              </p>
              
              <p className="text-5xl font-light mt-4 font-mono tracking-tight">
                {currentTime.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm italic text-muted-foreground">
                  "{quote.text}"
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {quote.author}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Meus atendimentos */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="font-medium">Meus Atendimentos</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-yellow-600">
                    {atendimentos.filter((a) => a.status === "aguardando").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Aguardando</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-green-600">
                    {atendimentos.filter((a) => a.status === "em_atendimento").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Em atendimento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Novidades */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Novidades</h3>
              <p className="text-sm text-muted-foreground">
                Nenhuma novidade para exibir.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
