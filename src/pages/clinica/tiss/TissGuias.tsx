import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Search, Eye } from "lucide-react";

export default function TissGuias() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");

  // Mock data for UI demonstration
  const guias: { id: string; numero: string; tipo: string; paciente: string; operadora: string; data: string; status: string; valor: number }[] = [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Guias TISS</h2>
          <p className="text-muted-foreground">Gerencie guias de consulta, SADT, internação e honorários</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Guia
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Guias Emitidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por nº guia, paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo de guia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="sadt">SP/SADT</SelectItem>
                <SelectItem value="internacao">Internação</SelectItem>
                <SelectItem value="honorarios">Honorários</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {guias.length > 0 ? (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Guia</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guias.map(g => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-sm">{g.numero}</TableCell>
                      <TableCell><Badge variant="outline">{g.tipo}</Badge></TableCell>
                      <TableCell>{g.paciente}</TableCell>
                      <TableCell>{g.operadora}</TableCell>
                      <TableCell>{g.data}</TableCell>
                      <TableCell><Badge>{g.status}</Badge></TableCell>
                      <TableCell className="text-right">R$ {g.valor.toFixed(2).replace(".", ",")}</TableCell>
                      <TableCell><Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhuma guia emitida ainda.</p>
              <p className="text-xs text-muted-foreground">Clique em "Nova Guia" para criar sua primeira guia TISS.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
