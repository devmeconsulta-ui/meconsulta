import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, AlertCircle, Search, Plus, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CriarGuiaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
  onCreated: () => void;
}

interface ConsultaDisponivel {
  id: string;
  data_hora: string;
  paciente_id: string | null;
  medico_id: string | null;
  valor_consulta: number;
  nome_paciente_consulta: string | null;
  paciente_nome?: string;
  medico_nome?: string;
  medico_crm?: string;
  convenio_nome?: string;
}

interface ItemGuia {
  codigo_tuss: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  especie: string;
}

interface TussProc {
  id: string;
  codigo_tuss: string;
  descricao: string;
  valor_referencia: number | null;
}

export default function CriarGuiaModal({ open, onOpenChange, clinicaId, onCreated }: CriarGuiaModalProps) {
  const [step, setStep] = useState<"select" | "form">("select");
  const [consultas, setConsultas] = useState<ConsultaDisponivel[]>([]);
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState<ConsultaDisponivel | null>(null);

  // Form fields
  const [operadora, setOperadora] = useState("");
  const [plano, setPlano] = useState("");
  const [carteirinha, setCarteirinha] = useState("");
  const [crm, setCrm] = useState("");
  const [crmUf, setCrmUf] = useState("");

  // Items
  const [itens, setItens] = useState<ItemGuia[]>([]);
  const [tussSearch, setTussSearch] = useState("");
  const [tussResults, setTussResults] = useState<TussProc[]>([]);
  const [searchingTuss, setSearchingTuss] = useState(false);

  const [saving, setSaving] = useState(false);

  // Fetch unfactured consultations
  const fetchConsultas = useCallback(async () => {
    if (!clinicaId) return;
    setLoadingConsultas(true);
    try {
      const { data, error } = await supabase
        .from("consultas")
        .select("id, data_hora, paciente_id, medico_id, valor_consulta, nome_paciente_consulta, convenio_id, status_faturamento")
        .eq("clinica_id", clinicaId)
        .eq("status_consulta", "atendida")
        .eq("status_faturamento", "nao_faturado")
        .order("data_hora", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrich with names
      const enriched: ConsultaDisponivel[] = [];
      for (const c of data || []) {
        let paciente_nome = c.nome_paciente_consulta || "";
        let medico_nome = "";
        let medico_crm = "";
        let convenio_nome = "";

        if (c.paciente_id && !paciente_nome) {
          const { data: pac } = await supabase.from("pacientes").select("nome").eq("id", c.paciente_id).single();
          paciente_nome = pac?.nome || "";
        }
        if (c.medico_id) {
          const { data: med } = await supabase.from("medicos").select("nome, crm").eq("id", c.medico_id).single();
          medico_nome = med?.nome || "";
          medico_crm = med?.crm || "";
        }
        if (c.convenio_id) {
          const { data: conv } = await supabase.from("convenios").select("nome").eq("id", c.convenio_id).single();
          convenio_nome = conv?.nome || "";
        }

        enriched.push({
          ...c,
          paciente_nome,
          medico_nome,
          medico_crm,
          convenio_nome,
        });
      }

      setConsultas(enriched);
    } catch (err) {
      console.error("Error fetching consultas:", err);
      toast.error("Erro ao carregar consultas");
    } finally {
      setLoadingConsultas(false);
    }
  }, [clinicaId]);

  useEffect(() => {
    if (open) {
      setStep("select");
      setSelectedConsulta(null);
      setItens([]);
      setOperadora("");
      setPlano("");
      setCarteirinha("");
      setCrm("");
      setCrmUf("");
      setTussSearch("");
      setTussResults([]);
      fetchConsultas();
    }
  }, [open, fetchConsultas]);

  // Select consultation and pre-fill
  const selectConsulta = (c: ConsultaDisponivel) => {
    setSelectedConsulta(c);
    setCrm(c.medico_crm || "");
    if (c.convenio_nome) setOperadora(c.convenio_nome);
    setStep("form");
  };

  // Search TUSS procedures
  const searchTuss = async () => {
    if (!tussSearch.trim()) return;
    setSearchingTuss(true);
    try {
      const { data, error } = await supabase
        .from("tuss_procedimentos")
        .select("id, codigo_tuss, descricao, valor_referencia")
        .or(`codigo_tuss.ilike.%${tussSearch}%,descricao.ilike.%${tussSearch}%`)
        .limit(10);
      if (error) throw error;
      setTussResults((data || []) as TussProc[]);
    } catch {
      toast.error("Erro ao buscar procedimentos TUSS");
    } finally {
      setSearchingTuss(false);
    }
  };

  const addItem = (proc: TussProc) => {
    const valor = proc.valor_referencia || selectedConsulta?.valor_consulta || 0;
    setItens(prev => [...prev, {
      codigo_tuss: proc.codigo_tuss,
      descricao: proc.descricao || "",
      quantidade: 1,
      valor_unitario: valor,
      especie: "1", // Espécie padrão TISS para consulta
    }]);
    setTussSearch("");
    setTussResults([]);
  };

  const removeItem = (index: number) => {
    setItens(prev => prev.filter((_, i) => i !== index));
  };

  const valorTotal = itens.reduce((sum, i) => sum + i.quantidade * i.valor_unitario, 0);

  // Save guia
  const handleSave = async () => {
    if (!selectedConsulta || !clinicaId) return;
    if (!operadora.trim()) { toast.error("Informe a operadora"); return; }
    if (itens.length === 0) { toast.error("Adicione pelo menos um procedimento"); return; }

    setSaving(true);
    try {
      // 1. Create guia
      const { data: guia, error: guiaError } = await supabase
        .from("tiss_guias")
        .insert({
          clinica_id: clinicaId,
          consulta_id: selectedConsulta.id,
          paciente_id: selectedConsulta.paciente_id,
          medico_id: selectedConsulta.medico_id,
          operadora,
          plano: plano || null,
          carteirinha: carteirinha || null,
          crm: crm || null,
          crm_uf: crmUf || null,
          tipo_guia: "consulta",
          status: "pronta",
          valor_total: valorTotal,
        })
        .select("id")
        .single();

      if (guiaError) throw guiaError;

      // 2. Insert itens
      const { error: itensError } = await supabase
        .from("tiss_guia_itens")
        .insert(itens.map(i => ({
          guia_id: guia.id,
          codigo_tuss: i.codigo_tuss,
          descricao: i.descricao,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
          valor_total: i.quantidade * i.valor_unitario,
          especie: i.especie,
        })));

      if (itensError) throw itensError;

      // 3. Update consulta status_faturamento
      const { error: updateError } = await supabase
        .from("consultas")
        .update({ status_faturamento: "em_guia" })
        .eq("id", selectedConsulta.id);

      if (updateError) throw updateError;

      toast.success("Guia TISS criada com sucesso!");
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      console.error("Error creating guia:", err);
      toast.error(`Erro ao criar guia: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            {step === "select" ? "Selecionar Consulta" : "Criar Guia TISS"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {step === "select" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione uma consulta atendida e não faturada para criar a guia TISS:
              </p>

              {loadingConsultas ? (
                <p className="text-center text-muted-foreground py-4">Carregando consultas...</p>
              ) : consultas.length > 0 ? (
                <div className="border rounded-lg overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Médico</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consultas.map(c => (
                        <TableRow key={c.id} className="cursor-pointer" onClick={() => selectConsulta(c)}>
                          <TableCell className="text-sm">{new Date(c.data_hora).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{c.paciente_nome || "—"}</TableCell>
                          <TableCell>{c.medico_nome || "—"}</TableCell>
                          <TableCell>{c.convenio_nome || "—"}</TableCell>
                          <TableCell className="text-right">R$ {c.valor_consulta.toFixed(2).replace(".", ",")}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); selectConsulta(c); }}>
                              Selecionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhuma consulta atendida pendente de faturamento.</p>
                </div>
              )}
            </div>
          )}

          {step === "form" && selectedConsulta && (
            <div className="space-y-5">
              {/* Consulta info */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Paciente:</span> <span className="font-medium">{selectedConsulta.paciente_nome}</span></div>
                    <div><span className="text-muted-foreground">Médico:</span> <span className="font-medium">{selectedConsulta.medico_nome}</span></div>
                    <div><span className="text-muted-foreground">Data:</span> {new Date(selectedConsulta.data_hora).toLocaleDateString("pt-BR")}</div>
                    <div><span className="text-muted-foreground">Valor consulta:</span> R$ {selectedConsulta.valor_consulta.toFixed(2).replace(".", ",")}</div>
                  </div>
                  <Button variant="link" size="sm" className="px-0 mt-1" onClick={() => setStep("select")}>← Trocar consulta</Button>
                </CardContent>
              </Card>

              {/* Guia fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operadora *</Label>
                  <Input value={operadora} onChange={e => setOperadora(e.target.value)} placeholder="Ex: Unimed, Bradesco..." />
                </div>
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Input value={plano} onChange={e => setPlano(e.target.value)} placeholder="Nome do plano" />
                </div>
                <div className="space-y-2">
                  <Label>Carteirinha</Label>
                  <Input value={carteirinha} onChange={e => setCarteirinha(e.target.value)} placeholder="Nº da carteirinha" />
                </div>
                <div className="space-y-2 grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>CRM</Label>
                    <Input value={crm} onChange={e => setCrm(e.target.value)} placeholder="CRM" />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input value={crmUf} onChange={e => setCrmUf(e.target.value.toUpperCase())} placeholder="UF" maxLength={2} />
                  </div>
                </div>
              </div>

              {/* Items - TUSS procedures */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Itens / Procedimentos *</Label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar código ou descrição TUSS..."
                      value={tussSearch}
                      onChange={e => setTussSearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && searchTuss()}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" onClick={searchTuss} disabled={searchingTuss}>
                    {searchingTuss ? "..." : "Buscar"}
                  </Button>
                </div>

                {/* TUSS search results */}
                {tussResults.length > 0 && (
                  <div className="border rounded-lg overflow-auto max-h-40">
                    <Table>
                      <TableBody>
                        {tussResults.map(proc => (
                          <TableRow key={proc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => addItem(proc)}>
                            <TableCell className="font-mono text-xs">{proc.codigo_tuss}</TableCell>
                            <TableCell className="text-xs truncate max-w-[200px]">{proc.descricao}</TableCell>
                            <TableCell className="text-xs text-right">
                              {proc.valor_referencia ? `R$ ${Number(proc.valor_referencia).toFixed(2).replace(".", ",")}` : "—"}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost"><Plus className="w-3 h-3" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Added items */}
                {itens.length > 0 ? (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Código</TableHead>
                          <TableHead className="text-xs">Descrição</TableHead>
                          <TableHead className="text-xs text-center">Qtd</TableHead>
                          <TableHead className="text-xs text-right">Valor Unit.</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                          <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{item.codigo_tuss}</TableCell>
                            <TableCell className="text-xs truncate max-w-[160px]">{item.descricao}</TableCell>
                            <TableCell className="text-center">
                              <Input
                                className="h-7 w-14 text-center text-xs mx-auto"
                                type="number"
                                min={1}
                                value={item.quantidade}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 1;
                                  setItens(prev => prev.map((it, i) => i === idx ? { ...it, quantidade: val } : it));
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                className="h-7 w-24 text-right text-xs ml-auto"
                                value={item.valor_unitario.toFixed(2).replace(".", ",")}
                                onChange={e => {
                                  const val = parseFloat(e.target.value.replace(",", ".")) || 0;
                                  setItens(prev => prev.map((it, i) => i === idx ? { ...it, valor_unitario: val } : it));
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">
                              R$ {(item.quantidade * item.valor_unitario).toFixed(2).replace(".", ",")}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(idx)}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Busque um procedimento TUSS acima e clique para adicionar.
                  </p>
                )}

                {itens.length > 0 && (
                  <div className="flex justify-end text-sm font-semibold">
                    Valor Total: R$ {valorTotal.toFixed(2).replace(".", ",")}
                  </div>
                )}
              </div>

              {/* Save */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving || itens.length === 0 || !operadora.trim()}>
                  {saving ? "Salvando..." : "Salvar Guia"}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
