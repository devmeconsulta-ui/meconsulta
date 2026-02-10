import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface GuiaRow {
  id: string;
  operadora: string;
  status: string;
  valor_total: number;
  data_emissao: string;
  medico_id: string | null;
  paciente_id: string | null;
}

interface RelatorioData {
  guias: GuiaRow[];
  medicos: Record<string, string>;
  pacientes: Record<string, string>;
}

export default function TissRelatorios() {
  const { currentUser } = useAuth();
  const clinicaId = currentUser?.clinicaId;

  const [data, setData] = useState<RelatorioData>({ guias: [], medicos: {}, pacientes: {} });
  const [loading, setLoading] = useState(false);
  const [operadoraFilter, setOperadoraFilter] = useState("todos");
  const [medicoFilter, setMedicoFilter] = useState("todos");
  const [competenciaFilter, setCompetenciaFilter] = useState("");

  const fetchData = useCallback(async () => {
    if (!clinicaId) return;
    setLoading(true);
    try {
      const { data: guias, error } = await supabase
        .from("tiss_guias")
        .select("id, operadora, status, valor_total, data_emissao, medico_id, paciente_id")
        .eq("clinica_id", clinicaId);
      if (error) throw error;

      const medicoIds = [...new Set((guias || []).map(g => g.medico_id).filter(Boolean))];
      const pacienteIds = [...new Set((guias || []).map(g => g.paciente_id).filter(Boolean))];

      const medicos: Record<string, string> = {};
      const pacientes: Record<string, string> = {};

      if (medicoIds.length > 0) {
        const { data: meds } = await supabase.from("medicos").select("id, nome").in("id", medicoIds as string[]);
        (meds || []).forEach(m => { medicos[m.id] = m.nome; });
      }
      if (pacienteIds.length > 0) {
        const { data: pacs } = await supabase.from("pacientes").select("id, nome").in("id", pacienteIds as string[]);
        (pacs || []).forEach(p => { pacientes[p.id] = p.nome; });
      }

      setData({ guias: (guias || []) as GuiaRow[], medicos, pacientes });
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter guias
  const filteredGuias = useMemo(() => {
    return data.guias.filter(g => {
      if (operadoraFilter !== "todos" && g.operadora !== operadoraFilter) return false;
      if (medicoFilter !== "todos" && g.medico_id !== medicoFilter) return false;
      if (competenciaFilter && g.data_emissao.slice(0, 7) !== competenciaFilter) return false;
      return true;
    });
  }, [data.guias, operadoraFilter, medicoFilter, competenciaFilter]);

  // Computed reports
  const totalFaturado = useMemo(() => {
    return filteredGuias
      .filter(g => !["rascunho", "glosado"].includes(g.status))
      .reduce((sum, g) => sum + Number(g.valor_total), 0);
  }, [filteredGuias]);

  const totalGlosado = useMemo(() => {
    return filteredGuias
      .filter(g => g.status === "glosado")
      .reduce((sum, g) => sum + Number(g.valor_total), 0);
  }, [filteredGuias]);

  const totalRecebido = useMemo(() => {
    return filteredGuias
      .filter(g => g.status === "pago")
      .reduce((sum, g) => sum + Number(g.valor_total), 0);
  }, [filteredGuias]);

  const totalGuias = filteredGuias.length;

  // Por competência
  const porCompetencia = useMemo(() => {
    const map: Record<string, { faturado: number; glosado: number; recebido: number; guias: number }> = {};
    filteredGuias.forEach(g => {
      const comp = g.data_emissao.slice(0, 7);
      if (!map[comp]) map[comp] = { faturado: 0, glosado: 0, recebido: 0, guias: 0 };
      map[comp].guias++;
      const val = Number(g.valor_total);
      if (g.status === "glosado") map[comp].glosado += val;
      else if (g.status === "pago") { map[comp].recebido += val; map[comp].faturado += val; }
      else if (g.status !== "rascunho") map[comp].faturado += val;
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredGuias]);

  // Por operadora
  const porOperadora = useMemo(() => {
    const map: Record<string, { faturado: number; glosado: number; recebido: number; guias: number }> = {};
    filteredGuias.forEach(g => {
      if (!map[g.operadora]) map[g.operadora] = { faturado: 0, glosado: 0, recebido: 0, guias: 0 };
      map[g.operadora].guias++;
      const val = Number(g.valor_total);
      if (g.status === "glosado") map[g.operadora].glosado += val;
      else if (g.status === "pago") { map[g.operadora].recebido += val; map[g.operadora].faturado += val; }
      else if (g.status !== "rascunho") map[g.operadora].faturado += val;
    });
    return Object.entries(map).sort(([, a], [, b]) => b.faturado - a.faturado);
  }, [filteredGuias]);

  const operadoras = [...new Set(data.guias.map(g => g.operadora))].sort();
  const medicosList = Object.entries(data.medicos).sort(([, a], [, b]) => a.localeCompare(b));

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Relatórios TISS</h2>
        <p className="text-muted-foreground">Visão geral de faturamento, glosas e recebimentos</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                {medicosList.map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="month" value={competenciaFilter} onChange={e => setCompetenciaFilter(e.target.value)} placeholder="Competência" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Faturado</p>
                    <p className="text-xl font-bold text-foreground">{fmt(totalFaturado)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Glosado</p>
                    <p className="text-xl font-bold text-foreground">{fmt(totalGlosado)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Recebido</p>
                    <p className="text-xl font-bold text-foreground">{fmt(totalRecebido)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted"><BarChart3 className="w-5 h-5 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Guias</p>
                    <p className="text-xl font-bold text-foreground">{totalGuias}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Por Competência */}
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Competência</CardTitle>
            </CardHeader>
            <CardContent>
              {porCompetencia.length > 0 ? (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Competência</TableHead>
                        <TableHead className="text-center">Guias</TableHead>
                        <TableHead className="text-right">Faturado</TableHead>
                        <TableHead className="text-right">Glosado</TableHead>
                        <TableHead className="text-right">Recebido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {porCompetencia.map(([comp, vals]) => (
                        <TableRow key={comp}>
                          <TableCell className="font-medium">{comp}</TableCell>
                          <TableCell className="text-center">{vals.guias}</TableCell>
                          <TableCell className="text-right">{fmt(vals.faturado)}</TableCell>
                          <TableCell className="text-right">
                            {vals.glosado > 0 ? <span className="text-destructive">{fmt(vals.glosado)}</span> : "—"}
                          </TableCell>
                          <TableCell className="text-right">{fmt(vals.recebido)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6">Sem dados para exibir.</p>
              )}
            </CardContent>
          </Card>

          {/* Por Operadora */}
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Operadora</CardTitle>
            </CardHeader>
            <CardContent>
              {porOperadora.length > 0 ? (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Operadora</TableHead>
                        <TableHead className="text-center">Guias</TableHead>
                        <TableHead className="text-right">Faturado</TableHead>
                        <TableHead className="text-right">Glosado</TableHead>
                        <TableHead className="text-right">Recebido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {porOperadora.map(([op, vals]) => (
                        <TableRow key={op}>
                          <TableCell className="font-medium">{op}</TableCell>
                          <TableCell className="text-center">{vals.guias}</TableCell>
                          <TableCell className="text-right">{fmt(vals.faturado)}</TableCell>
                          <TableCell className="text-right">
                            {vals.glosado > 0 ? <span className="text-destructive">{fmt(vals.glosado)}</span> : "—"}
                          </TableCell>
                          <TableCell className="text-right">{fmt(vals.recebido)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6">Sem dados para exibir.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
