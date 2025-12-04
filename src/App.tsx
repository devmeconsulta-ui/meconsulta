import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import SouMedico from "./pages/SouMedico";
import BuscarMedicos from "./pages/BuscarMedicos";
import PerfilMedico from "./pages/PerfilMedico";
import Checkout from "./pages/Checkout";
import Entrar from "./pages/Entrar";
import AreaMedico from "./pages/AreaMedico";
import AreaPaciente from "./pages/AreaPaciente";
import NotFound from "./pages/NotFound";

// Admin pages
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMedicos from "./pages/admin/AdminMedicos";
import AdminPacientes from "./pages/admin/AdminPacientes";
import AdminConsultas from "./pages/admin/AdminConsultas";
import AdminFinanceiro from "./pages/admin/AdminFinanceiro";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/sou-medico" element={<SouMedico />} />
            <Route path="/buscar-medicos" element={<BuscarMedicos />} />
            <Route path="/medico/:id" element={<PerfilMedico />} />
            <Route path="/checkout/:id" element={<Checkout />} />
            <Route path="/entrar" element={<Entrar />} />

            {/* User area routes */}
            <Route path="/medico" element={<AreaMedico />} />
            <Route path="/paciente" element={<AreaPaciente />} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="medicos" element={<AdminMedicos />} />
              <Route path="pacientes" element={<AdminPacientes />} />
              <Route path="consultas" element={<AdminConsultas />} />
              <Route path="financeiro" element={<AdminFinanceiro />} />
              <Route path="configuracoes" element={<AdminConfiguracoes />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
