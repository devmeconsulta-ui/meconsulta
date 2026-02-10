import { useState, useRef, useCallback } from "react";
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
import { Upload, FileSpreadsheet, Search, Trash2, Download, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Import state
  const [fileData, setFileData] = useState<Record<string, unknown>[]>([]);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(defaultMapping);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [showImport, setShowImport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search existing procedures
  const handleSearch = useCallback(async () => {
    setSearchLoading(true);
    try {
      let query = supabase
        .from("tuss_procedimentos")
        .select("*", { count: "exact" })
        .order("codigo_tuss")
        .limit(50);

      if (search.trim()) {
        query = query.or(`codigo_tuss.ilike.%${search}%,descricao.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setProcedimentos((data || []) as TussProcedimento[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Erro ao buscar procedimentos");
    } finally {
      setSearchLoading(false);
    }
  }, [search]);

  // Handle file upload
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

        if (jsonData.length === 0) {
          toast.error("Arquivo vazio");
          return;
        }

        const columns = Object.keys(jsonData[0]);
        setFileColumns(columns);
        setFileData(jsonData);

        // Auto-map columns by matching names
        const newMapping = { ...defaultMapping };
        for (const key of Object.keys(newMapping) as (keyof ColumnMapping)[]) {
          const match = columns.find(
            (col) =>
              col.toLowerCase().replace(/[_\s-]/g, "").includes(key.replace(/_/g, "")) ||
              col.toLowerCase().includes(key.replace(/_/g, " "))
          );
          if (match) newMapping[key] = match;
        }

        // Try common TUSS column names
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

  // Import data
  const handleImport = async () => {
    if (!mapping.codigo_tuss) {
      toast.error("Mapeie pelo menos a coluna 'Código TUSS'");
      return;
    }

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

      if (error) {
        errorCount += rows.length;
        logs.push({ type: "error", message: `Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}` });
      } else {
        successCount += rows.length;
      }

      setImportProgress(Math.round(((i + batch.length) / totalRows) * 100));
    }

    logs.push({ type: "success", message: `✅ ${successCount} procedimentos importados com sucesso` });
    if (errorCount > 0) {
      logs.push({ type: "error", message: `❌ ${errorCount} linhas com erro` });
    }

    setImportLogs(logs);
    setImporting(false);
    setImportProgress(100);

    if (successCount > 0) {
      toast.success(`${successCount} procedimentos importados!`);
      handleSearch();
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Tem certeza que deseja excluir TODOS os procedimentos TUSS? Esta ação não pode ser desfeita.")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("tuss_procedimentos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("Base TUSS limpa com sucesso");
      setProcedimentos([]);
      setTotalCount(0);
    } catch (error) {
      console.error("Error clearing:", error);
      toast.error("Erro ao limpar base TUSS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Base TUSS</h2>
          <p className="text-muted-foreground">
            Gerencie a Terminologia Unificada da Saúde Suplementar
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowImport(!showImport); setImportLogs([]); }}>
            <Upload className="w-4 h-4 mr-2" />
            Importar Base TUSS
          </Button>
          {totalCount > 0 && (
            <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={loading}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Base
            </Button>
          )}
        </div>
      </div>

      {/* Import Section */}
      {showImport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Importar CSV/Excel
            </CardTitle>
            <CardDescription>
              Faça upload do arquivo TUSS exportado do Datasus/ANS e mapeie as colunas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Selecionar Arquivo
              </Button>
              {fileData.length > 0 && (
                <Badge variant="secondary">{fileData.length} linhas carregadas</Badge>
              )}
            </div>

            {/* Column Mapping */}
            {fileColumns.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Mapeamento de Colunas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.keys(fieldLabels) as (keyof ColumnMapping)[]).map((field) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">{fieldLabels[field]}</Label>
                      <Select
                        value={mapping[field] || "none"}
                        onValueChange={(v) => setMapping((prev) => ({ ...prev, [field]: v === "none" ? "" : v }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecionar coluna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Não mapear —</SelectItem>
                          {fileColumns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {/* Preview */}
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

                {/* Import Button */}
                <div className="flex items-center gap-4">
                  <Button onClick={handleImport} disabled={importing || !mapping.codigo_tuss}>
                    <Upload className="w-4 h-4 mr-2" />
                    {importing ? "Importando..." : `Importar ${fileData.length} registros`}
                  </Button>
                </div>

                {/* Progress */}
                {importing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} />
                    <p className="text-xs text-muted-foreground">{importProgress}% concluído</p>
                  </div>
                )}

                {/* Logs */}
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

      {/* Search & List */}
      <Card>
        <CardHeader>
          <CardTitle>Procedimentos TUSS</CardTitle>
          <CardDescription>
            {totalCount > 0 ? `${totalCount} procedimentos cadastrados` : "Nenhum procedimento cadastrado. Importe a base TUSS."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={searchLoading}>
              {searchLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {procedimentos.length > 0 && (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead className="text-right">Valor Ref.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procedimentos.map((proc) => (
                    <TableRow key={proc.id}>
                      <TableCell className="font-mono text-sm">{proc.codigo_tuss}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{proc.descricao || "—"}</TableCell>
                      <TableCell>
                        {proc.tipo ? <Badge variant="outline">{proc.tipo}</Badge> : "—"}
                      </TableCell>
                      <TableCell>{proc.sexo || "—"}</TableCell>
                      <TableCell className="text-right">
                        {proc.valor_referencia ? `R$ ${Number(proc.valor_referencia).toFixed(2).replace(".", ",")}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalCount > 50 && (
            <p className="text-xs text-muted-foreground text-center">
              Mostrando 50 de {totalCount} resultados. Use a busca para filtrar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
