import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, CreditCard, Search } from "lucide-react";
import { toast } from "sonner";

interface Carteirinha {
  id: string;
  paciente_nome: string;
  numero_carteirinha: string;
  operadora: string;
  validade: string;
  plano: string;
}

export default function TissCarteirinhas() {
  const [carteirinhas, setCarteirinhas] = useState<Carteirinha[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ paciente_nome: "", numero_carteirinha: "", operadora: "", validade: "", plano: "" });

  const handleAdd = () => {
    if (!form.paciente_nome || !form.numero_carteirinha) {
      toast.error("Paciente e número da carteirinha são obrigatórios");
      return;
    }
    setCarteirinhas(prev => [...prev, { id: crypto.randomUUID(), ...form }]);
    setForm({ paciente_nome: "", numero_carteirinha: "", operadora: "", validade: "", plano: "" });
    setDialogOpen(false);
    toast.success("Carteirinha cadastrada");
  };

  const filtered = carteirinhas.filter(c =>
    c.paciente_nome.toLowerCase().includes(search.toLowerCase()) ||
    c.numero_carteirinha.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Carteirinhas</h2>
          <p className="text-muted-foreground">Gerencie as carteirinhas de convênio dos pacientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nova Carteirinha</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Carteirinha</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Paciente *</Label>
                <Input value={form.paciente_nome} onChange={e => setForm(p => ({ ...p, paciente_nome: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Nº Carteirinha *</Label>
                <Input value={form.numero_carteirinha} onChange={e => setForm(p => ({ ...p, numero_carteirinha: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Operadora</Label>
                <Input value={form.operadora} onChange={e => setForm(p => ({ ...p, operadora: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Input value={form.plano} onChange={e => setForm(p => ({ ...p, plano: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Validade</Label>
                <Input type="date" value={form.validade} onChange={e => setForm(p => ({ ...p, validade: e.target.value }))} />
              </div>
              <Button onClick={handleAdd} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Carteirinhas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por paciente ou número..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          {filtered.length > 0 ? (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Nº Carteirinha</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Validade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.paciente_nome}</TableCell>
                      <TableCell className="font-mono text-sm">{c.numero_carteirinha}</TableCell>
                      <TableCell>{c.operadora || "—"}</TableCell>
                      <TableCell>{c.plano || "—"}</TableCell>
                      <TableCell>{c.validade || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhuma carteirinha cadastrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
