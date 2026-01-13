import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Info
} from "lucide-react";

interface ImportarPacientesModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicoIds: string[];
  onSuccess: () => void;
}

interface PacienteImport {
  nome: string;
  cpf?: string;
  telefone?: string;
  data_nascimento?: string;
  cidade?: string;
  estado?: string;
  bairro?: string;
  // Histórico médico
  alergias?: string;
  doencas_cronicas?: string;
  medicamentos_uso?: string;
  cirurgias_anteriores?: string;
  observacoes_historico?: string;
  // Dependentes (até 3)
  dependente1_nome?: string;
  dependente1_parentesco?: string;
  dependente1_cpf?: string;
  dependente1_data_nascimento?: string;
  dependente1_telefone?: string;
  dependente2_nome?: string;
  dependente2_parentesco?: string;
  dependente2_cpf?: string;
  dependente2_data_nascimento?: string;
  dependente2_telefone?: string;
  dependente3_nome?: string;
  dependente3_parentesco?: string;
  dependente3_cpf?: string;
  dependente3_data_nascimento?: string;
  dependente3_telefone?: string;
}

interface ImportResult {
  total: number;
  criados: number;
  atualizados: number;
  erros: { linha: number; nome: string; erro: string }[];
}

export function ImportarPacientesModal({ 
  isOpen, 
  onClose, 
  medicoIds,
  onSuccess 
}: ImportarPacientesModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<PacienteImport[]>([]);

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setPreviewData([]);
    setProgress(0);
    onClose();
  };

  const generateTemplate = () => {
    const headers = [
      "nome*",
      "cpf",
      "telefone",
      "data_nascimento",
      "cidade",
      "estado",
      "bairro",
      "alergias",
      "doencas_cronicas",
      "medicamentos_uso",
      "cirurgias_anteriores",
      "observacoes_historico",
      "dependente1_nome",
      "dependente1_parentesco",
      "dependente1_cpf",
      "dependente1_data_nascimento",
      "dependente1_telefone",
      "dependente2_nome",
      "dependente2_parentesco",
      "dependente2_cpf",
      "dependente2_data_nascimento",
      "dependente2_telefone",
      "dependente3_nome",
      "dependente3_parentesco",
      "dependente3_cpf",
      "dependente3_data_nascimento",
      "dependente3_telefone"
    ];

    const exampleData = [
      {
        "nome*": "João da Silva",
        "cpf": "123.456.789-00",
        "telefone": "(11) 99999-9999",
        "data_nascimento": "1985-03-15",
        "cidade": "São Paulo",
        "estado": "SP",
        "bairro": "Centro",
        "alergias": "Dipirona, Penicilina",
        "doencas_cronicas": "Diabetes Tipo 2, Hipertensão",
        "medicamentos_uso": "Metformina 850mg, Losartana 50mg",
        "cirurgias_anteriores": "Apendicectomia (2010)",
        "observacoes_historico": "Paciente acompanhado há 5 anos",
        "dependente1_nome": "Maria da Silva",
        "dependente1_parentesco": "Esposa",
        "dependente1_cpf": "987.654.321-00",
        "dependente1_data_nascimento": "1988-07-22",
        "dependente1_telefone": "(11) 98888-8888",
        "dependente2_nome": "Pedro da Silva",
        "dependente2_parentesco": "Filho",
        "dependente2_cpf": "",
        "dependente2_data_nascimento": "2015-01-10",
        "dependente2_telefone": "",
        "dependente3_nome": "",
        "dependente3_parentesco": "",
        "dependente3_cpf": "",
        "dependente3_data_nascimento": "",
        "dependente3_telefone": ""
      },
      {
        "nome*": "Ana Souza",
        "cpf": "111.222.333-44",
        "telefone": "(21) 97777-7777",
        "data_nascimento": "1990-11-20",
        "cidade": "Rio de Janeiro",
        "estado": "RJ",
        "bairro": "Copacabana",
        "alergias": "",
        "doencas_cronicas": "Asma",
        "medicamentos_uso": "Salbutamol spray",
        "cirurgias_anteriores": "",
        "observacoes_historico": "",
        "dependente1_nome": "",
        "dependente1_parentesco": "",
        "dependente1_cpf": "",
        "dependente1_data_nascimento": "",
        "dependente1_telefone": "",
        "dependente2_nome": "",
        "dependente2_parentesco": "",
        "dependente2_cpf": "",
        "dependente2_data_nascimento": "",
        "dependente2_telefone": "",
        "dependente3_nome": "",
        "dependente3_parentesco": "",
        "dependente3_cpf": "",
        "dependente3_data_nascimento": "",
        "dependente3_telefone": ""
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(exampleData, { header: headers });
    
    // Ajustar largura das colunas
    const colWidths = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pacientes");
    
    XLSX.writeFile(workbook, "modelo_importacao_pacientes.xlsx");
    
    toast({
      title: "Modelo baixado!",
      description: "Preencha o arquivo e faça o upload para importar.",
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      const pacientes: PacienteImport[] = jsonData.map(row => ({
        nome: row["nome*"] || row["nome"] || "",
        cpf: row["cpf"] || "",
        telefone: row["telefone"] || "",
        data_nascimento: row["data_nascimento"] || "",
        cidade: row["cidade"] || "",
        estado: row["estado"] || "",
        bairro: row["bairro"] || "",
        alergias: row["alergias"] || "",
        doencas_cronicas: row["doencas_cronicas"] || "",
        medicamentos_uso: row["medicamentos_uso"] || "",
        cirurgias_anteriores: row["cirurgias_anteriores"] || "",
        observacoes_historico: row["observacoes_historico"] || "",
        dependente1_nome: row["dependente1_nome"] || "",
        dependente1_parentesco: row["dependente1_parentesco"] || "",
        dependente1_cpf: row["dependente1_cpf"] || "",
        dependente1_data_nascimento: row["dependente1_data_nascimento"] || "",
        dependente1_telefone: row["dependente1_telefone"] || "",
        dependente2_nome: row["dependente2_nome"] || "",
        dependente2_parentesco: row["dependente2_parentesco"] || "",
        dependente2_cpf: row["dependente2_cpf"] || "",
        dependente2_data_nascimento: row["dependente2_data_nascimento"] || "",
        dependente2_telefone: row["dependente2_telefone"] || "",
        dependente3_nome: row["dependente3_nome"] || "",
        dependente3_parentesco: row["dependente3_parentesco"] || "",
        dependente3_cpf: row["dependente3_cpf"] || "",
        dependente3_data_nascimento: row["dependente3_data_nascimento"] || "",
        dependente3_telefone: row["dependente3_telefone"] || "",
      }));

      setPreviewData(pacientes.slice(0, 5)); // Preview dos primeiros 5
    } catch (error) {
      toast({
        title: "Erro ao ler arquivo",
        description: "Verifique se o arquivo está no formato correto (.xlsx ou .xls)",
        variant: "destructive",
      });
    }
  };

  const cleanCPF = (cpf: string): string => {
    return cpf.replace(/\D/g, "");
  };

  const formatDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Tenta diferentes formatos
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          return dateStr; // Já está no formato correto
        }
        // Converte DD/MM/YYYY ou DD-MM-YYYY para YYYY-MM-DD
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
    
    return null;
  };

  const processImport = async () => {
    if (!file || medicoIds.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    const importResult: ImportResult = {
      total: 0,
      criados: 0,
      atualizados: 0,
      erros: []
    };

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      importResult.total = jsonData.length;

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const linha = i + 2; // +2 porque linha 1 é cabeçalho e arrays começam em 0

        try {
          const nome = row["nome*"] || row["nome"] || "";
          if (!nome.trim()) {
            importResult.erros.push({ linha, nome: "(vazio)", erro: "Nome é obrigatório" });
            continue;
          }

          const cpf = cleanCPF(row["cpf"] || "");
          const dataNascimento = formatDate(row["data_nascimento"] || "");

          // Verificar se paciente já existe (por CPF)
          let pacienteId: string | null = null;
          let isUpdate = false;

          if (cpf) {
            const { data: existingPaciente } = await supabase
              .from("pacientes")
              .select("id")
              .eq("cpf", cpf)
              .maybeSingle();

            if (existingPaciente) {
              pacienteId = existingPaciente.id;
              isUpdate = true;
            }
          }

          const pacienteData = {
            nome: nome.trim(),
            cpf: cpf || null,
            telefone: row["telefone"] || null,
            data_nascimento: dataNascimento,
            cidade: row["cidade"] || null,
            estado: row["estado"] || null,
            bairro: row["bairro"] || null,
          };

          if (isUpdate && pacienteId) {
            // Atualizar paciente existente
            const { error } = await supabase
              .from("pacientes")
              .update(pacienteData)
              .eq("id", pacienteId);

            if (error) throw error;
            importResult.atualizados++;
          } else {
            // Criar novo paciente
            const { data: newPaciente, error } = await supabase
              .from("pacientes")
              .insert(pacienteData)
              .select("id")
              .single();

            if (error) throw error;
            pacienteId = newPaciente.id;
            importResult.criados++;
          }

          // Processar histórico médico
          const historicoItems = [
            { tipo: "alergia", descricao: row["alergias"] },
            { tipo: "doenca_cronica", descricao: row["doencas_cronicas"] },
            { tipo: "medicamento", descricao: row["medicamentos_uso"] },
            { tipo: "cirurgia", descricao: row["cirurgias_anteriores"] },
            { tipo: "observacao", descricao: row["observacoes_historico"] },
          ];

          for (const item of historicoItems) {
            if (item.descricao?.trim()) {
              // Verificar se já existe
              const { data: existing } = await supabase
                .from("historico_medico_paciente")
                .select("id")
                .eq("paciente_id", pacienteId)
                .eq("tipo", item.tipo)
                .eq("descricao", item.descricao.trim())
                .maybeSingle();

              if (!existing) {
                await supabase.from("historico_medico_paciente").insert({
                  paciente_id: pacienteId,
                  tipo: item.tipo,
                  descricao: item.descricao.trim(),
                  ativo: true,
                });
              }
            }
          }

          // Processar dependentes
          const dependentes = [
            { nome: row["dependente1_nome"], parentesco: row["dependente1_parentesco"], cpf: row["dependente1_cpf"], data_nascimento: row["dependente1_data_nascimento"], telefone: row["dependente1_telefone"] },
            { nome: row["dependente2_nome"], parentesco: row["dependente2_parentesco"], cpf: row["dependente2_cpf"], data_nascimento: row["dependente2_data_nascimento"], telefone: row["dependente2_telefone"] },
            { nome: row["dependente3_nome"], parentesco: row["dependente3_parentesco"], cpf: row["dependente3_cpf"], data_nascimento: row["dependente3_data_nascimento"], telefone: row["dependente3_telefone"] },
          ];

          for (const dep of dependentes) {
            if (dep.nome?.trim() && dep.parentesco?.trim()) {
              const depCpf = cleanCPF(dep.cpf || "");
              
              // Verificar se dependente já existe
              const { data: existingDep } = await supabase
                .from("paciente_dependentes")
                .select("id")
                .eq("paciente_id", pacienteId)
                .eq("nome", dep.nome.trim())
                .maybeSingle();

              const depData = {
                paciente_id: pacienteId,
                nome: dep.nome.trim(),
                parentesco: dep.parentesco.trim(),
                cpf: depCpf || null,
                data_nascimento: formatDate(dep.data_nascimento || ""),
                telefone: dep.telefone || null,
                ativo: true,
              };

              if (existingDep) {
                await supabase
                  .from("paciente_dependentes")
                  .update(depData)
                  .eq("id", existingDep.id);
              } else {
                await supabase.from("paciente_dependentes").insert(depData);
              }
            }
          }

        } catch (error: any) {
          importResult.erros.push({
            linha,
            nome: row["nome*"] || row["nome"] || "(vazio)",
            erro: error.message || "Erro desconhecido"
          });
        }

        setProgress(Math.round(((i + 1) / jsonData.length) * 100));
      }

      setResult(importResult);

      if (importResult.erros.length === 0) {
        toast({
          title: "Importação concluída!",
          description: `${importResult.criados} criados, ${importResult.atualizados} atualizados.`,
        });
        onSuccess();
      } else {
        toast({
          title: "Importação concluída com avisos",
          description: `${importResult.criados + importResult.atualizados} processados, ${importResult.erros.length} erros.`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Pacientes
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Importe pacientes em massa com histórico médico e dependentes.
                <br />
                <strong>CPFs duplicados serão atualizados</strong> com os novos dados.
              </AlertDescription>
            </Alert>

            {/* Download Template */}
            <div className="space-y-2">
              <Label>1. Baixe o modelo de planilha</Label>
              <Button 
                variant="outline" 
                onClick={generateTemplate}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Modelo Excel
              </Button>
              <p className="text-xs text-muted-foreground">
                O modelo inclui exemplos preenchidos para facilitar o entendimento.
              </p>
            </div>

            {/* Upload */}
            <div className="space-y-2">
              <Label>2. Faça upload da planilha preenchida</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
              </div>
              {file && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.name}
                </p>
              )}
            </div>

            {/* Preview */}
            {previewData.length > 0 && !result && (
              <div className="space-y-2">
                <Label>Prévia dos dados (primeiros 5)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="px-3 py-2 text-left">CPF</th>
                        <th className="px-3 py-2 text-left">Telefone</th>
                        <th className="px-3 py-2 text-left">Histórico</th>
                        <th className="px-3 py-2 text-left">Deps.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((p, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{p.nome || "-"}</td>
                          <td className="px-3 py-2">{p.cpf || "-"}</td>
                          <td className="px-3 py-2">{p.telefone || "-"}</td>
                          <td className="px-3 py-2">
                            {(p.alergias || p.doencas_cronicas || p.medicamentos_uso) ? (
                              <Badge variant="secondary">Sim</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {[p.dependente1_nome, p.dependente2_nome, p.dependente3_nome].filter(Boolean).length || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <Label>Processando...</Label>
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">{progress}%</p>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{result.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{result.criados}</p>
                    <p className="text-sm text-muted-foreground">Criados</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{result.atualizados}</p>
                    <p className="text-sm text-muted-foreground">Atualizados</p>
                  </div>
                </div>

                {result.erros.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Erros ({result.erros.length})
                    </Label>
                    <div className="border border-destructive/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      {result.erros.map((err, i) => (
                        <div key={i} className="text-sm py-1 border-b last:border-0">
                          <span className="font-medium">Linha {err.linha}</span>
                          <span className="text-muted-foreground"> ({err.nome}): </span>
                          <span className="text-destructive">{err.erro}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={handleClose}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button 
              onClick={processImport} 
              disabled={!file || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Pacientes
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
