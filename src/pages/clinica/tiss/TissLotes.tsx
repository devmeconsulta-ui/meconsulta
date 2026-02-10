import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Layers, Search, Eye, Send } from "lucide-react";

export default function TissLotes() {
  const [search, setSearch] = useState("");

  const lotes: { id: string; numero: string; operadora: string; qtd_guias: number; valor_total: number; data_criacao: string; status: string }[] = [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Lotes TISS</h2>
          <p className="text-muted-foreground">Agrupe guias em lotes para envio às operadoras</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Lote
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" />Lotes Criados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar lote..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          {lotes.length > 0 ? (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Lote</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Guias</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-sm">{l.numero}</TableCell>
                      <TableCell>{l.operadora}</TableCell>
                      <TableCell>{l.qtd_guias}</TableCell>
                      <TableCell className="text-right">R$ {l.valor_total.toFixed(2).replace(".", ",")}</TableCell>
                      <TableCell>{l.data_criacao}</TableCell>
                      <TableCell><Badge>{l.status}</Badge></TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon"><Send className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum lote criado.</p>
              <p className="text-xs text-muted-foreground">Crie guias primeiro e depois agrupe-as em lotes para envio.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
