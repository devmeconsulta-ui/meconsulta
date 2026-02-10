import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Search, Download, AlertCircle, CheckCircle2, XCircle, Pencil, Check, X } from "lucide-react";
import * as XLSX from "xlsx";

interface TussProcedimento {
  id?: string;
  codigo_tuss: string;
  descricao: string;
  tipo: string;
  sexo: string;
  idade_min: number | null;
  idade_max: number | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  valor_referencia: number | null;
}

interface ImportLog {
  type: "success" | "error" | "info";
  message: string;
}

interface ColumnMapping {
  codigo_tuss: string;
  descricao: string;
  tipo: string;
  sexo: string;
  idade_min: string;
  idade_max: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  valor_referencia: string;
}

const defaultMapping: ColumnMapping = {
  codigo_tuss: "",
  descricao: "",
  tipo: "",
  sexo: "",
  idade_min: "",
  idade_max: "",
  vigencia_inicio: "",
  vigencia_fim: "",
  valor_referencia: "",
};

const fieldLabels: Record<keyof ColumnMapping, string> = {
  codigo_tuss: "Código TUSS *",
  descricao: "Descrição",
  tipo: "Tipo",
  sexo: "Sexo",
  idade_min: "Idade Mínima",
  idade_max: "Idade Máxima",
  vigencia_inicio: "Vigência Início",
  vigencia_fim: "Vigência Fim",
  valor_referencia: "Valor Referência",
};

export default function ClinicaTUSS() {
  const [procedimentos, setProcedimentos] = useState<TussProcedimento[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchCodigo, setSearchCodigo] = useState("");
  const [searchDescricao, setSearchDescricao] = useState("");
  const [searchTipo, setSearchTipo] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Import state
  const [fileData, setFileData] = useState<Record<string, unknown>[]>([]);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(defaultMapping);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [showImport, setShowImport] = useState(false);

  // Available tipos for filter
  const [tiposDisponiveis, setTiposDisponiveis] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load distinct tipos for filter
  useEffect(() => {
    supabase
      .from("tuss_procedimentos")
      .select("tipo")
      .not("tipo", "is", null)
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((d) => d.tipo).filter(Boolean))] as string[];
          setTiposDisponiveis(unique.sort());
        }
      });
  }, [procedimentos.length]);

  // Search
  const handleSearch = useCallback(async (pageNum = 0) => {
    setSearchLoading(true);
    try {
      let query = supabase
        .from("tuss_procedimentos")
        .select("*", { count: "exact" })
        .order("codigo_tuss")
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (searchCodigo.trim()) {
        query = query.ilike("codigo_tuss", `%${searchCodigo.trim()}%`);
      }
      if (searchDescricao.trim()) {
        query = query.ilike("descricao", `%${searchDescricao.trim()}%`);
      }
      if (searchTipo && searchTipo !== "todos") {
        query = query.eq("tipo", searchTipo);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setProcedimentos((data || []) as TussProcedimento[]);
      setTotalCount(count || 0);
      setPage(pageNum);
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Erro ao buscar procedimentos");
    } finally {
      setSearchLoading(false);
    }
  }, [searchCodigo, searchDescricao, searchTipo]);

  // Auto-search on mount
  useEffect(() => {
    handleSearch(0);
  }, []);

  // Inline edit handlers
  const startEdit = (proc: TussProcedimento) => {
    setEditingId(proc.id || null);
    setEditValue(proc.valor_referencia != null ? String(proc.valor_referencia).replace(".", ",") : "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const parsed = parseFloat(editValue.replace(",", "."));
    const newVal = isNaN(parsed) ? null : parsed;

    try {
      const { error } = await supabase
        .from("tuss_procedimentos")
        .update({ valor_referencia: newVal })
        .eq("id", editingId);
      if (error) throw error;

      setProcedimentos((prev) =>
        prev.map((p) => (p.id === editingId ? { ...p, valor_referencia: newVal } : p))
      );
      toast.success("Valor atualizado");
    } catch {
      toast.error("Erro ao salvar valor");
    } finally {
      setEditingId(null);
      setEditValue("");
    }
  };

  // Format age range
  const formatIdade = (min: number | null, max: number | null) => {
    if (min == null && max == null) return "—";
    if (min != null && max != null) return `${min}–${max} anos`;
    if (min != null) return `≥ ${min} anos`;
    return `≤ ${max} anos`;
  };

  // Format vigencia
  const formatVigencia = (inicio: string | null, fim: string | null) => {
    if (!inicio && !fim) return "—";
    const fmtDate = (d: string) => {
      try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
    };
    if (inicio && fim) return `${fmtDate(inicio)} a ${fmtDate(fim)}`;
    if (inicio) return `A partir de ${fmtDate(inicio)}`;
    return `Até ${fmtDate(fim!)}`;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ---- Import logic (unchanged) ----
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
        if (jsonData.length === 0) { toast.error("Arquivo vazio"); return; }
        const columns = Object.keys(jsonData[0]);
        setFileColumns(columns);
        setFileData(jsonData);
        const newMapping = { ...defaultMapping };
        for (const key of Object.keys(newMapping) as (keyof ColumnMapping)[]) {
          const match = columns.find((col) => col.toLowerCase().replace(/[_\\s-]/g, "").includes(key.replace(/_/g, "")) || col.toLowerCase().includes(key.replace(/_/g, " ")));
          if (match) newMapping[key] = match;
        }
        const codigoMatch = columns.find(c => /c[oó]digo|cod_tuss|codigo_tuss|tuss/i.test(c));
        if (codigoMatch && !newMapping.codigo_tuss) newMapping.codigo_tuss = codigoMatch;
        const descMatch = columns.find(c => /descri[cç][aã]o|descricao|procedimento|nome/i.test(c));
        if (descMatch && !newMapping.descricao) newMapping.descricao = descMatch;
        setMapping(newMapping);
        setShowImport(true);
        setImportLogs([{ type: "info", message: `Arquivo carregado: ${jsonData.length} linhas encontradas` }]);
        toast.success(`${jsonData.length} linhas carregadas do arquivo`);
      } catch (err) {
        console.error("Error parsing file:", err);
        toast.error("Erro ao ler arquivo. Verifique o formato CSV/Excel.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!mapping.codigo_tuss) { toast.error("Mapeie pelo menos a coluna 'Código TUSS'"); return; }
    setImporting(true);
    setImportProgress(0);
    const logs: ImportLog[] = [];
    let successCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 100;
    const totalRows = fileData.length;
    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = fileData.slice(i, i + BATCH_SIZE);
      const rows = batch.map((row) => ({
        codigo_tuss: String(row[mapping.codigo_tuss] || "").trim(),
        descricao: mapping.descricao ? String(row[mapping.descricao] || "").trim() : null,
        tipo: mapping.tipo ? String(row[mapping.tipo] || "").trim() : null,
        sexo: mapping.sexo ? String(row[mapping.sexo] || "").trim() : null,
        idade_min: mapping.idade_min ? Number(row[mapping.idade_min]) || null : null,
        idade_max: mapping.idade_max ? Number(row[mapping.idade_max]) || null : null,
        vigencia_inicio: mapping.vigencia_inicio ? String(row[mapping.vigencia_inicio] || "") || null : null,
        vigencia_fim: mapping.vigencia_fim ? String(row[mapping.vigencia_fim] || "") || null : null,
        valor_referencia: mapping.valor_referencia ? Number(String(row[mapping.valor_referencia] || "0").replace(",", ".")) || null : null,
      })).filter(r => r.codigo_tuss);
      if (rows.length === 0) continue;
      const { error } = await supabase.from("tuss_procedimentos").insert(rows);
      if (error) { errorCount += rows.length; logs.push({ type: "error", message: `Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}` }); }
      else { successCount += rows.length; }
      setImportProgress(Math.round(((i + batch.length) / totalRows) * 100));
    }
    logs.push({ type: "success", message: `✅ ${successCount} procedimentos importados com sucesso` });
    if (errorCount > 0) logs.push({ type: "error", message: `❌ ${errorCount} linhas com erro` });
    setImportLogs(logs);
    setImporting(false);
    setImportProgress(100);
    if (successCount > 0) { toast.success(`${successCount} procedimentos importados!`); handleSearch(0); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">TUSS Procedimentos</h2>
          <p className="text-muted-foreground">
            Consulte, filtre e edite valores da base TUSS importada
          </p>
        </div>
        <Button variant="outline" onClick={() => { setShowImport(!showImport); setImportLogs([]); }}>
          <Upload className="w-4 h-4 mr-2" />
          Importar Base TUSS
        </Button>
      </div>

      {/* Import Section */}
      {showImport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Importar CSV/Excel
            </CardTitle>
            <CardDescription>Faça upload do arquivo TUSS e mapeie as colunas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Selecionar Arquivo
              </Button>
              {fileData.length > 0 && <Badge variant="secondary">{fileData.length} linhas carregadas</Badge>}
            </div>

            {fileColumns.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Mapeamento de Colunas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.keys(fieldLabels) as (keyof ColumnMapping)[]).map((field) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">{fieldLabels[field]}</Label>
                      <Select value={mapping[field] || "none"} onValueChange={(v) => setMapping((prev) => ({ ...prev, [field]: v === "none" ? "" : v }))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Não mapear —</SelectItem>
                          {fileColumns.map((col) => (<SelectItem key={col} value={col}>{col}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {fileData.length > 0 && (
                  <div className="border rounded-lg overflow-auto max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Código</TableHead>
                          <TableHead className="text-xs">Descrição</TableHead>
                          <TableHead className="text-xs">Tipo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fileData.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{mapping.codigo_tuss ? String(row[mapping.codigo_tuss] || "") : "—"}</TableCell>
                            <TableCell className="text-xs truncate max-w-[200px]">{mapping.descricao ? String(row[mapping.descricao] || "") : "—"}</TableCell>
                            <TableCell className="text-xs">{mapping.tipo ? String(row[mapping.tipo] || "") : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Button onClick={handleImport} disabled={importing || !mapping.codigo_tuss}>
                    <Upload className="w-4 h-4 mr-2" />
                    {importing ? "Importando..." : `Importar ${fileData.length} registros`}
                  </Button>
                </div>

                {importing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} />
                    <p className="text-xs text-muted-foreground">{importProgress}% concluído</p>
                  </div>
                )}

                {importLogs.length > 0 && (
                  <div className="space-y-1 p-3 bg-muted/50 rounded-lg max-h-32 overflow-auto">
                    {importLogs.map((log, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {log.type === "success" && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                        {log.type === "error" && <XCircle className="w-3 h-3 text-destructive" />}
                        {log.type === "info" && <AlertCircle className="w-3 h-3 text-primary" />}
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters & Results */}
      <Card>
        <CardHeader>
          <CardTitle>Procedimentos TUSS</CardTitle>
          <CardDescription>
            {totalCount > 0 ? `${totalCount} procedimentos cadastrados` : "Nenhum procedimento cadastrado. Importe a base TUSS."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por código..."
                value={searchCodigo}
                onChange={(e) => setSearchCodigo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(0)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por descrição..."
                value={searchDescricao}
                onChange={(e) => setSearchDescricao(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(0)}
                className="pl-10"
              />
            </div>
            <Select value={searchTipo} onValueChange={(v) => setSearchTipo(v)}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tiposDisponiveis.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => handleSearch(0)} disabled={searchLoading}>
              {searchLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {/* Table */}
          {procedimentos.length > 0 && (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>Faixa de Idade</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead className="text-right">Valor Ref.</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procedimentos.map((proc) => (
                    <TableRow key={proc.id}>
                      <TableCell className="font-mono text-sm">{proc.codigo_tuss}</TableCell>
                      <TableCell className="max-w-[280px] truncate" title={proc.descricao || ""}>{proc.descricao || "—"}</TableCell>
                      <TableCell>
                        {proc.tipo ? <Badge variant="outline">{proc.tipo}</Badge> : "—"}
                      </TableCell>
                      <TableCell>{proc.sexo || "—"}</TableCell>
                      <TableCell className="text-sm">{formatIdade(proc.idade_min, proc.idade_max)}</TableCell>
                      <TableCell className="text-sm">{formatVigencia(proc.vigencia_inicio, proc.vigencia_fim)}</TableCell>
                      <TableCell className="text-right">
                        {editingId === proc.id ? (
                          <Input
                            className="h-8 w-28 text-right text-sm ml-auto"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                            autoFocus
                            placeholder="0,00"
                          />
                        ) : (
                          proc.valor_referencia != null
                            ? `R$ ${Number(proc.valor_referencia).toFixed(2).replace(".", ",")}`
                            : "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === proc.id ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                              <Check className="w-4 h-4 text-emerald-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(proc)} title="Editar valor de referência">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Página {page + 1} de {totalPages} ({totalCount} resultados)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => handleSearch(page - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => handleSearch(page + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
