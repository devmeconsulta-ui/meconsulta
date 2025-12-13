import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Stethoscope } from "lucide-react";
import { toast } from "sonner";

export default function ClinicaMedicos() {
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const [search, setSearch] = useState("");

  const { data: medicos, isLoading } = useQuery({
    queryKey: ["clinica-medicos", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      const { data, error } = await supabase
        .from("clinicas_medicos")
        .select(`
          id,
          ativo,
          medico:medicos(
            id,
            nome,
            especialidade,
            crm,
            foto_url,
            valor_consulta
          )
        `)
        .eq("clinica_id", clinicaData.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicaData?.id,
  });

  const filteredMedicos = medicos?.filter((m: any) =>
    m.medico?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    m.medico?.especialidade?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Médicos Vinculados</h1>
          <p className="text-muted-foreground">
            Gerencie os médicos vinculados à sua clínica.
          </p>
        </div>
        <Button onClick={() => toast.info("Funcionalidade em desenvolvimento")}>
          <Plus className="h-4 w-4 mr-2" />
          Vincular Médico
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou especialidade..."
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
          ) : filteredMedicos?.length === 0 ? (
            <div className="text-center py-8">
              <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum médico vinculado ainda.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMedicos?.map((item: any) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {item.medico?.foto_url ? (
                          <img 
                            src={item.medico.foto_url} 
                            alt={item.medico.nome}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Stethoscope className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.medico?.nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.medico?.especialidade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CRM: {item.medico?.crm}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={item.ativo ? "default" : "secondary"}>
                            {item.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                          <span className="text-sm font-medium text-primary">
                            R$ {item.medico?.valor_consulta?.toFixed(2)}
                          </span>
                        </div>
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
