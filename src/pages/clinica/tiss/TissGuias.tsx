import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, Search, Eye } from "lucide-react";
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
  paciente_id?: string | null;
  medico_id?: string | null;
}

const GUIA_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  pronta: { label: "Pronta", variant: "default" },
  em_lote: { label: "Em Lote", variant: "outline" },
  exportado: { label: "Exportado", variant: "outline" },
  enviado: { label: "Enviado", variant: "default" },
  pago: { label: "Pago", variant: "default" },
  glosado: { label: "Glosado", variant: "destructive" },
};

export default function TissGuias() {
  const { currentUser } = useAuth();
  const clinicaId = currentUser?.clinicaId;

  const [guias, setGuias] = useState<TissGuia[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [operadoraFilter, setOperadoraFilter] = useState("todos");
  const [medicoFilter, setMedicoFilter] = useState("todos");
  const [competenciaFilter, setCompetenciaFilter] = useState("");
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

      const enriched: TissGuia[] = [];
      for (const g of data || []) {
        let paciente_nome = "";
        let medico_nome = "";
        if (g.paciente_id) {
          const { data: pac } = await supabase.from("pacientes").select("nome").eq("id", g.paciente_id).single();
          paciente_nome = pac?.nome || "";
        }
        if (g.medico_id) {
          const { data: med } = await supabase.from("medicos").select("nome").eq("id", g.medico_id).single();
          medico_nome = med?.nome || "";
        }
        enriched.push({ ...g, paciente_nome, medico_nome } as TissGuia);
      }
      setGuias(enriched);
    } catch {
      toast.error("Erro ao carregar guias");
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  useEffect(() => { fetchGuias(); }, [fetchGuias]);

  const operadoras = [...new Set(guias.map(g => g.operadora))].sort();
  const medicos = [...new Set(guias.filter(g => g.medico_nome).map(g => g.medico_nome!))].sort();

  const filtered = guias.filter((g) => {
    if (search.trim() && !(
      g.numero_guia?.toLowerCase().includes(search.toLowerCase()) ||
      g.paciente_nome?.toLowerCase().includes(search.toLowerCase()) ||
      g.operadora?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    if (tipoFilter !== "todos" && g.tipo_guia !== tipoFilter) return false;
    if (statusFilter !== "todos" && g.status !== statusFilter) return false;
    if (operadoraFilter !== "todos" && g.operadora !== operadoraFilter) return false;
    if (medicoFilter !== "todos" && g.medico_nome !== medicoFilter) return false;
    if (competenciaFilter) {
      const comp = g.data_emissao.slice(0, 7);
      if (comp !== competenciaFilter) return false;
    }
    return true;
  });

  const getStatus = (s: string) => GUIA_STATUS_MAP[s] || { label: s, variant: "secondary" as const };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Guias TISS</h2>
          <p className="text-muted-foreground">Gerencie guias de consulta vinculadas a atendimentos</p>
        </div>
        <Button onClick={() => setCriarGuiaOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Nova Guia
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Guias Emitidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
            <div className="relative sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar guia, paciente, operadora..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(GUIA_STATUS_MAP).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={operadoraFilter} onValueChange={setOperadoraFilter}>
              <SelectTrigger><SelectValue placeholder="Operadora" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas operadoras</SelectItem>
                {operadoras.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={medicoFilter} onValueChange={setMedicoFilter}>
              <SelectTrigger><SelectValue placeholder="Médico" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos médicos</SelectItem>
                {medicos.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="month" value={competenciaFilter} onChange={e => setCompetenciaFilter(e.target.value)} placeholder="Competência" />
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
                  {filtered.map(g => {
                    const st = getStatus(g.status);
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-mono text-sm">{g.numero_guia}</TableCell>
                        <TableCell><Badge variant="outline">{g.tipo_guia}</Badge></TableCell>
                        <TableCell>{g.paciente_nome || "—"}</TableCell>
                        <TableCell>{g.medico_nome || "—"}</TableCell>
                        <TableCell>{g.operadora}</TableCell>
                        <TableCell>{new Date(g.data_emissao).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell className="text-right">R$ {Number(g.valor_total).toFixed(2).replace(".", ",")}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setDetalhesGuia(g)}><Eye className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhuma guia encontrada.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <CriarGuiaModal open={criarGuiaOpen} onOpenChange={setCriarGuiaOpen} clinicaId={clinicaId || ""} onCreated={fetchGuias} />

      <Dialog open={!!detalhesGuia} onOpenChange={() => setDetalhesGuia(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes da Guia {detalhesGuia?.numero_guia}</DialogTitle></DialogHeader>
          {detalhesGuia && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{detalhesGuia.tipo_guia}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={getStatus(detalhesGuia.status).variant}>{getStatus(detalhesGuia.status).label}</Badge></div>
              <div><span className="text-muted-foreground">Paciente:</span> <span className="font-medium">{detalhesGuia.paciente_nome}</span></div>
              <div><span className="text-muted-foreground">Médico:</span> <span className="font-medium">{detalhesGuia.medico_nome}</span></div>
              <div><span className="text-muted-foreground">Operadora:</span> <span className="font-medium">{detalhesGuia.operadora}</span></div>
              <div><span className="text-muted-foreground">Plano:</span> <span className="font-medium">{detalhesGuia.plano || "—"}</span></div>
              <div><span className="text-muted-foreground">Carteirinha:</span> <span className="font-mono">{detalhesGuia.carteirinha || "—"}</span></div>
              <div><span className="text-muted-foreground">CRM:</span> <span className="font-mono">{detalhesGuia.crm || "—"}</span></div>
              <div><span className="text-muted-foreground">Emissão:</span> {new Date(detalhesGuia.data_emissao).toLocaleDateString("pt-BR")}</div>
              <div><span className="text-muted-foreground">Valor:</span> <span className="font-medium">R$ {Number(detalhesGuia.valor_total).toFixed(2).replace(".", ",")}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
