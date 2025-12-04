import { useState } from "react";
import { Plus, Search, Stethoscope, UserCheck, UserX, TrendingUp, Eye, Edit, Trash2, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const COLORS = ["#0066CC", "#FFB800", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4"];

const especialidades = [
  "Cardiologia",
  "Dermatologia",
  "Ginecologia",
  "Neurologia",
  "Oftalmologia",
  "Ortopedia",
  "Pediatria",
  "Psiquiatria",
  "Urologia",
  "Clínico Geral",
];

export default function AdminMedicos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [especialidadeFilter, setEspecialidadeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  // Fetch médicos with filters
  const { data: medicos, isLoading } = useQuery({
    queryKey: ["admin-medicos", search, statusFilter, especialidadeFilter],
    queryFn: async () => {
      let query = supabase
        .from("medicos")
        .select("*, usuario:usuarios(email)")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`nome.ilike.%${search}%,especialidade.ilike.%${search}%,crm.ilike.%${search}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("ativo", statusFilter === "ativo");
      }

      if (especialidadeFilter !== "all") {
        query = query.eq("especialidade", especialidadeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Stats
  const stats = {
    total: medicos?.length || 0,
    ativos: medicos?.filter((m) => m.ativo).length || 0,
    inativos: medicos?.filter((m) => !m.ativo).length || 0,
    valorMedio: medicos?.length
      ? medicos.reduce((acc, m) => acc + Number(m.valor_consulta), 0) / medicos.length
      : 0,
  };

  // Chart data - especialidades distribution
  const especialidadeData = medicos
    ? Object.entries(
        medicos.reduce((acc: Record<string, number>, m) => {
          const esp = m.especialidade || "Não informado";
          acc[esp] = (acc[esp] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : [];

  // Chart data - valor consulta distribution
  const valorData = medicos
    ? [
        { range: "R$ 0-100", count: medicos.filter((m) => Number(m.valor_consulta) <= 100).length },
        { range: "R$ 101-150", count: medicos.filter((m) => Number(m.valor_consulta) > 100 && Number(m.valor_consulta) <= 150).length },
        { range: "R$ 151-200", count: medicos.filter((m) => Number(m.valor_consulta) > 150 && Number(m.valor_consulta) <= 200).length },
        { range: "R$ 201+", count: medicos.filter((m) => Number(m.valor_consulta) > 200).length },
      ]
    : [];

  // Create médico
  const createMedico = useMutation({
    mutationFn: async (data: typeof formData) => {
      // First create usuario
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .insert({
          nome: data.nome,
          email: data.email,
          tipo: "medico",
          senha_hash: "123456",
          papel: "atendente",
        })
        .select()
        .single();

      if (userError) throw userError;

      // Then create medico
      const { error: medicoError } = await supabase.from("medicos").insert({
        usuario_id: usuario.id,
        nome: data.nome,
        especialidade: data.especialidade,
        crm: data.crm,
        valor_consulta: data.valor_consulta,
        percentual_repasse: data.percentual_repasse,
        pix_key: data.pix_key,
        pix_key_type: data.pix_key_type,
        ativo: true,
      });

      if (medicoError) throw medicoError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-medicos"] });
      toast.success("Médico cadastrado com sucesso!");
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
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Toggle status
  const toggleStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("medicos").update({ ativo: !ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-medicos"] });
      toast.success("Status atualizado!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    createMedico.mutate(formData);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setEspecialidadeFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="h-7 w-7" />
            Médicos
          </h1>
          <p className="text-muted-foreground">Gerencie os médicos cadastrados na plataforma</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Médico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Médico</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Dr. João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="medico@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Select
                  value={formData.especialidade}
                  onValueChange={(value) => setFormData({ ...formData, especialidade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {especialidades.map((esp) => (
                      <SelectItem key={esp} value={esp}>
                        {esp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="crm">CRM</Label>
                <Input
                  id="crm"
                  value={formData.crm}
                  onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                  placeholder="CRM/UF 00000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Consulta (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.valor_consulta}
                    onChange={(e) => setFormData({ ...formData, valor_consulta: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Repasse (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.percentual_repasse}
                    onChange={(e) => setFormData({ ...formData, percentual_repasse: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Chave Pix</Label>
                <Input
                  value={formData.pix_key}
                  onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                  placeholder="Chave PIX do médico"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo Chave Pix</Label>
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
                {createMedico.isPending ? "Cadastrando..." : "Cadastrar Médico"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Médicos</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-3xl font-bold text-green-600">{stats.ativos}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-3xl font-bold text-red-600">{stats.inativos}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Médio</p>
                <p className="text-3xl font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.valorMedio)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Especialidade</CardTitle>
          </CardHeader>
          <CardContent>
            {especialidadeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={especialidadeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {especialidadeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Valor de Consulta</CardTitle>
          </CardHeader>
          <CardContent>
            {valorData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={valorData}>
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CRM..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={especialidadeFilter} onValueChange={setEspecialidadeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas especialidades</SelectItem>
                {especialidades.map((esp) => (
                  <SelectItem key={esp} value={esp}>
                    {esp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Médicos ({medicos?.length || 0})</CardTitle>
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
                    <TableHead>Email</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>CRM</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Repasse</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicos.map((medico: any) => (
                    <TableRow key={medico.id}>
                      <TableCell className="font-medium">{medico.nome}</TableCell>
                      <TableCell>{medico.usuario?.email || "—"}</TableCell>
                      <TableCell>{medico.especialidade || "—"}</TableCell>
                      <TableCell>{medico.crm || "—"}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(medico.valor_consulta)}
                      </TableCell>
                      <TableCell>{medico.percentual_repasse}%</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={medico.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          {medico.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={medico.ativo ? "Desativar" : "Ativar"}
                            onClick={() => toggleStatus.mutate({ id: medico.id, ativo: medico.ativo })}
                          >
                            {medico.ativo ? <UserX className="h-4 w-4 text-red-600" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhum médico encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
