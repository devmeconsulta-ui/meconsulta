import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Webhook, Zap, Key } from "lucide-react";
import { IntegracoesPagamentos } from "@/components/admin/integracoes/IntegracoesPagamentos";
import { IntegracoesWebhooks } from "@/components/admin/integracoes/IntegracoesWebhooks";
import { IntegracoesAutomacoes } from "@/components/admin/integracoes/IntegracoesAutomacoes";
import { IntegracoesAPI } from "@/components/admin/integracoes/IntegracoesAPI";

export default function AdminIntegracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Integrações</h2>
        <p className="text-muted-foreground">
          Configure as integrações do sistema com serviços externos
        </p>
      </div>

      <Tabs defaultValue="pagamentos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pagamentos" className="gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Pagamentos</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="w-4 h-4" />
            <span className="hidden sm:inline">Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="automacoes" className="gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Automações</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="w-4 h-4" />
            <span className="hidden sm:inline">API</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos">
          <IntegracoesPagamentos />
        </TabsContent>

        <TabsContent value="webhooks">
          <IntegracoesWebhooks />
        </TabsContent>

        <TabsContent value="automacoes">
          <IntegracoesAutomacoes />
        </TabsContent>

        <TabsContent value="api">
          <IntegracoesAPI />
        </TabsContent>
      </Tabs>
    </div>
  );
}