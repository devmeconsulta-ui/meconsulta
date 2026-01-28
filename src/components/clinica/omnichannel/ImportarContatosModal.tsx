import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface ImportarContatosModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicaId: string;
  onSuccess: () => void;
}

interface ContatoImport {
  nome: string;
  telefone: string;
  documento?: string;
  email?: string;
  instagram?: string;
  empresa?: string;
  observacoes?: string;
}

interface ImportResult {
  total: number;
  criados: number;
  atualizados: number;
  erros: { linha: number; nome: string; erro: string }[];
}

export function ImportarContatosModal({ 
  isOpen, 
  onClose, 
  clinicaId,
  onSuccess 
}: ImportarContatosModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<ContatoImport[]>([]);

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
      "telefone*",
      "documento",
      "email",
      "instagram",
      "empresa",
      "observacoes"
    ];

    const exampleData = [
      {
        "nome*": "João da Silva",
        "telefone*": "5511999999999",
        "documento": "123.456.789-00",
        "email": "joao@email.com",
        "instagram": "@joaosilva",
        "empresa": "Empresa X",
        "observacoes": "Cliente VIP"
      },
      {
        "nome*": "Maria Santos",
        "telefone*": "5521988888888",
        "documento": "987.654.321-00",
        "email": "maria@email.com",
        "instagram": "@mariasantos",
        "empresa": "",
        "observacoes": ""
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(exampleData, { header: headers });
    
    const colWidths = headers.map(h => ({ wch: Math.max(h.length + 2, 18) }));
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contatos");
    
    XLSX.writeFile(workbook, "modelo_importacao_contatos.xlsx");
    
    toast.success("Modelo baixado! Preencha o arquivo e faça o upload.");
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

      const contatos: ContatoImport[] = jsonData.map(row => ({
        nome: row["nome*"] || row["nome"] || "",
        telefone: row["telefone*"] || row["telefone"] || "",
        documento: row["documento"] || "",
        email: row["email"] || "",
        instagram: row["instagram"] || "",
        empresa: row["empresa"] || "",
        observacoes: row["observacoes"] || "",
      }));

      setPreviewData(contatos.slice(0, 5));
    } catch (error) {
      toast.error("Erro ao ler arquivo. Verifique o formato (.xlsx ou .xls)");
    }
  };

  const cleanPhone = (phone: string): string => {
    return phone.replace(/\D/g, "");
  };

  const processImport = async () => {
    if (!file || !clinicaId) return;

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
        const linha = i + 2;

        try {
          const nome = row["nome*"] || row["nome"] || "";
          const telefone = cleanPhone(row["telefone*"] || row["telefone"] || "");
          
          if (!nome.trim()) {
            importResult.erros.push({ linha, nome: "(vazio)", erro: "Nome é obrigatório" });
            continue;
          }

          if (!telefone) {
            importResult.erros.push({ linha, nome, erro: "Telefone é obrigatório" });
            continue;
          }

          // Verificar se contato já existe (por telefone na mesma clínica)
          const { data: existingContato } = await supabase
            .from("omni_contatos")
            .select("id")
            .eq("clinica_id", clinicaId)
            .eq("telefone", telefone)
            .maybeSingle();

          const contatoData = {
            clinica_id: clinicaId,
            nome: nome.trim(),
            telefone,
            documento: row["documento"] || null,
            email: row["email"] || null,
            instagram: row["instagram"] || null,
            empresa: row["empresa"] || null,
            observacoes: row["observacoes"] || null,
          };

          if (existingContato) {
            const { error } = await supabase
              .from("omni_contatos")
              .update(contatoData)
              .eq("id", existingContato.id);

            if (error) throw error;
            importResult.atualizados++;
          } else {
            const { error } = await supabase
              .from("omni_contatos")
              .insert(contatoData);

            if (error) throw error;
            importResult.criados++;
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
        toast.success(`Importação concluída! ${importResult.criados} criados, ${importResult.atualizados} atualizados.`);
        onSuccess();
      } else {
        toast.warning(`Importação com avisos: ${importResult.criados + importResult.atualizados} processados, ${importResult.erros.length} erros.`);
      }

    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
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
            Importar Contatos
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Importe contatos em massa a partir de uma planilha Excel.
                <br />
                <strong>Telefones duplicados serão atualizados</strong> com os novos dados.
              </AlertDescription>
            </Alert>

            {/* Download Template */}
            <div className="space-y-2">
              <Label>1. Baixe o modelo de planilha</Label>
              <Button variant="outline" onClick={generateTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Baixar Modelo Excel
              </Button>
            </div>

            {/* Upload File */}
            <div className="space-y-2">
              <Label>2. Faça upload da planilha preenchida</Label>
              <div 
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar ou arraste o arquivo
                  </p>
                )}
              </div>
            </div>

            {/* Preview */}
            {previewData.length > 0 && !result && (
              <div className="space-y-2">
                <Label>Pré-visualização (primeiros 5 registros)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Nome</th>
                        <th className="p-2 text-left">Telefone</th>
                        <th className="p-2 text-left">E-mail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((contato, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{contato.nome || "-"}</td>
                          <td className="p-2">{contato.telefone || "-"}</td>
                          <td className="p-2">{contato.email || "-"}</td>
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
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">{progress}%</p>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-4">
                <Label>Resultado da Importação</Label>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{result.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{result.criados}</p>
                    <p className="text-xs text-muted-foreground">Criados</p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{result.atualizados}</p>
                    <p className="text-xs text-muted-foreground">Atualizados</p>
                  </div>
                </div>

                {result.erros.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <Label>{result.erros.length} erro(s)</Label>
                    </div>
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      {result.erros.map((erro, idx) => (
                        <div key={idx} className="p-2 border-b last:border-0 text-sm">
                          <span className="font-medium">Linha {erro.linha}</span>
                          <span className="text-muted-foreground"> - {erro.nome}: </span>
                          <span className="text-destructive">{erro.erro}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
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
                  Importar Contatos
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
