import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Phone, MapPin, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PacienteDetalhesModal } from "@/components/clinica/PacienteDetalhesModal";

export default function ClinicaPacientes() {
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const [search, setSearch] = useState("");
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [selectedConsultaCount, setSelectedConsultaCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: pacientes, isLoading, refetch } = useQuery({
    queryKey: ["clinica-pacientes", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      // First, get doctors linked to this clinic
      const { data: vinculos } = await supabase
        .from("clinicas_medicos")
        .select("medico_id")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);

      const medicoIds = vinculos?.map((v) => v.medico_id) || [];
      if (medicoIds.length === 0) return [];

      // Get patients with consultation count
      const { data: consultas, error } = await supabase
        .from("consultas")
        .select(`
          paciente_id,
          paciente:pacientes(
            id,
            nome,
            telefone,
            cpf,
            cidade,
            estado,
            bairro,
            data_nascimento
          )
        `)
        .in("medico_id", medicoIds)
        .not("paciente_id", "is", null);

      if (error) throw error;

      // Get unique patients with consultation count
      const pacienteMap = new Map<string, { paciente: any; consultaCount: number }>();
      consultas?.forEach((c: any) => {
        if (c.paciente) {
          const existing = pacienteMap.get(c.paciente.id);
          if (existing) {
            existing.consultaCount++;
          } else {
            pacienteMap.set(c.paciente.id, { paciente: c.paciente, consultaCount: 1 });
          }
        }
      });

      return Array.from(pacienteMap.values());
    },
    enabled: !!clinicaData?.id,
  });

  const filteredPacientes = pacientes?.filter((item: any) =>
    item.paciente.nome?.toLowerCase().includes(search.toLowerCase()) ||
    item.paciente.cpf?.includes(search)
  );

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "??";
  };

  const handleOpenDetails = (item: any) => {
    setSelectedPaciente(item.paciente);
    setSelectedConsultaCount(item.consultaCount);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
        <p className="text-muted-foreground">
          Pacientes que já realizaram consultas na clínica.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredPacientes?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum paciente encontrado.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead className="text-center">Consultas</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPacientes?.map((item: any) => (
                    <TableRow key={item.paciente.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={() => handleOpenDetails(item)}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(item.paciente.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{item.paciente.nome}</p>
                            {item.paciente.cpf && (
                              <p className="text-xs text-muted-foreground">
                                CPF: {item.paciente.cpf}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleOpenDetails(item)}>
                        {item.paciente.telefone ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.paciente.telefone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={() => handleOpenDetails(item)}>
                        {item.paciente.cidade && item.paciente.estado ? (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.paciente.cidade} - {item.paciente.estado}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center" onClick={() => handleOpenDetails(item)}>
                        <Badge variant="secondary">
                          {item.consultaCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetails(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PacienteDetalhesModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        paciente={selectedPaciente}
        consultaCount={selectedConsultaCount}
        onUpdate={() => refetch()}
      />
    </div>
  );
}
