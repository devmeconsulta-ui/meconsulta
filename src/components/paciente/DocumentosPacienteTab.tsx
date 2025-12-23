import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Stethoscope, 
  FileCheck, 
  Pill, 
  Loader2, 
  Printer, 
  Download,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PrescricaoDocumento {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: string;
  created_at: string;
  medico: { nome: string } | null;
}

interface DocumentosPacienteTabProps {
  consultaId: string;
}

export default function DocumentosPacienteTab({ consultaId }: DocumentosPacienteTabProps) {
  const [documentos, setDocumentos] = useState<PrescricaoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocumento, setSelectedDocumento] = useState<PrescricaoDocumento | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    fetchDocumentos();
  }, [consultaId]);

  async function fetchDocumentos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("prescricoes_documentos")
      .select(`
        id,
        tipo,
        titulo,
        conteudo,
        created_at,
        medico:medicos(nome)
      `)
      .eq("consulta_id", consultaId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar documentos:", error);
    } else {
      setDocumentos(data || []);
    }
    setLoading(false);
  }

  function handlePrint(documento: PrescricaoDocumento) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Permita pop-ups para imprimir");
      return;
    }

    const formattedDate = format(new Date(documento.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${documento.titulo}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .titulo {
            font-size: 24px;
            font-weight: bold;
            color: #1a56db;
          }
          .conteudo {
            white-space: pre-wrap;
            margin-bottom: 40px;
          }
          .assinatura {
            margin-top: 60px;
            text-align: center;
          }
          .assinatura-linha {
            width: 300px;
            border-top: 1px solid #333;
            margin: 0 auto 10px;
          }
          .data {
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="titulo">${documento.titulo}</div>
          <div class="data">Emitido em: ${formattedDate}</div>
        </div>
        <div class="conteudo">${documento.conteudo}</div>
        <div class="assinatura">
          <div class="assinatura-linha"></div>
          <div>Médico(a): ${documento.medico?.nome || "N/A"}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  function handleDownload(documento: PrescricaoDocumento) {
    const formattedDate = format(new Date(documento.created_at), "dd-MM-yyyy", { locale: ptBR });
    const blob = new Blob([documento.conteudo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documento.titulo.replace(/\s+/g, "_")}_${formattedDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function openViewModal(documento: PrescricaoDocumento) {
    setSelectedDocumento(documento);
    setIsViewModalOpen(true);
  }

  function getTipoIcon(tipo: string) {
    switch (tipo) {
      case "exame":
        return <Stethoscope className="w-4 h-4" />;
      case "atestado":
        return <FileCheck className="w-4 h-4" />;
      case "receita":
        return <Pill className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  }

  function getTipoBadgeColor(tipo: string) {
    switch (tipo) {
      case "exame":
        return "bg-blue-500/20 text-blue-700 border-blue-500/30";
      case "atestado":
        return "bg-green-500/20 text-green-700 border-green-500/30";
      case "receita":
        return "bg-purple-500/20 text-purple-700 border-purple-500/30";
      default:
        return "";
    }
  }

  function getTipoLabel(tipo: string) {
    switch (tipo) {
      case "exame":
        return "Pedido de Exame";
      case "atestado":
        return "Atestado";
      case "receita":
        return "Receita";
      default:
        return tipo;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (documentos.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Nenhum documento emitido nesta consulta</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Documentos emitidos ({documentos.length})
      </p>
      {documentos.map((doc) => (
        <Card 
          key={doc.id} 
          className="border-l-4 hover:shadow-md transition-all cursor-pointer"
          style={{ borderLeftColor: doc.tipo === "exame" ? "#3b82f6" : doc.tipo === "atestado" ? "#22c55e" : "#a855f7" }}
          onClick={() => openViewModal(doc)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge className={`${getTipoBadgeColor(doc.tipo)} border text-xs`}>
                    {getTipoIcon(doc.tipo)}
                    <span className="ml-1">{getTipoLabel(doc.tipo)}</span>
                  </Badge>
                </div>
                <p className="font-medium text-sm truncate">{doc.titulo}</p>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); handlePrint(doc); }}
                  title="Imprimir"
                >
                  <Printer className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                  title="Baixar"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Modal de visualização */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedDocumento && getTipoIcon(selectedDocumento.tipo)}
              {selectedDocumento?.titulo}
            </DialogTitle>
          </DialogHeader>
          {selectedDocumento && (
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <Badge className={`${getTipoBadgeColor(selectedDocumento.tipo)} border`}>
                    {getTipoLabel(selectedDocumento.tipo)}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(selectedDocumento.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {selectedDocumento.conteudo}
                  </pre>
                </div>
                <p className="text-sm text-muted-foreground">
                  Emitido por: {selectedDocumento.medico?.nome || "Médico"}
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => handlePrint(selectedDocumento)} className="gap-2 flex-1">
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload(selectedDocumento)} className="gap-2 flex-1">
                    <Download className="w-4 h-4" />
                    Baixar
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
