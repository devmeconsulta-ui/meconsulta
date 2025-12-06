import { useState } from "react";
import { DollarSign, Wallet, FileBarChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminFinanceiro from "./AdminFinanceiro";
import AdminRepasses from "./AdminRepasses";
import AdminFinanceiroRelatorios from "./AdminFinanceiroRelatorios";

export default function AdminFinanceiroPage() {
  const [activeTab, setActiveTab] = useState("visao-geral");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-primary" />
          Gestão Financeira
        </h1>
        <p className="text-muted-foreground">
          Visão completa de receitas, repasses e relatórios financeiros
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="visao-geral" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="repasses" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span>Repasses</span>
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2">
            <FileBarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
            <span className="sm:hidden">Rel.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-6">
          <AdminFinanceiro />
        </TabsContent>

        <TabsContent value="repasses" className="mt-6">
          <AdminRepasses />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-6">
          <AdminFinanceiroRelatorios />
        </TabsContent>
      </Tabs>
    </div>
  );
}
