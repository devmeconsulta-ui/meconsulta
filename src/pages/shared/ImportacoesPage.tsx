import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  Users,
  FileText,
  Calendar,
  FileArchive,
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
  History,
} from "lucide-react";

type Scope = "clinica" | "admin";

interface ImportResult {
  total: number;
  criados: number;
  atualizados: number;
  erros: { linha: number | string; identificador: string; erro: string }[];
}

interface ClinicaOption {
  id: string;
  nome: string;
}

interface JobRow {
  id: string;
  tipo: string;
  arquivo_nome: string | null;
  total_registros: number | null;
  criados: number | null;
  atualizados: number | null;
  erros: number | null;
  status: string | null;
  created_at: string;
}

const onlyDigits = (s: string) => (s || "").toString().replace(/\D/g, "");

function parseDateBR(value: any): string | null {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return value.toISOString();
  const s = String(value).trim();
  // dd/mm/yyyy or dd/mm/yyyy hh:mm
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h = "00", mi = "00"] = m;
    return new Date(`${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:00-03:00`).toISOString();
  }
  // Already ISO
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso.toISOString();
  return null;
}

function parseDateOnly(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().substring(0, 10);
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d2 = new Date(s);
  if (!isNaN(d2.getTime())) return d2.toISOString().substring(0, 10);
  return null;
}

function readSheet(file: File): Promise<Record<string, any>[]> {
  return file.arrayBuffer().then((buf) => {
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  });
}

async function readStructured(file: File): Promise<Record<string, any>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    return readSheet(file);
  }
  if (name.endsWith(".json")) {
    const txt = await file.text();
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.data)) return parsed.data;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    throw new Error("JSON deve ser um array de objetos ou conter um array em 'data'/'items'.");
  }
  if (name.endsWith(".xml")) {
    const txt = await file.text();
    const doc = new DOMParser().parseFromString(txt, "application/xml");
    const err = doc.querySelector("parsererror");
    if (err) throw new Error("XML inválido.");
    const root = doc.documentElement;
    const children = Array.from(root.children);
    return children.map((el) => {
      const obj: Record<string, any> = {};
      Array.from(el.children).forEach((c) => (obj[c.tagName] = c.textContent || ""));
      Array.from(el.attributes).forEach((a) => (obj[a.name] = a.value));
      return obj;
    });
  }
  throw new Error("Formato não suportado. Use .xlsx, .csv, .json ou .xml");
}

function getField(row: Record<string, any>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function downloadTemplate(filename: string, headers: string[], example: Record<string, any>[]) {
  const ws = XLSX.utils.json_to_sheet(example, { header: headers });
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, filename);
  toast.success("Modelo baixado!");
}

export default function ImportacoesPage({ scope }: { scope: Scope }) {
  const { currentUser } = useAuth();
  const [clinicas, setClinicas] = useState<ClinicaOption[]>([]);
  const [selectedClinica, setSelectedClinica] = useState<string>("");
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    if (scope === "clinica") {
      setSelectedClinica(currentUser?.clinicaId || "");
    } else {
      (async () => {
        const { data } = await supabase.from("clinicas").select("id, nome_fantasia").order("nome_fantasia");
        setClinicas(((data as any[]) || []).map((c) => ({ id: c.id, nome: c.nome_fantasia })));
      })();
    }
  }, [scope, currentUser?.clinicaId]);

  const loadJobs = async () => {
    let q = supabase.from("import_jobs").select("*").order("created_at", { ascending: false }).limit(20);
    if (scope === "clinica" && currentUser?.clinicaId) q = q.eq("clinica_id", currentUser.clinicaId);
    const { data } = await q;
    setJobs((data as JobRow[]) || []);
  };

  useEffect(() => {
    loadJobs();
  }, [scope, currentUser?.clinicaId]);

  const clinicaId = scope === "clinica" ? currentUser?.clinicaId : selectedClinica;

  const logJob = async (
    tipo: string,
    arquivoNome: string,
    origem: string,
    result: ImportResult,
  ) => {
    await supabase.from("import_jobs").insert({
      clinica_id: clinicaId || null,
      tipo,
      origem,
      arquivo_nome: arquivoNome,
      total_registros: result.total,
      criados: result.criados,
      atualizados: result.atualizados,
      erros: result.erros.length,
      detalhes_erros: result.erros.length ? result.erros.slice(0, 50) : null,
      status: result.erros.length === 0 ? "concluido" : "concluido_com_erros",
    });
    loadJobs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Importações</h2>
          <p className="text-muted-foreground">
            Importe dados de outros sistemas: pacientes, prontuários, consultas históricas e documentos.
          </p>
        </div>
        {scope === "admin" && (
          <div className="min-w-[280px]">
            <Label className="text-xs">Clínica destino</Label>
            <Select value={selectedClinica} onValueChange={setSelectedClinica}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a clínica" />
              </SelectTrigger>
              <SelectContent>
                {clinicas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!clinicaId && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {scope === "admin"
              ? "Selecione uma clínica destino para começar a importar."
              : "Não foi possível identificar a clínica do usuário atual."}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pacientes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="pacientes" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Pacientes</span>
          </TabsTrigger>
          <TabsTrigger value="prontuarios" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Prontuários</span>
          </TabsTrigger>
          <TabsTrigger value="consultas" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Consultas</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <FileArchive className="w-4 h-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="exportar" className="gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>

        </TabsList>

        <TabsContent value="pacientes">
          <PacientesImport clinicaId={clinicaId} onDone={(r, name) => logJob("pacientes", name, "planilha", r)} />
        </TabsContent>
        <TabsContent value="prontuarios">
          <ProntuariosImport clinicaId={clinicaId} onDone={(r, name) => logJob("prontuarios", name, "planilha", r)} />
        </TabsContent>
        <TabsContent value="consultas">
          <ConsultasImport clinicaId={clinicaId} onDone={(r, name) => logJob("consultas", name, "planilha", r)} />
        </TabsContent>
        <TabsContent value="documentos">
          <DocumentosImport clinicaId={clinicaId} onDone={(r, name) => logJob("documentos", name, "upload", r)} />
        </TabsContent>
        <TabsContent value="exportar">
          <ExportarDados clinicaId={clinicaId} />
        </TabsContent>
        <TabsContent value="historico">

          <HistoricoJobs jobs={jobs} onRefresh={loadJobs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function ResultPanel({ result }: { result: ImportResult | null }) {
  if (!result) return null;
  return (
    <div className="space-y-3 mt-4">
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Total" value={result.total} />
        <Stat label="Criados" value={result.criados} accent="success" />
        <Stat label="Atualizados" value={result.atualizados} accent="info" />
        <Stat label="Erros" value={result.erros.length} accent={result.erros.length ? "danger" : undefined} />
      </div>
      {result.erros.length > 0 && (
        <ScrollArea className="h-40 border rounded-md p-2">
          {result.erros.map((e, i) => (
            <div key={i} className="text-xs border-b last:border-0 py-1">
              <span className="font-medium">Linha {e.linha}</span>
              <span className="text-muted-foreground"> · {e.identificador}: </span>
              <span className="text-destructive">{e.erro}</span>
            </div>
          ))}
        </ScrollArea>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "success" | "info" | "danger" }) {
  const cls =
    accent === "success"
      ? "bg-green-100 dark:bg-green-900/30 text-green-700"
      : accent === "info"
      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700"
      : accent === "danger"
      ? "bg-red-100 dark:bg-red-900/30 text-red-700"
      : "bg-muted";
  return (
    <div className={`rounded-lg p-3 text-center ${cls}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FilePicker({
  accept,
  file,
  setFile,
  hint,
}: {
  accept: string;
  file: File | null;
  setFile: (f: File | null) => void;
  hint: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
      onClick={() => ref.current?.click()}
    >
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      {file ? (
        <p className="text-sm font-medium">{file.name}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/* ===== Pacientes ===== */
function PacientesImport({
  clinicaId,
  onDone,
}: {
  clinicaId: string | null | undefined;
  onDone: (r: ImportResult, fileName: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const baixarModelo = () =>
    downloadTemplate(
      "modelo_importacao_pacientes.xlsx",
      ["nome*", "cpf", "telefone*", "email", "data_nascimento", "cidade", "estado", "bairro"],
      [
        {
          "nome*": "Maria Santos",
          cpf: "123.456.789-00",
          "telefone*": "11999999999",
          email: "maria@email.com",
          data_nascimento: "15/05/1985",
          cidade: "São Paulo",
          estado: "SP",
          bairro: "Centro",
        },
      ],
    );

  const run = async () => {
    if (!file || !clinicaId) return;
    setProcessing(true);
    setProgress(0);
    const r: ImportResult = { total: 0, criados: 0, atualizados: 0, erros: [] };
    try {
      const rows = await readStructured(file);
      r.total = rows.length;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const linha = i + 2;
        try {
          const nome = getField(row, "nome*", "nome", "name");
          const telefone = onlyDigits(getField(row, "telefone*", "telefone", "phone", "celular"));
          const cpf = onlyDigits(getField(row, "cpf", "documento"));
          const email = getField(row, "email", "e-mail").toLowerCase();
          if (!nome) {
            r.erros.push({ linha, identificador: "(vazio)", erro: "Nome obrigatório" });
            continue;
          }
          if (!telefone) {
            r.erros.push({ linha, identificador: nome, erro: "Telefone obrigatório" });
            continue;
          }

          // Buscar paciente existente por CPF (se houver) ou por telefone
          let existing: any = null;
          if (cpf) {
            const { data } = await supabase.from("pacientes").select("id, usuario_id").eq("cpf", cpf).maybeSingle();
            existing = data;
          }
          if (!existing && telefone) {
            const { data } = await supabase
              .from("pacientes")
              .select("id, usuario_id")
              .eq("telefone", telefone)
              .maybeSingle();
            existing = data;
          }

          const pacienteData: any = {
            nome,
            telefone,
            cpf: cpf || null,
            data_nascimento: parseDateOnly(getField(row, "data_nascimento", "nascimento", "dt_nascimento")) || null,
            cidade: getField(row, "cidade") || null,
            estado: getField(row, "estado", "uf") || null,
            bairro: getField(row, "bairro") || null,
          };

          // Garantir usuário (para email)
          let usuarioId = existing?.usuario_id;
          if (email) {
            const { data: u } = await supabase.from("usuarios").select("id").eq("email", email).maybeSingle();
            if (u) {
              usuarioId = u.id;
            } else if (!usuarioId) {
              const { data: novoUsu } = await supabase
                .from("usuarios")
                .insert({ nome, email, tipo: "paciente", ativo: true })
                .select("id")
                .single();
              usuarioId = novoUsu?.id;
            }
          }
          if (usuarioId) pacienteData.usuario_id = usuarioId;

          if (existing) {
            const { error } = await supabase.from("pacientes").update(pacienteData).eq("id", existing.id);
            if (error) throw error;
            r.atualizados++;
          } else {
            const { error } = await supabase.from("pacientes").insert(pacienteData);
            if (error) throw error;
            r.criados++;
          }
        } catch (e: any) {
          r.erros.push({ linha, identificador: getField(row, "nome", "nome*") || "—", erro: e.message || "Erro" });
        }
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }
      setResult(r);
      onDone(r, file.name);
      toast.success(`Importação concluída: ${r.criados} criados, ${r.atualizados} atualizados, ${r.erros.length} erros`);
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pacientes / Clientes</CardTitle>
        <CardDescription>
          Importe cadastro de pacientes. Duplicados (mesmo CPF ou telefone) são <strong>atualizados</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Formatos aceitos: <strong>.xlsx, .csv, .json, .xml</strong>. Campos obrigatórios: <code>nome</code> e{" "}
            <code>telefone</code>. Recomendado: <code>cpf</code>, <code>email</code>, <code>data_nascimento</code>.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={baixarModelo}>
          <Download className="w-4 h-4 mr-2" /> Baixar modelo Excel
        </Button>
        <FilePicker
          accept=".xlsx,.xls,.csv,.json,.xml"
          file={file}
          setFile={setFile}
          hint="Selecione arquivo .xlsx, .csv, .json ou .xml"
        />
        {processing && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">{progress}%</p>
          </div>
        )}
        <Button onClick={run} disabled={!file || processing || !clinicaId} className="w-full">
          {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Importar Pacientes
        </Button>
        <ResultPanel result={result} />
      </CardContent>
    </Card>
  );
}

/* ===== Prontuários ===== */
function ProntuariosImport({
  clinicaId,
  onDone,
}: {
  clinicaId: string | null | undefined;
  onDone: (r: ImportResult, fileName: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const baixarModelo = () =>
    downloadTemplate(
      "modelo_importacao_prontuarios.xlsx",
      ["paciente_cpf*", "medico_crm*", "data", "conteudo*"],
      [
        {
          "paciente_cpf*": "123.456.789-00",
          "medico_crm*": "123456",
          data: "10/03/2024",
          "conteudo*": "Paciente apresentou queixa de cefaleia. Exame físico normal. Conduta: dipirona.",
        },
      ],
    );

  const run = async () => {
    if (!file || !clinicaId) return;
    setProcessing(true);
    setProgress(0);
    const r: ImportResult = { total: 0, criados: 0, atualizados: 0, erros: [] };
    try {
      const rows = await readStructured(file);
      r.total = rows.length;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const linha = i + 2;
        try {
          const cpf = onlyDigits(getField(row, "paciente_cpf*", "paciente_cpf", "cpf"));
          const crm = getField(row, "medico_crm*", "medico_crm", "crm");
          const conteudo = getField(row, "conteudo*", "conteudo", "texto", "anotacao");
          if (!cpf) throw new Error("CPF do paciente obrigatório");
          if (!crm) throw new Error("CRM do médico obrigatório");
          if (!conteudo) throw new Error("Conteúdo obrigatório");

          const { data: pac } = await supabase.from("pacientes").select("id").eq("cpf", cpf).maybeSingle();
          if (!pac) throw new Error("Paciente não encontrado (CPF: " + cpf + ")");

          const { data: med } = await supabase.from("medicos").select("id").eq("crm", crm).maybeSingle();
          if (!med) throw new Error("Médico não encontrado (CRM: " + crm + ")");

          const { error } = await supabase.from("prontuario_livre").insert({
            paciente_id: pac.id,
            medico_id: med.id,
            conteudo,
          });
          if (error) throw error;
          r.criados++;
        } catch (e: any) {
          r.erros.push({
            linha,
            identificador: getField(row, "paciente_cpf*", "paciente_cpf") || "—",
            erro: e.message || "Erro",
          });
        }
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }
      setResult(r);
      onDone(r, file.name);
      toast.success(`Prontuários: ${r.criados} importados, ${r.erros.length} erros`);
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prontuários / Histórico médico</CardTitle>
        <CardDescription>
          Importe anotações de prontuário vinculadas a paciente (por CPF) e médico (por CRM).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Campos obrigatórios: <code>paciente_cpf</code>, <code>medico_crm</code>, <code>conteudo</code>. O paciente e
            o médico já precisam existir no sistema.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={baixarModelo}>
          <Download className="w-4 h-4 mr-2" /> Baixar modelo
        </Button>
        <FilePicker
          accept=".xlsx,.xls,.csv,.json,.xml"
          file={file}
          setFile={setFile}
          hint="Selecione arquivo .xlsx, .csv, .json ou .xml"
        />
        {processing && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">{progress}%</p>
          </div>
        )}
        <Button onClick={run} disabled={!file || processing || !clinicaId} className="w-full">
          {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Importar Prontuários
        </Button>
        <ResultPanel result={result} />
      </CardContent>
    </Card>
  );
}

/* ===== Consultas histórico ===== */
function ConsultasImport({
  clinicaId,
  onDone,
}: {
  clinicaId: string | null | undefined;
  onDone: (r: ImportResult, fileName: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const baixarModelo = () =>
    downloadTemplate(
      "modelo_importacao_consultas.xlsx",
      ["paciente_cpf*", "medico_crm*", "data_hora*", "valor", "status_consulta", "status_pagamento", "motivo"],
      [
        {
          "paciente_cpf*": "123.456.789-00",
          "medico_crm*": "123456",
          "data_hora*": "10/03/2024 14:30",
          valor: 250,
          status_consulta: "concluida",
          status_pagamento: "pago",
          motivo: "Consulta de rotina",
        },
      ],
    );

  const run = async () => {
    if (!file || !clinicaId) return;
    setProcessing(true);
    setProgress(0);
    const r: ImportResult = { total: 0, criados: 0, atualizados: 0, erros: [] };
    try {
      const rows = await readStructured(file);
      r.total = rows.length;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const linha = i + 2;
        try {
          const cpf = onlyDigits(getField(row, "paciente_cpf*", "paciente_cpf", "cpf"));
          const crm = getField(row, "medico_crm*", "medico_crm", "crm");
          const dh = parseDateBR(getField(row, "data_hora*", "data_hora", "data", "datahora"));
          if (!cpf || !crm || !dh) throw new Error("CPF, CRM e data_hora obrigatórios");
          const valor = parseFloat(String(getField(row, "valor", "valor_consulta") || "0").replace(",", ".")) || 0;
          const statusConsulta = (getField(row, "status_consulta", "status") || "concluida").toLowerCase();
          const statusPagamento = (getField(row, "status_pagamento") || "pendente").toLowerCase();

          const { data: pac } = await supabase.from("pacientes").select("id").eq("cpf", cpf).maybeSingle();
          if (!pac) throw new Error("Paciente não encontrado");
          const { data: med } = await supabase.from("medicos").select("id").eq("crm", crm).maybeSingle();
          if (!med) throw new Error("Médico não encontrado");

          // Evitar duplicidade: mesmo paciente+medico+data_hora
          const { data: existing } = await supabase
            .from("consultas")
            .select("id")
            .eq("paciente_id", pac.id)
            .eq("medico_id", med.id)
            .eq("data_hora", dh)
            .maybeSingle();

          const payload: any = {
            paciente_id: pac.id,
            medico_id: med.id,
            clinica_id: clinicaId,
            data_hora: dh,
            status_consulta: statusConsulta,
            status_pagamento: statusPagamento,
            valor_consulta: valor,
            valor_medico: valor,
            valor_plataforma: 0,
            motivo_consulta: getField(row, "motivo", "motivo_consulta") || null,
            origem: "importacao",
          };

          if (existing) {
            const { error } = await supabase.from("consultas").update(payload).eq("id", existing.id);
            if (error) throw error;
            r.atualizados++;
          } else {
            const { error } = await supabase.from("consultas").insert(payload);
            if (error) throw error;
            r.criados++;
          }
        } catch (e: any) {
          r.erros.push({
            linha,
            identificador: getField(row, "paciente_cpf*", "paciente_cpf") || "—",
            erro: e.message || "Erro",
          });
        }
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }
      setResult(r);
      onDone(r, file.name);
      toast.success(`Consultas: ${r.criados} criadas, ${r.atualizados} atualizadas, ${r.erros.length} erros`);
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consultas / Agenda histórica</CardTitle>
        <CardDescription>
          Importe consultas já realizadas. Duplicados (mesmo paciente, médico e data/hora) são atualizados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Campos obrigatórios: <code>paciente_cpf</code>, <code>medico_crm</code>, <code>data_hora</code>. Data no
            formato <code>dd/mm/aaaa hh:mm</code> ou ISO.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={baixarModelo}>
          <Download className="w-4 h-4 mr-2" /> Baixar modelo
        </Button>
        <FilePicker
          accept=".xlsx,.xls,.csv,.json,.xml"
          file={file}
          setFile={setFile}
          hint="Selecione arquivo .xlsx, .csv, .json ou .xml"
        />
        {processing && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">{progress}%</p>
          </div>
        )}
        <Button onClick={run} disabled={!file || processing || !clinicaId} className="w-full">
          {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Importar Consultas
        </Button>
        <ResultPanel result={result} />
      </CardContent>
    </Card>
  );
}

/* ===== Documentos (PDFs etc) ===== */
function DocumentosImport({
  clinicaId,
  onDone,
}: {
  clinicaId: string | null | undefined;
  onDone: (r: ImportResult, fileName: string) => void;
}) {
  const [pacienteCpf, setPacienteCpf] = useState("");
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [pacienteNome, setPacienteNome] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("documento");
  const [descricao, setDescricao] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const buscarPaciente = async () => {
    const cpf = onlyDigits(pacienteCpf);
    if (!cpf) return;
    const { data } = await supabase.from("pacientes").select("id, nome").eq("cpf", cpf).maybeSingle();
    if (data) {
      setPacienteId(data.id);
      setPacienteNome(data.nome);
      toast.success("Paciente encontrado: " + data.nome);
    } else {
      setPacienteId(null);
      setPacienteNome("");
      toast.error("Paciente não encontrado para esse CPF");
    }
  };

  const run = async () => {
    if (!pacienteId || files.length === 0 || !clinicaId) return;
    setProcessing(true);
    setProgress(0);
    const r: ImportResult = { total: files.length, criados: 0, atualizados: 0, erros: [] };
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const ext = f.name.split(".").pop() || "bin";
        const path = `${clinicaId}/${pacienteId}/${Date.now()}_${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("pacientes-documentos")
          .upload(path, f, { contentType: f.type, upsert: false });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("pacientes-documentos")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5); // 5 anos
        const url = signed?.signedUrl || path;
        const { error: insErr } = await supabase.from("paciente_documentos").insert({
          clinica_id: clinicaId,
          paciente_id: pacienteId,
          titulo: titulo || f.name,
          descricao: descricao || null,
          categoria,
          arquivo_url: url,
          arquivo_nome: f.name,
          arquivo_tipo: f.type,
          arquivo_tamanho: f.size,
          origem_import: "upload_manual",
        });
        if (insErr) throw insErr;
        r.criados++;
      } catch (e: any) {
        r.erros.push({ linha: i + 1, identificador: f.name, erro: e.message || "Erro" });
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setResult(r);
    onDone(r, files.map((f) => f.name).join(", "));
    setProcessing(false);
    toast.success(`Documentos: ${r.criados} enviados, ${r.erros.length} erros`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos e exames</CardTitle>
        <CardDescription>
          Envie PDFs, imagens de exames, laudos. Os arquivos são anexados ao prontuário do paciente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>CPF do paciente</Label>
          <div className="flex gap-2">
            <Input
              placeholder="000.000.000-00"
              value={pacienteCpf}
              onChange={(e) => setPacienteCpf(e.target.value)}
              onBlur={buscarPaciente}
            />
            <Button variant="secondary" onClick={buscarPaciente} type="button">
              Buscar
            </Button>
          </div>
          {pacienteNome && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="w-3 h-3" /> {pacienteNome}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Título (opcional, padrão = nome do arquivo)</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Hemograma 03/2024" />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documento">Documento</SelectItem>
                <SelectItem value="exame">Exame</SelectItem>
                <SelectItem value="laudo">Laudo</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="atestado">Atestado</SelectItem>
                <SelectItem value="imagem">Imagem</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Descrição (opcional)</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Arquivos (PDF, imagens, etc — múltipla seleção)</Label>
          <Input
            type="file"
            multiple
            accept=".pdf,image/*,.doc,.docx,.xlsx,.txt"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          {files.length > 0 && (
            <p className="text-xs text-muted-foreground">{files.length} arquivo(s) selecionado(s)</p>
          )}
        </div>
        {processing && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">{progress}%</p>
          </div>
        )}
        <Button
          onClick={run}
          disabled={!pacienteId || files.length === 0 || processing || !clinicaId}
          className="w-full"
        >
          {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Enviar Documentos
        </Button>
        <ResultPanel result={result} />
      </CardContent>
    </Card>
  );
}

/* ===== Histórico ===== */
function HistoricoJobs({ jobs, onRefresh }: { jobs: JobRow[]; onRefresh: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Histórico de importações</CardTitle>
          <CardDescription>Últimas 20 importações em lote</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma importação registrada ainda.</p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Data</th>
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-left">Arquivo</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-right">Criados</th>
                  <th className="p-2 text-right">Atualizados</th>
                  <th className="p-2 text-right">Erros</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t">
                    <td className="p-2">{new Date(j.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-2 capitalize">{j.tipo}</td>
                    <td className="p-2 max-w-[240px] truncate" title={j.arquivo_nome || ""}>
                      {j.arquivo_nome || "—"}
                    </td>
                    <td className="p-2 text-right">{j.total_registros ?? 0}</td>
                    <td className="p-2 text-right text-green-600">{j.criados ?? 0}</td>
                    <td className="p-2 text-right text-blue-600">{j.atualizados ?? 0}</td>
                    <td className="p-2 text-right text-destructive">{j.erros ?? 0}</td>
                    <td className="p-2">
                      <Badge variant={(j.erros ?? 0) === 0 ? "secondary" : "destructive"}>
                        {j.status || "—"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ===== Exportação ===== */
function autoCols(rows: Record<string, any>[], headers: string[]) {
  return headers.map((h) => ({
    wch: Math.min(
      50,
      Math.max(h.length + 2, ...rows.map((r) => String(r[h] ?? "").length + 2), 12),
    ),
  }));
}

function addSheet(wb: XLSX.WorkBook, name: string, rows: Record<string, any>[], headers: string[]) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}], { header: headers });
  ws["!cols"] = autoCols(rows, headers);
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: headers.length - 1 } }) };
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";

function ExportarDados({ clinicaId }: { clinicaId: string | null | undefined }) {
  const [medicos, setMedicos] = useState<{ id: string; nome: string; crm: string | null; especialidade: string | null }[]>([]);
  const [medicoId, setMedicoId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      if (!clinicaId) return setMedicos([]);
      const { data: vinculos } = await supabase
        .from("clinicas_medicos")
        .select("medico_id")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);
      const ids = (vinculos || []).map((v: any) => v.medico_id);
      if (!ids.length) return setMedicos([]);
      const { data } = await supabase
        .from("medicos")
        .select("id, nome, crm, especialidade")
        .in("id", ids)
        .order("nome");
      setMedicos((data as any) || []);
    })();
  }, [clinicaId]);

  // Busca paginada (contorna o limite de 1000 linhas do PostgREST) com erro visível
  const fetchAll = async (
    table: string,
    select: string,
    build: (q: any) => any,
  ): Promise<any[]> => {
    const out: any[] = [];
    const step = 1000;
    for (let from = 0; ; from += step) {
      const { data, error } = await build(supabase.from(table as any).select(select)).range(from, from + step - 1);
      if (error) throw new Error(`${table}: ${error.message}`);
      const rows = (data as any[]) || [];
      out.push(...rows);
      if (rows.length < step) break;
    }
    return out;
  };

  const fetchByIds = async (table: string, select: string, column: string, ids: string[]) => {
    const out: any[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { data, error } = await supabase.from(table as any).select(select).in(column, chunk).limit(1000);
      if (error) throw new Error(`${table}: ${error.message}`);
      out.push(...((data as any[]) || []));
    }
    return out;
  };

  const exportar = async () => {
    if (!medicoId) return;
    setLoading(true);
    try {
      const medico = medicos.find((m) => m.id === medicoId);

      setStatus("Buscando consultas...");
      const consultas = await fetchAll(
        "consultas",
        "id, paciente_id, nome_paciente_consulta, data_hora, status_consulta, status_pagamento, valor_consulta, valor_medico, tipo_atendimento, tipo_servico, motivo_consulta, sintomas, observacoes_paciente, observacao_finalizacao_medico, origem",
        (q) => q.eq("medico_id", medicoId).order("data_hora", { ascending: false }),
      );
      const consultaIds = consultas.map((c: any) => c.id);

      setStatus("Buscando prontuários...");
      const [pronMedico, anamMedico, presMedico] = await Promise.all([
        fetchAll("prontuario_livre", "id, paciente_id, consulta_id, conteudo, created_at", (q) => q.eq("medico_id", medicoId)),
        fetchAll(
          "anamneses",
          "id, paciente_id, consulta_id, queixa_principal, historia_doenca_atual, antecedentes_pessoais, antecedentes_familiares, exame_fisico, hipotese_diagnostica, conduta, observacoes, created_at",
          (q) => q.eq("medico_id", medicoId),
        ),
        fetchAll("prescricoes_documentos", "id, paciente_id, consulta_id, tipo, titulo, conteudo, created_at", (q) =>
          q.eq("medico_id", medicoId),
        ),
      ]);

      // Também traz registros vinculados às consultas do médico (mesmo que gravados por outro medico_id)
      setStatus("Complementando por consultas...");
      const [pronCons, anamCons, presCons] = await Promise.all([
        fetchByIds("prontuario_livre", "id, paciente_id, consulta_id, conteudo, created_at", "consulta_id", consultaIds),
        fetchByIds(
          "anamneses",
          "id, paciente_id, consulta_id, queixa_principal, historia_doenca_atual, antecedentes_pessoais, antecedentes_familiares, exame_fisico, hipotese_diagnostica, conduta, observacoes, created_at",
          "consulta_id",
          consultaIds,
        ),
        fetchByIds("prescricoes_documentos", "id, paciente_id, consulta_id, tipo, titulo, conteudo, created_at", "consulta_id", consultaIds),
      ]);

      const dedupe = (a: any[], b: any[]) => {
        const map = new Map<string, any>();
        [...a, ...b].forEach((r) => map.set(r.id, r));
        return Array.from(map.values());
      };
      const prontuarios = dedupe(pronMedico, pronCons);
      const anamneses = dedupe(anamMedico, anamCons);
      const prescricoes = dedupe(presMedico, presCons);

      const pacienteIds = Array.from(
        new Set(
          [
            ...consultas.map((c: any) => c.paciente_id),
            ...prontuarios.map((p: any) => p.paciente_id),
            ...anamneses.map((a: any) => a.paciente_id),
            ...prescricoes.map((p: any) => p.paciente_id),
          ].filter(Boolean),
        ),
      ) as string[];

      setStatus("Buscando pacientes...");
      const pacientes = await fetchByIds(
        "pacientes",
        "id, nome, cpf, telefone, data_nascimento, cidade, estado, bairro, usuario_id",
        "id",
        pacienteIds,
      );
      const usuarioIds = pacientes.map((p) => p.usuario_id).filter(Boolean) as string[];
      const emails: Record<string, string> = {};
      const usuarios = await fetchByIds("usuarios", "id, email", "id", usuarioIds);
      usuarios.forEach((u: any) => (emails[u.id] = u.email));
      const pMap = new Map(pacientes.map((p) => [p.id, p]));
      const consMap = new Map(consultas.map((c: any) => [c.id, c]));
      const nome = (id: string, consultaId?: string) =>
        pMap.get(id)?.nome || (consultaId ? consMap.get(consultaId)?.nome_paciente_consulta : "") || "—";
      const cpf = (id: string) => pMap.get(id)?.cpf || "";

      if (!consultas.length && !prontuarios.length && !anamneses.length) {
        toast.warning("Nenhum registro encontrado para este médico.");
      }


      setStatus("Gerando planilha...");
      const wb = XLSX.utils.book_new();

      const resumoHeaders = ["Informação", "Valor"];
      addSheet(
        wb,
        "Resumo",
        [
          { Informação: "Médico", Valor: medico?.nome || "" },
          { Informação: "CRM", Valor: medico?.crm || "" },
          { Informação: "Especialidade", Valor: medico?.especialidade || "" },
          { Informação: "Gerado em", Valor: fmtDateTime(new Date().toISOString()) },
          { Informação: "Total de pacientes", Valor: pacientes.length },
          { Informação: "Total de consultas", Valor: consultas?.length || 0 },
          { Informação: "Prontuários (evolução livre)", Valor: prontuarios?.length || 0 },
          { Informação: "Anamneses", Valor: anamneses?.length || 0 },
          { Informação: "Prescrições/Documentos", Valor: prescricoes?.length || 0 },
        ],
        resumoHeaders,
      );

      const pacHeaders = [
        "Nome",
        "CPF",
        "Telefone",
        "E-mail",
        "Nascimento",
        "Cidade",
        "Estado",
        "Bairro",
        "Consultas",
        "Prontuários",
        "Anamneses",
        "Prescrições",
        "Primeiro Atendimento",
        "Último Atendimento",
        "Cadastro",
      ];

      const countBy = (rows: any[]) => {
        const m: Record<string, number> = {};
        rows.forEach((r: any) => {
          const key = r.paciente_id || `avulso:${(consMap.get(r.consulta_id)?.nome_paciente_consulta || "").trim().toLowerCase()}`;
          if (key && key !== "avulso:") m[key] = (m[key] || 0) + 1;
        });
        return m;
      };
      const cntCons: Record<string, number> = {};
      const datas: Record<string, string[]> = {};
      (consultas || []).forEach((c: any) => {
        const key = c.paciente_id || `avulso:${(c.nome_paciente_consulta || "").trim().toLowerCase()}`;
        if (!key || key === "avulso:") return;
        cntCons[key] = (cntCons[key] || 0) + 1;
        if (c.data_hora) (datas[key] = datas[key] || []).push(c.data_hora);
      });
      const cntPron = countBy(prontuarios);
      const cntAnam = countBy(anamneses);
      const cntPres = countBy(prescricoes);

      // Pacientes cadastrados + pacientes atendidos sem cadastro (somente nome na consulta)
      const linhasPacientes: any[] = pacientes.map((p: any) => ({
        Nome: p.nome || "",
        CPF: p.cpf || "",
        Telefone: p.telefone || "",
        "E-mail": p.usuario_id ? emails[p.usuario_id] || "" : "",
        Nascimento: fmtDate(p.data_nascimento),
        Cidade: p.cidade || "",
        Estado: p.estado || "",
        Bairro: p.bairro || "",
        Consultas: cntCons[p.id] || 0,
        Prontuários: cntPron[p.id] || 0,
        Anamneses: cntAnam[p.id] || 0,
        Prescrições: cntPres[p.id] || 0,
        _key: p.id,
        Cadastro: "Cadastrado",
      }));

      const avulsos = new Map<string, string>();
      (consultas || []).forEach((c: any) => {
        if (c.paciente_id) return;
        const n = (c.nome_paciente_consulta || "").trim();
        if (!n) return;
        avulsos.set(`avulso:${n.toLowerCase()}`, n);
      });
      avulsos.forEach((n, key) => {
        linhasPacientes.push({
          Nome: n,
          CPF: "",
          Telefone: "",
          "E-mail": "",
          Nascimento: "",
          Cidade: "",
          Estado: "",
          Bairro: "",
          Consultas: cntCons[key] || 0,
          Prontuários: cntPron[key] || 0,
          Anamneses: cntAnam[key] || 0,
          Prescrições: cntPres[key] || 0,
          _key: key,
          Cadastro: "Sem cadastro",
        });
      });

      linhasPacientes.forEach((l) => {
        const ds = (datas[l._key] || []).slice().sort();
        l["Primeiro Atendimento"] = ds.length ? fmtDateTime(ds[0]) : "";
        l["Último Atendimento"] = ds.length ? fmtDateTime(ds[ds.length - 1]) : "";
        delete l._key;
      });

      addSheet(
        wb,
        "Pacientes",
        linhasPacientes.sort((a, b) => (a.Nome || "").localeCompare(b.Nome || "")),
        pacHeaders,
      );


      const consHeaders = ["Data/Hora", "Paciente", "CPF", "Status", "Pagamento", "Valor (R$)", "Repasse (R$)", "Tipo", "Serviço", "Origem", "Motivo", "Sintomas", "Obs. Recepção", "Obs. Médico"];
      addSheet(
        wb,
        "Consultas",
        (consultas || []).map((c: any) => ({
          "Data/Hora": fmtDateTime(c.data_hora),
          Paciente: nome(c.paciente_id, c.id),
          CPF: cpf(c.paciente_id),
          Status: c.status_consulta || "",
          Pagamento: c.status_pagamento || "",
          "Valor (R$)": Number(c.valor_consulta || 0),
          "Repasse (R$)": Number(c.valor_medico || 0),
          Tipo: c.tipo_atendimento || "",
          Serviço: c.tipo_servico || "",
          Origem: c.origem || "",
          Motivo: c.motivo_consulta || "",
          Sintomas: c.sintomas || "",
          "Obs. Recepção": c.observacoes_paciente || "",
          "Obs. Médico": c.observacao_finalizacao_medico || "",
        })),
        consHeaders,
      );

      const prontHeaders = ["Data", "Paciente", "CPF", "Evolução / Prontuário"];
      addSheet(
        wb,
        "Prontuários",
        (prontuarios || [])
          .sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""))
          .map((p: any) => ({
            Data: fmtDateTime(p.created_at),
            Paciente: nome(p.paciente_id, p.consulta_id),
            CPF: cpf(p.paciente_id),
            "Evolução / Prontuário": p.conteudo || "",
          })),
        prontHeaders,
      );

      const anamHeaders = ["Data", "Paciente", "CPF", "Queixa Principal", "História da Doença Atual", "Antecedentes Pessoais", "Antecedentes Familiares", "Exame Físico", "Hipótese Diagnóstica", "Conduta", "Observações"];
      addSheet(
        wb,
        "Anamneses",
        (anamneses || [])
          .sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""))
          .map((a: any) => ({
            Data: fmtDateTime(a.created_at),
            Paciente: nome(a.paciente_id, a.consulta_id),
            CPF: cpf(a.paciente_id),
            "Queixa Principal": a.queixa_principal || "",
            "História da Doença Atual": a.historia_doenca_atual || "",
            "Antecedentes Pessoais": a.antecedentes_pessoais || "",
            "Antecedentes Familiares": a.antecedentes_familiares || "",
            "Exame Físico": a.exame_fisico || "",
            "Hipótese Diagnóstica": a.hipotese_diagnostica || "",
            Conduta: a.conduta || "",
            Observações: a.observacoes || "",
          })),
        anamHeaders,
      );

      const presHeaders = ["Data", "Paciente", "CPF", "Tipo", "Título", "Conteúdo"];
      addSheet(
        wb,
        "Prescrições",
        (prescricoes || [])
          .sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""))
          .map((p: any) => ({
            Data: fmtDateTime(p.created_at),
            Paciente: nome(p.paciente_id, p.consulta_id),
            CPF: cpf(p.paciente_id),
            Tipo: p.tipo || "",
            Título: p.titulo || "",
            Conteúdo: typeof p.conteudo === "string" ? p.conteudo : JSON.stringify(p.conteudo ?? ""),
          })),
        presHeaders,
      );

      const slug = (medico?.nome || "medico").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
      XLSX.writeFile(wb, `prontuarios_${slug}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Planilha exportada com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao exportar: " + (e?.message || "desconhecido"));
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar Prontuários e Pacientes</CardTitle>
        <CardDescription>
          Gere uma planilha Excel completa e organizada com todos os dados de um médico.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            A planilha contém as abas: <strong>Resumo</strong>, <strong>Pacientes</strong>,{" "}
            <strong>Consultas</strong>, <strong>Prontuários</strong>, <strong>Anamneses</strong> e{" "}
            <strong>Prescrições</strong>.
          </AlertDescription>
        </Alert>

        <div className="space-y-2 max-w-md">
          <Label>Médico</Label>
          <Select value={medicoId} onValueChange={setMedicoId} disabled={!clinicaId || !medicos.length}>
            <SelectTrigger>
              <SelectValue placeholder={medicos.length ? "Selecione o médico" : "Nenhum médico vinculado"} />
            </SelectTrigger>
            <SelectContent>
              {medicos.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                  {m.crm ? ` — CRM ${m.crm}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading && status && <p className="text-xs text-muted-foreground">{status}</p>}

        <Button onClick={exportar} disabled={!medicoId || loading} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Exportar Planilha Excel
        </Button>
      </CardContent>
    </Card>
  );
}
