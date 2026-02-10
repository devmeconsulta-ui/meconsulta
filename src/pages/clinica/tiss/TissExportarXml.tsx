import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCode, Download, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function TissExportarXml() {
  const [operadora, setOperadora] = useState("");
  const [periodo, setPeriodo] = useState("");

  const exportacoes: { id: string; arquivo: string; operadora: string; lote: string; data: string; status: string }[] = [];

  const handleExport = () => {
    if (!operadora) {
      toast.error("Selecione uma operadora");
      return;
    }
    toast.info("Funcionalidade de exportação XML será habilitada quando houver lotes fechados.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Exportar XML TISS</h2>
        <p className="text-muted-foreground">Gere arquivos XML no padrão TISS para envio às operadoras</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileCode className="w-5 h-5" />Gerar Exportação</CardTitle>
          <CardDescription>Selecione a operadora e o período para gerar o XML</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Operadora</Label>
              <Select value={operadora} onValueChange={setOperadora}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma operadora cadastrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                  <SelectItem value="trimestre">Último Trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExport} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Gerar XML
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Exportações</CardTitle>
        </CardHeader>
        <CardContent>
          {exportacoes.length > 0 ? (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportacoes.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-sm">{e.arquivo}</TableCell>
                      <TableCell>{e.operadora}</TableCell>
                      <TableCell>{e.lote}</TableCell>
                      <TableCell>{e.data}</TableCell>
                      <TableCell><Badge>{e.status}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <FileCode className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhuma exportação realizada.</p>
              <p className="text-xs text-muted-foreground">Crie lotes com guias e exporte em formato XML TISS.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
