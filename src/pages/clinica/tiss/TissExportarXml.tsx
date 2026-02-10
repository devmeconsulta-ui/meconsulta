import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCode, Download, CheckCircle2, AlertTriangle, Loader2, Eye, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import TissPendenciasChecklist, { type TissPendencia } from "@/components/clinica/tiss/TissPendenciasChecklist";
import {
  generateTissXml,
  validateTissLote,
  validateXmlStructure,
  type TissLoteData,
  type TissGuiaData,
  type TissGuiaItemData,
  type ValidationError,
} from "@/lib/tissXmlGenerator";

interface LoteOption {
  id: string;
  numero_lote: string;
  operadora: string;
  competencia: string;
  status: string;
  qtd_guias: number;
  valor_total: number;
}

interface ExportResult {
  loteId: string;
  numeroLote: string;
  operadora: string;
  xmlContent: string;
  errors: ValidationError[];
  valid: boolean;
  createdAt: string;
}

export default function TissExportarXml() {
  const { currentUser } = useAuth();
  const clinicaId = currentUser?.clinicaId;

  const [lotes, setLotes] = useState<LoteOption[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportResults, setExportResults] = useState<ExportResult[]>([]);
  const [previewResult, setPreviewResult] = useState<ExportResult | null>(null);
  const [checklistValid, setChecklistValid] = useState(false);

  const handleChecklistChange = useCallback((isValid: boolean, _pendencias: TissPendencia[]) => {
    setChecklistValid(isValid);
  }, []);

  const fetchLotes = useCallback(async () => {
    if (!clinicaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tiss_lotes")
        .select("id, numero_lote, operadora, competencia, status, qtd_guias, valor_total")
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLotes((data || []) as LoteOption[]);
    } catch {
      toast.error("Erro ao carregar lotes");
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  useEffect(() => { fetchLotes(); }, [fetchLotes]);

  const handleGenerate = async () => {
    if (!selectedLoteId || !clinicaId) {
      toast.error("Selecione um lote");
      return;
    }

    setGenerating(true);
    try {
      // Fetch lote
      const { data: lote } = await supabase
        .from("tiss_lotes")
        .select("*")
        .eq("id", selectedLoteId)
        .single();
      if (!lote) throw new Error("Lote não encontrado");

      // Fetch clinica
      const { data: clinica } = await supabase
        .from("clinicas")
        .select("nome_fantasia, cnpj")
        .eq("id", clinicaId)
        .single();

      // Fetch lote items -> guia ids
      const { data: itens } = await supabase
        .from("tiss_lote_itens")
        .select("guia_id")
        .eq("lote_id", selectedLoteId);

      const guiaIds = (itens || []).map((i) => i.guia_id);

      if (guiaIds.length === 0) {
        toast.error("Lote sem guias vinculadas");
        setGenerating(false);
        return;
      }

      // Fetch guias
      const { data: guias } = await supabase
        .from("tiss_guias")
        .select("*")
        .in("id", guiaIds);

      // Fetch guia items for all guias
      const { data: guiaItens } = await supabase
        .from("tiss_guia_itens")
        .select("*")
        .in("guia_id", guiaIds);

      // Enrich with paciente/medico names
      const guiasData: TissGuiaData[] = [];
      for (const g of guias || []) {
        let paciente_nome = "";
        let paciente_cpf = "";
        let medico_nome = "";

        if (g.paciente_id) {
          const { data: pac } = await supabase.from("pacientes").select("nome, cpf").eq("id", g.paciente_id).single();
          paciente_nome = pac?.nome || "";
          paciente_cpf = pac?.cpf || "";
        }
        if (g.medico_id) {
          const { data: med } = await supabase.from("medicos").select("nome").eq("id", g.medico_id).single();
          medico_nome = med?.nome || "";
        }

        const items: TissGuiaItemData[] = (guiaItens || [])
          .filter((gi) => gi.guia_id === g.id)
          .map((gi) => ({
            codigo_tuss: gi.codigo_tuss,
            descricao: gi.descricao,
            quantidade: gi.quantidade,
            valor_unitario: gi.valor_unitario,
            valor_total: gi.valor_total,
            especie: gi.especie,
          }));

        guiasData.push({
          numero_guia: g.numero_guia,
          operadora: g.operadora,
          plano: g.plano,
          carteirinha: g.carteirinha,
          crm: g.crm,
          crm_uf: g.crm_uf,
          tipo_guia: g.tipo_guia,
          data_emissao: g.data_emissao,
          valor_total: Number(g.valor_total),
          paciente_nome,
          paciente_cpf,
          medico_nome,
          itens: items,
        });
      }

      const loteData: TissLoteData = {
        numero_lote: lote.numero_lote,
        operadora: lote.operadora,
        competencia: lote.competencia,
        clinica_cnpj: clinica?.cnpj || null,
        clinica_nome: clinica?.nome_fantasia || "Clínica",
        created_at: lote.created_at,
        guias: guiasData,
      };

      // Step 1: Validate data
      const dataErrors = validateTissLote(loteData);

      // Step 2: Generate XML
      let xmlContent = "";
      let xmlErrors: ValidationError[] = [];
      if (dataErrors.length === 0) {
        xmlContent = generateTissXml(loteData);
        xmlErrors = validateXmlStructure(xmlContent);
      }

      const allErrors = [...dataErrors, ...xmlErrors];
      const result: ExportResult = {
        loteId: selectedLoteId,
        numeroLote: lote.numero_lote,
        operadora: lote.operadora,
        xmlContent,
        errors: allErrors,
        valid: allErrors.length === 0,
        createdAt: new Date().toISOString(),
      };

      setExportResults((prev) => [result, ...prev]);

      if (result.valid) {
        toast.success("XML gerado e validado com sucesso!");
      } else {
        toast.error(`Validação falhou com ${allErrors.length} erro(s)`);
      }
    } catch (err: any) {
      toast.error(`Erro ao gerar XML: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const downloadXml = (result: ExportResult) => {
    const blob = new Blob([result.xmlContent], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TISS_${result.numeroLote}_${result.operadora.replace(/\s/g, "_")}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download iniciado");
  };

  const selectedLote = lotes.find((l) => l.id === selectedLoteId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Exportar XML TISS</h2>
        <p className="text-muted-foreground">Gere arquivos XML no padrão TISS 4.01.00 para envio às operadoras</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileCode className="w-5 h-5" />Gerar Exportação</CardTitle>
          <CardDescription>Selecione um lote para gerar o XML com validação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Lote TISS</Label>
              <Select value={selectedLoteId} onValueChange={(v) => { setSelectedLoteId(v); setChecklistValid(false); }}>
                <SelectTrigger><SelectValue placeholder="Selecione um lote..." /></SelectTrigger>
                <SelectContent>
                  {lotes.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhum lote disponível</SelectItem>
                  ) : (
                    lotes.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.numero_lote} — {l.operadora} — {l.qtd_guias} guia(s) — R$ {Number(l.valor_total).toFixed(2).replace(".", ",")} — {l.status}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleGenerate} className="w-full" disabled={generating || !selectedLoteId || !checklistValid}>
                {!checklistValid && selectedLoteId && <Lock className="w-4 h-4 mr-2" />}
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                ) : (
                  <><FileCode className="w-4 h-4 mr-2" />Gerar XML</>
                )}
              </Button>
            </div>
          </div>

          {selectedLote && (
            <div className="rounded-lg border p-3 bg-muted/30 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
              <div><span className="text-muted-foreground">Lote:</span> <span className="font-medium">{selectedLote.numero_lote}</span></div>
              <div><span className="text-muted-foreground">Operadora:</span> <span className="font-medium">{selectedLote.operadora}</span></div>
              <div><span className="text-muted-foreground">Guias:</span> <span className="font-medium">{selectedLote.qtd_guias}</span></div>
              <div><span className="text-muted-foreground">Valor:</span> <span className="font-medium">R$ {Number(selectedLote.valor_total).toFixed(2).replace(".", ",")}</span></div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLoteId && clinicaId && (
        <TissPendenciasChecklist
          clinicaId={clinicaId}
          loteId={selectedLoteId}
          onValidationChange={handleChecklistChange}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Resultados de Exportação</CardTitle>
        </CardHeader>
        <CardContent>
          {exportResults.length > 0 ? (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Gerado em</TableHead>
                    <TableHead>Validação</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportResults.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{r.numeroLote}</TableCell>
                      <TableCell>{r.operadora}</TableCell>
                      <TableCell className="text-sm">{new Date(r.createdAt).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        {r.valid ? (
                          <Badge variant="default" className="bg-primary hover:bg-primary/90">
                            <CheckCircle2 className="w-3 h-3 mr-1" />Válido
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />{r.errors.length} erro(s)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPreviewResult(r)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {r.valid && (
                          <Button variant="ghost" size="icon" onClick={() => downloadXml(r)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <FileCode className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhuma exportação realizada.</p>
              <p className="text-xs text-muted-foreground">Selecione um lote acima e clique em "Gerar XML".</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview / Errors Modal */}
      <Dialog open={!!previewResult} onOpenChange={() => setPreviewResult(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewResult?.valid ? (
                <><CheckCircle2 className="w-5 h-5 text-primary" />XML Válido — {previewResult.numeroLote}</>
              ) : (
                <><AlertTriangle className="w-5 h-5 text-destructive" />Erros de Validação — {previewResult?.numeroLote}</>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            {previewResult && !previewResult.valid && (
              <div className="space-y-2 mb-4">
                <Label className="text-base font-semibold text-destructive">Erros encontrados ({previewResult.errors.length})</Label>
                <div className="border border-destructive/30 rounded-lg divide-y divide-destructive/20">
                  {previewResult.errors.map((err, idx) => (
                    <div key={idx} className="p-3 text-sm flex gap-3">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{err.message}</span>
                        {err.guia && <span className="text-muted-foreground ml-2">({err.guia})</span>}
                        <span className="text-muted-foreground ml-2 text-xs">Campo: {err.field}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewResult?.xmlContent && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Prévia do XML</Label>
                <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto max-h-[400px] whitespace-pre-wrap font-mono">
                  {previewResult.xmlContent}
                </pre>
              </div>
            )}

            {previewResult?.valid && (
              <div className="flex justify-end pt-4">
                <Button onClick={() => downloadXml(previewResult)}>
                  <Download className="w-4 h-4 mr-2" />Baixar XML
                </Button>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
