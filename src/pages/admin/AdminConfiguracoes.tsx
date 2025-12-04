import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function AdminConfiguracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Configure as preferências do sistema</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Em Desenvolvimento</h3>
          <p className="text-muted-foreground text-center max-w-md">
            As configurações do sistema estão sendo preparadas. Em breve você poderá configurar
            valores padrão, integrações e preferências gerais da plataforma.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
