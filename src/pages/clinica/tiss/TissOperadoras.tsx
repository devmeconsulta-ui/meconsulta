import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Building2, Search, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Operadora {
  id: string;
  nome: string;
  registro_ans: string;
  cnpj: string;
  contrato: string;
  ativo: boolean;
}

export default function TissOperadoras() {
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", registro_ans: "", cnpj: "", contrato: "" });

  const handleAdd = () => {
    if (!form.nome || !form.registro_ans) {
      toast.error("Nome e Registro ANS são obrigatórios");
      return;
    }
    setOperadoras(prev => [...prev, {
      id: crypto.randomUUID(),
      ...form,
      ativo: true,
    }]);
    setForm({ nome: "", registro_ans: "", cnpj: "", contrato: "" });
    setDialogOpen(false);
    toast.success("Operadora adicionada");
  };

  const filtered = operadoras.filter(o =>
    o.nome.toLowerCase().includes(search.toLowerCase()) ||
    o.registro_ans.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Operadoras / Contratos</h2>
          <p className="text-muted-foreground">Cadastre operadoras de saúde e contratos para faturamento TISS</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nova Operadora</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Operadora</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Operadora *</Label>
                <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Unimed, Bradesco Saúde..." />
              </div>
              <div className="space-y-2">
                <Label>Registro ANS *</Label>
                <Input value={form.registro_ans} onChange={e => setForm(p => ({ ...p, registro_ans: e.target.value }))} placeholder="Nº registro ANS" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>Nº Contrato</Label>
                <Input value={form.contrato} onChange={e => setForm(p => ({ ...p, contrato: e.target.value }))} placeholder="Número do contrato" />
              </div>
              <Button onClick={handleAdd} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Operadoras Cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar operadora..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          {filtered.length > 0 ? (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Registro ANS</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(op => (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">{op.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{op.registro_ans}</TableCell>
                      <TableCell className="text-sm">{op.cnpj || "—"}</TableCell>
                      <TableCell className="text-sm">{op.contrato || "—"}</TableCell>
                      <TableCell><Badge variant={op.ativo ? "default" : "secondary"}>{op.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhuma operadora cadastrada. Clique em "Nova Operadora" para começar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
