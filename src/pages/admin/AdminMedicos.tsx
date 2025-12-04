import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useMedicos, useCreateMedico } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AdminMedicos() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: medicos, isLoading } = useMedicos(search);
  const createMedico = useCreateMedico();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    especialidade: "",
    crm: "",
    valor_consulta: 160,
    percentual_repasse: 75,
    pix_key: "",
    pix_key_type: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMedico.mutateAsync(formData);
      toast({
        title: "Médico criado",
        description: "O médico foi cadastrado com sucesso.",
      });
      setIsDialogOpen(false);
      setFormData({
        nome: "",
        email: "",
        especialidade: "",
        crm: "",
        valor_consulta: 160,
        percentual_repasse: 75,
        pix_key: "",
        pix_key_type: "",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar médico.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Médicos</h1>
          <p className="text-muted-foreground">Gerencie os médicos cadastrados</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Médico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Médico</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="especialidade">Especialidade</Label>
                <Input
                  id="especialidade"
                  value={formData.especialidade}
                  onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crm">CRM</Label>
                <Input
                  id="crm"
                  value={formData.crm}
                  onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_consulta">Valor Consulta (R$)</Label>
                  <Input
                    id="valor_consulta"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.valor_consulta}
                    onChange={(e) =>
                      setFormData({ ...formData, valor_consulta: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentual_repasse">Repasse (%)</Label>
                  <Input
                    id="percentual_repasse"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.percentual_repasse}
                    onChange={(e) =>
                      setFormData({ ...formData, percentual_repasse: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix_key">Chave Pix</Label>
                <Input
                  id="pix_key"
                  value={formData.pix_key}
                  onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix_key_type">Tipo da Chave Pix</Label>
                <Select
                  value={formData.pix_key_type}
                  onValueChange={(value) => setFormData({ ...formData, pix_key_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="PHONE">Telefone</SelectItem>
                    <SelectItem value="RANDOM">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMedico.isPending}>
                {createMedico.isPending ? "Criando..." : "Cadastrar Médico"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou especialidade..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Médicos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : medicos && medicos.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Valor Consulta</TableHead>
                    <TableHead>Repasse</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicos.map((medico) => (
                    <TableRow key={medico.id}>
                      <TableCell className="font-medium">{medico.nome}</TableCell>
                      <TableCell>{medico.especialidade || "—"}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(medico.valor_consulta)}
                      </TableCell>
                      <TableCell>{medico.percentual_repasse}%</TableCell>
                      <TableCell>
                        <Badge variant={medico.ativo ? "default" : "secondary"}>
                          {medico.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhum médico cadastrado ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
