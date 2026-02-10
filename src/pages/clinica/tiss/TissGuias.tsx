import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, Search, Eye, Stethoscope, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import CriarGuiaModal from "@/components/clinica/tiss/CriarGuiaModal";

interface TissGuia {
  id: string;
  numero_guia: string;
  tipo_guia: string;
  operadora: string;
  plano: string | null;
  carteirinha: string | null;
  crm: string | null;
  status: string;
  valor_total: number;
  data_emissao: string;
  consulta_id: string;
  paciente_nome?: string;
  medico_nome?: string;
}

export default function TissGuias() {
  const { currentUser } = useAuth();
  const clinicaId = currentUser?.clinicaId;

  const [guias, setGuias] = useState<TissGuia[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [criarGuiaOpen, setCriarGuiaOpen] = useState(false);
  const [detalhesGuia, setDetalhesGuia] = useState<TissGuia | null>(null);

  const fetchGuias = useCallback(async () => {
    if (!clinicaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tiss_guias")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with patient/doctor names
      const enriched: TissGuia[] = [];
      for (const g of data || []) {
        let paciente_nome = "";
        let medico_nome = "";

        if (g.paciente_id) {
          const { data: pac } = await supabase
            .from("pacientes")
            .select("nome")
            .eq("id", g.paciente_id)
            .single();
          paciente_nome = pac?.nome || "";
        }
        if (g.medico_id) {
          const { data: med } = await supabase
            .from("medicos")
            .select("nome")
            .eq("id", g.medico_id)
            .single();
          medico_nome = med?.nome || "";
        }

        enriched.push({
          ...g,
          paciente_nome,
          medico_nome,
        } as TissGuia);
      }

      setGuias(enriched);
    } catch (err) {
      console.error("Error fetching guias:", err);
      toast.error("Erro ao carregar guias");
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  useEffect(() => {
    fetchGuias();
  }, [fetchGuias]);

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "pronta": return "default";
      case "em_lote": return "secondary";
      case "enviada": return "outline";
      case "paga": return "default";
      default: return "secondary";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "pronta": return "Pronta";
      case "em_lote": return "Em Lote";
      case "enviada": return "Enviada";
      case "paga": return "Paga";
      default: return status;
    }
  };

  const filtered = guias.filter((g) => {
    const matchSearch =
      !search.trim() ||
      g.numero_guia?.toLowerCase().includes(search.toLowerCase()) ||
      g.paciente_nome?.toLowerCase().includes(search.toLowerCase()) ||
      g.operadora?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFilter === "todos" || g.tipo_guia === tipoFilter;
    return matchSearch && matchTipo;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Guias TISS</h2>
          <p className="text-muted-foreground">Gerencie guias de consulta vinculadas a atendimentos</p>
        </div>
        <Button onClick={() => setCriarGuiaOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Guia
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Guias Emitidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por nº guia, paciente, operadora..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo de guia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="sadt">SP/SADT</SelectItem>
                <SelectItem value="internacao">Internação</SelectItem>
                <SelectItem value="honorarios">Honorários</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando guias...</p>
          ) : filtered.length > 0 ? (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Guia</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(g => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-sm">{g.numero_guia}</TableCell>
                      <TableCell><Badge variant="outline">{g.tipo_guia}</Badge></TableCell>
                      <TableCell>{g.paciente_nome || "—"}</TableCell>
                      <TableCell>{g.medico_nome || "—"}</TableCell>
                      <TableCell>{g.operadora}</TableCell>
                      <TableCell>{new Date(g.data_emissao).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(g.status) as any}>{statusLabel(g.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">R$ {Number(g.valor_total).toFixed(2).replace(".", ",")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDetalhesGuia(g)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhuma guia emitida ainda.</p>
              <p className="text-xs text-muted-foreground">Clique em "Nova Guia" para criar a partir de consultas atendidas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criar Guia Modal */}
      <CriarGuiaModal
        open={criarGuiaOpen}
        onOpenChange={setCriarGuiaOpen}
        clinicaId={clinicaId || ""}
        onCreated={fetchGuias}
      />

      {/* Detalhes Modal */}
      <Dialog open={!!detalhesGuia} onOpenChange={() => setDetalhesGuia(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Guia {detalhesGuia?.numero_guia}</DialogTitle>
          </DialogHeader>
          {detalhesGuia && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{detalhesGuia.tipo_guia}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusBadgeVariant(detalhesGuia.status) as any}>{statusLabel(detalhesGuia.status)}</Badge></div>
                <div><span className="text-muted-foreground">Paciente:</span> <span className="font-medium">{detalhesGuia.paciente_nome}</span></div>
                <div><span className="text-muted-foreground">Médico:</span> <span className="font-medium">{detalhesGuia.medico_nome}</span></div>
                <div><span className="text-muted-foreground">Operadora:</span> <span className="font-medium">{detalhesGuia.operadora}</span></div>
                <div><span className="text-muted-foreground">Plano:</span> <span className="font-medium">{detalhesGuia.plano || "—"}</span></div>
                <div><span className="text-muted-foreground">Carteirinha:</span> <span className="font-mono">{detalhesGuia.carteirinha || "—"}</span></div>
                <div><span className="text-muted-foreground">CRM:</span> <span className="font-mono">{detalhesGuia.crm || "—"}</span></div>
                <div><span className="text-muted-foreground">Emissão:</span> {new Date(detalhesGuia.data_emissao).toLocaleDateString("pt-BR")}</div>
                <div><span className="text-muted-foreground">Valor:</span> <span className="font-medium">R$ {Number(detalhesGuia.valor_total).toFixed(2).replace(".", ",")}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
