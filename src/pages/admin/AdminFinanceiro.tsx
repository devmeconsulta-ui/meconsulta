import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function AdminFinanceiro() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground">Gestão financeira da plataforma</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Em Desenvolvimento</h3>
          <p className="text-muted-foreground text-center max-w-md">
            A área financeira está sendo preparada. Em breve você poderá visualizar receitas,
            repasses para médicos e relatórios financeiros detalhados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
