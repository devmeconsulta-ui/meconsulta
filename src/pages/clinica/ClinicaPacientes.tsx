import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users } from "lucide-react";

export default function ClinicaPacientes() {
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const [search, setSearch] = useState("");

  const { data: pacientes, isLoading } = useQuery({
    queryKey: ["clinica-pacientes", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      // Get unique patients from consultations
      const { data: consultas, error } = await supabase
        .from("consultas")
        .select(`
          paciente:pacientes(
            id,
            nome,
            telefone,
            cpf,
            cidade,
            estado
          )
        `)
        .eq("clinica_id", clinicaData.id)
        .not("paciente_id", "is", null);

      if (error) throw error;

      // Get unique patients
      const uniquePacientes = new Map();
      consultas?.forEach((c: any) => {
        if (c.paciente && !uniquePacientes.has(c.paciente.id)) {
          uniquePacientes.set(c.paciente.id, c.paciente);
        }
      });

      return Array.from(uniquePacientes.values());
    },
    enabled: !!clinicaData?.id,
  });

  const filteredPacientes = pacientes?.filter((p: any) =>
    p.nome?.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search)
  );

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
          <div className="relative">
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
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum paciente encontrado.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPacientes?.map((paciente: any) => (
                <Card key={paciente.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{paciente.nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          {paciente.telefone || "Sem telefone"}
                        </p>
                        {paciente.cidade && paciente.estado && (
                          <p className="text-xs text-muted-foreground">
                            {paciente.cidade} - {paciente.estado}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
