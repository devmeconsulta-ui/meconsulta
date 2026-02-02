import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Calendar, MessageSquare, Info, AlertTriangle, X, DollarSign, Trash2, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OmniLayout } from "@/components/clinica/omnichannel/OmniLayout";
import { toast } from "sonner";

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  categoria: string;
  referencia_id: string | null;
  lida: boolean;
  created_at: string;
}

export default function OmniNotificacoes() {
  const { currentUser } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  const clinicaId = currentUser?.clinicaId;

  const fetchNotificacoes = async () => {
    if (!clinicaId) return;
    
    try {
      const { data, error } = await supabase
        .from("clinica_notificacoes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotificacoes(data || []);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificacoes();

    if (!clinicaId) return;

    const channel = supabase
      .channel(`clinica_notificacoes_page_${clinicaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clinica_notificacoes",
          filter: `clinica_id=eq.${clinicaId}`,
        },
        () => {
          fetchNotificacoes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicaId]);

  const marcarComoLida = async (id: string) => {
    try {
      await supabase
        .from("clinica_notificacoes")
        .update({ lida: true })
        .eq("id", id);
      
      setNotificacoes(prev => 
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      );
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      await supabase
        .from("clinica_notificacoes")
        .update({ lida: true })
        .eq("clinica_id", clinicaId)
        .eq("lida", false);
      
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      toast.success("Todas as notificações marcadas como lidas");
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
      toast.error("Erro ao marcar notificações como lidas");
    }
  };

  const marcarSelecionadasComoLidas = async () => {
    if (selecionadas.length === 0) return;

    try {
      await supabase
        .from("clinica_notificacoes")
        .update({ lida: true })
        .in("id", selecionadas);
      
      setNotificacoes(prev => 
        prev.map(n => selecionadas.includes(n.id) ? { ...n, lida: true } : n)
      );
      setSelecionadas([]);
      toast.success(`${selecionadas.length} notificações marcadas como lidas`);
    } catch (error) {
      console.error("Erro ao marcar selecionadas como lidas:", error);
      toast.error("Erro ao marcar notificações");
    }
  };

  const excluirSelecionadas = async () => {
    if (selecionadas.length === 0) return;

    try {
      await supabase
        .from("clinica_notificacoes")
        .delete()
        .in("id", selecionadas);
      
      setNotificacoes(prev => prev.filter(n => !selecionadas.includes(n.id)));
      setSelecionadas([]);
      toast.success(`${selecionadas.length} notificações excluídas`);
    } catch (error) {
      console.error("Erro ao excluir notificações:", error);
      toast.error("Erro ao excluir notificações");
    }
  };

  const toggleSelecionada = (id: string) => {
    setSelecionadas(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const toggleSelecionarTodas = () => {
    if (selecionadas.length === notificacoesFiltradas.length) {
      setSelecionadas([]);
    } else {
      setSelecionadas(notificacoesFiltradas.map(n => n.id));
    }
  };

  const getIcone = (tipo: string, categoria: string) => {
    if (categoria === "consulta") {
      return <Calendar className="w-5 h-5 text-blue-500" />;
    }
    if (categoria === "chat") {
      return <MessageSquare className="w-5 h-5 text-purple-500" />;
    }
    if (categoria === "financeiro") {
      return <DollarSign className="w-5 h-5 text-green-500" />;
    }
    switch (tipo) {
      case "success":
        return <Check className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (tipo: string, categoria: string) => {
    if (categoria === "consulta") return "bg-blue-500/10";
    if (categoria === "chat") return "bg-purple-500/10";
    if (categoria === "financeiro") return "bg-green-500/10";
    switch (tipo) {
      case "success":
        return "bg-green-500/10";
      case "warning":
        return "bg-yellow-500/10";
      case "error":
        return "bg-red-500/10";
      default:
        return "bg-blue-500/10";
    }
  };

  const categorias = ["todas", "consulta", "chat", "financeiro", "geral"];

  const notificacoesFiltradas = notificacoes.filter(n => {
    const matchCategoria = filtroCategoria === "todas" || n.categoria === filtroCategoria;
    const matchStatus = filtroStatus === "todas" || 
      (filtroStatus === "lidas" && n.lida) || 
      (filtroStatus === "nao_lidas" && !n.lida);
    const matchBusca = busca === "" || 
      n.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      n.mensagem.toLowerCase().includes(busca.toLowerCase());
    
    return matchCategoria && matchStatus && matchBusca;
  });

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return (
    <OmniLayout clinicaId={clinicaId || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Notificações</h1>
            <p className="text-muted-foreground">
              {naoLidas > 0 ? `${naoLidas} não lidas` : "Todas as notificações lidas"}
            </p>
          </div>
          <div className="flex gap-2">
            {naoLidas > 0 && (
              <Button variant="outline" onClick={marcarTodasComoLidas}>
                <CheckCheck className="w-4 h-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar notificações..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas categorias</SelectItem>
                  <SelectItem value="consulta">Consultas</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="nao_lidas">Não lidas</SelectItem>
                  <SelectItem value="lidas">Lidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Ações em lote */}
        {selecionadas.length > 0 && (
          <Card className="border-primary">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selecionadas.length} selecionada(s)
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={marcarSelecionadasComoLidas}>
                    <Check className="w-4 h-4 mr-2" />
                    Marcar como lidas
                  </Button>
                  <Button size="sm" variant="destructive" onClick={excluirSelecionadas}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de notificações */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selecionadas.length === notificacoesFiltradas.length && notificacoesFiltradas.length > 0}
                onCheckedChange={toggleSelecionarTodas}
              />
              <CardTitle className="text-base">
                {notificacoesFiltradas.length} notificações
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : notificacoesFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma notificação</p>
                <p className="text-sm">Você não possui notificações nesta categoria</p>
              </div>
            ) : (
              <div className="divide-y">
                {notificacoesFiltradas.map((notificacao) => (
                  <div
                    key={notificacao.id}
                    className={`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors ${
                      !notificacao.lida ? "bg-primary/5" : ""
                    }`}
                  >
                    <Checkbox
                      checked={selecionadas.includes(notificacao.id)}
                      onCheckedChange={() => toggleSelecionada(notificacao.id)}
                    />
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getBgColor(notificacao.tipo, notificacao.categoria)}`}
                    >
                      {getIcone(notificacao.tipo, notificacao.categoria)}
                    </div>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => marcarComoLida(notificacao.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium ${!notificacao.lida ? "text-foreground" : "text-muted-foreground"}`}>
                          {notificacao.titulo}
                        </p>
                        {!notificacao.lida && (
                          <Badge variant="default" className="text-[10px] h-5">
                            Nova
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] h-5 capitalize">
                          {notificacao.categoria}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notificacao.mensagem}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(notificacao.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                        <span>
                          {format(new Date(notificacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    {!notificacao.lida && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => marcarComoLida(notificacao.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OmniLayout>
  );
}
