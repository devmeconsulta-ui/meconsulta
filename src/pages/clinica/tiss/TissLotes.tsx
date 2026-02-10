import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Layers, Search, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";

interface TissLote {
  id: string;
  numero_lote: string;
  operadora: string;
  competencia: string;
  status: string;
  valor_total: number;
  qtd_guias: number;
  created_at: string;
}

interface GuiaPronta {
  id: string;
  numero_guia: string;
  operadora: string;
  valor_total: number;
  data_emissao: string;
  consulta_id: string;
  paciente_nome?: string;
}

const LOTE_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  aberto: { label: "Aberto", variant: "default" },
  fechado: { label: "Fechado", variant: "secondary" },
  exportado: { label: "Exportado", variant: "outline" },
  enviado: { label: "Enviado", variant: "outline" },
  processado: { label: "Processado", variant: "secondary" },
  pago: { label: "Pago", variant: "default" },
};

export default function TissLotes() {
  const { currentUser } = useAuth();
  const clinicaId = currentUser?.clinicaId;

  const [lotes, setLotes] = useState<TissLote[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [operadoraFilter, setOperadoraFilter] = useState("todos");
  const [competenciaFilter, setCompetenciaFilter] = useState("");

  const [criarOpen, setCriarOpen] = useState(false);
  const [guiasProntas, setGuiasProntas] = useState<GuiaPronta[]>([]);
  const [loadingGuias, setLoadingGuias] = useState(false);
  const [selectedGuias, setSelectedGuias] = useState<Set<string>>(new Set());
  const [operadora, setOperadora] = useState("");
  const [competencia, setCompetencia] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [saving, setSaving] = useState(false);
  const [detalheLote, setDetalheLote] = useState<TissLote | null>(null);

  const fetchLotes = useCallback(async () => {
    if (!clinicaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tiss_lotes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLotes((data || []) as TissLote[]);
    } catch {
      toast.error("Erro ao carregar lotes");
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  useEffect(() => { fetchLotes(); }, [fetchLotes]);

  const fetchGuiasProntas = useCallback(async () => {
    if (!clinicaId) return;
    setLoadingGuias(true);
    try {
      const { data, error } = await supabase
        .from("tiss_guias")
        .select("id, numero_guia, operadora, valor_total, data_emissao, consulta_id, paciente_id")
        .eq("clinica_id", clinicaId)
        .eq("status", "pronta")
        .order("data_emissao", { ascending: false });
      if (error) throw error;

      const enriched: GuiaPronta[] = [];
      for (const g of data || []) {
        let paciente_nome = "";
        if (g.paciente_id) {
          const { data: pac } = await supabase.from("pacientes").select("nome").eq("id", g.paciente_id).single();
          paciente_nome = pac?.nome || "";
        }
        enriched.push({ ...g, paciente_nome } as GuiaPronta);
      }
      setGuiasProntas(enriched);
    } catch {
      toast.error("Erro ao carregar guias");
    } finally {
      setLoadingGuias(false);
    }
  }, [clinicaId]);

  const openCriar = () => {
    setSelectedGuias(new Set());
    setOperadora("");
    setCriarOpen(true);
    fetchGuiasProntas();
  };

  const toggleGuia = (id: string) => {
    setSelectedGuias(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredGuiasModal = operadora
    ? guiasProntas.filter(g => g.operadora.toLowerCase().includes(operadora.toLowerCase()))
    : guiasProntas;

  const toggleAll = () => {
    if (selectedGuias.size === filteredGuiasModal.length && filteredGuiasModal.length > 0) {
      setSelectedGuias(new Set());
    } else {
      setSelectedGuias(new Set(filteredGuiasModal.map(g => g.id)));
    }
  };

  const selectedValorTotal = guiasProntas
    .filter(g => selectedGuias.has(g.id))
    .reduce((sum, g) => sum + Number(g.valor_total), 0);

  const operadorasDisponiveis = [...new Set(guiasProntas.map(g => g.operadora))].sort();

  const handleCriar = async () => {
    if (!clinicaId) return;
    if (selectedGuias.size === 0) { toast.error("Selecione pelo menos uma guia"); return; }
    if (!operadora.trim()) { toast.error("Informe a operadora"); return; }
    if (!competencia) { toast.error("Informe a competência"); return; }

    setSaving(true);
    try {
      const guiasSelecionadas = guiasProntas.filter(g => selectedGuias.has(g.id));
      const valorTotal = guiasSelecionadas.reduce((sum, g) => sum + Number(g.valor_total), 0);

      const { data: lote, error: loteError } = await supabase
        .from("tiss_lotes")
        .insert({ clinica_id: clinicaId, operadora, competencia, status: "aberto", valor_total: valorTotal, qtd_guias: guiasSelecionadas.length })
        .select("id")
        .single();
      if (loteError) throw loteError;

      const { error: itensError } = await supabase
        .from("tiss_lote_itens")
        .insert(guiasSelecionadas.map(g => ({ lote_id: lote.id, guia_id: g.id })));
      if (itensError) throw itensError;

      await supabase.from("tiss_guias").update({ status: "em_lote" }).in("id", guiasSelecionadas.map(g => g.id));

      const consultaIds = guiasSelecionadas.map(g => g.consulta_id).filter(Boolean);
      if (consultaIds.length > 0) {
        await supabase.from("consultas").update({ status_faturamento: "em_lote" }).in("id", consultaIds);
      }

      toast.success(`Lote criado com ${guiasSelecionadas.length} guia(s)!`);
      setCriarOpen(false);
      fetchLotes();
    } catch (err: any) {
      toast.error(`Erro ao criar lote: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getStatus = (s: string) => LOTE_STATUS_MAP[s] || { label: s, variant: "secondary" as const };

  // Derived filter options
  const loteOperadoras = [...new Set(lotes.map(l => l.operadora))].sort();

  const filteredLotes = lotes.filter(l => {
    if (search.trim() && !(
      l.numero_lote?.toLowerCase().includes(search.toLowerCase()) ||
      l.operadora?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    if (statusFilter !== "todos" && l.status !== statusFilter) return false;
    if (operadoraFilter !== "todos" && l.operadora !== operadoraFilter) return false;
    if (competenciaFilter && l.competencia !== competenciaFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Lotes TISS</h2>
          <p className="text-muted-foreground">Agrupe guias em lotes para envio às operadoras</p>
        </div>
        <Button onClick={openCriar}><Plus className="w-4 h-4 mr-2" />Novo Lote</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" />Lotes Criados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar lote..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(LOTE_STATUS_MAP).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={operadoraFilter} onValueChange={setOperadoraFilter}>
              <SelectTrigger><SelectValue placeholder="Operadora" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas operadoras</SelectItem>
                {loteOperadoras.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="month" value={competenciaFilter} onChange={e => setCompetenciaFilter(e.target.value)} placeholder="Competência" />
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredLotes.length > 0 ? (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Lote</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead className="text-center">Guias</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLotes.map(l => {
                    const st = getStatus(l.status);
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-sm">{l.numero_lote}</TableCell>
                        <TableCell>{l.operadora}</TableCell>
                        <TableCell>{l.competencia}</TableCell>
                        <TableCell className="text-center">{l.qtd_guias}</TableCell>
                        <TableCell className="text-right">R$ {Number(l.valor_total).toFixed(2).replace(".", ",")}</TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell className="text-sm">{new Date(l.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setDetalheLote(l)}><Eye className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum lote encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Lote Modal */}
      <Dialog open={criarOpen} onOpenChange={setCriarOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layers className="w-5 h-5" />Criar Lote TISS</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operadora *</Label>
                  {operadorasDisponiveis.length > 0 ? (
                    <Select value={operadora} onValueChange={setOperadora}>
                      <SelectTrigger><SelectValue placeholder="Selecione a operadora" /></SelectTrigger>
                      <SelectContent>
                        {operadorasDisponiveis.map(op => (<SelectItem key={op} value={op}>{op}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={operadora} onChange={e => setOperadora(e.target.value)} placeholder="Nome da operadora" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Competência (Mês/Ano) *</Label>
                  <Input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Guias Prontas</Label>
                  <span className="text-sm text-muted-foreground">
                    {selectedGuias.size} selecionada(s) · R$ {selectedValorTotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                {loadingGuias ? (
                  <p className="text-center text-muted-foreground py-4">Carregando guias...</p>
                ) : filteredGuiasModal.length > 0 ? (
                  <div className="border rounded-lg overflow-auto max-h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox checked={filteredGuiasModal.length > 0 && selectedGuias.size === filteredGuiasModal.length} onCheckedChange={toggleAll} />
                          </TableHead>
                          <TableHead>Nº Guia</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Operadora</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGuiasModal.map(g => (
                          <TableRow key={g.id} className="cursor-pointer" onClick={() => toggleGuia(g.id)}>
                            <TableCell><Checkbox checked={selectedGuias.has(g.id)} onCheckedChange={() => toggleGuia(g.id)} /></TableCell>
                            <TableCell className="font-mono text-sm">{g.numero_guia}</TableCell>
                            <TableCell>{g.paciente_nome || "—"}</TableCell>
                            <TableCell>{g.operadora}</TableCell>
                            <TableCell className="text-sm">{new Date(g.data_emissao).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="text-right">R$ {Number(g.valor_total).toFixed(2).replace(".", ",")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6">Nenhuma guia pronta disponível{operadora ? ` para "${operadora}"` : ""}.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCriarOpen(false)}>Cancelar</Button>
                <Button onClick={handleCriar} disabled={saving || selectedGuias.size === 0 || !operadora.trim()}>
                  {saving ? "Criando..." : `Criar Lote (${selectedGuias.size} guias)`}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Detalhes Lote Modal */}
      <Dialog open={!!detalheLote} onOpenChange={() => setDetalheLote(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Lote {detalheLote?.numero_lote}</DialogTitle></DialogHeader>
          {detalheLote && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Operadora:</span> <span className="font-medium">{detalheLote.operadora}</span></div>
              <div><span className="text-muted-foreground">Competência:</span> <span className="font-medium">{detalheLote.competencia}</span></div>
              <div><span className="text-muted-foreground">Guias:</span> <span className="font-medium">{detalheLote.qtd_guias}</span></div>
              <div><span className="text-muted-foreground">Valor:</span> <span className="font-medium">R$ {Number(detalheLote.valor_total).toFixed(2).replace(".", ",")}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={getStatus(detalheLote.status).variant}>{getStatus(detalheLote.status).label}</Badge></div>
              <div><span className="text-muted-foreground">Criado:</span> {new Date(detalheLote.created_at).toLocaleDateString("pt-BR")}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
