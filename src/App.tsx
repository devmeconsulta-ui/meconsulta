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
import AreaPaciente from "./pages/AreaPaciente";
import NotFound from "./pages/NotFound";

// Admin pages
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminMedicos from "./pages/admin/AdminMedicos";
import AdminPacientes from "./pages/admin/AdminPacientes";
import AdminConsultas from "./pages/admin/AdminConsultas";
import AdminFinanceiro from "./pages/admin/AdminFinanceiro";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes";

// Medico pages
import { MedicoLayout } from "./components/medico/MedicoLayout";
import MedicoDashboard from "./pages/medico/MedicoDashboard";
import MedicoLocais from "./pages/medico/MedicoLocais";
import MedicoAgenda from "./pages/medico/MedicoAgenda";
import MedicoPaginaPublica from "./pages/medico/MedicoPaginaPublica";
import MedicoDadosBancarios from "./pages/medico/MedicoDadosBancarios";
import MedicoAvaliacoes from "./pages/medico/MedicoAvaliacoes";
import MedicoConfiguracoes from "./pages/medico/MedicoConfiguracoes";

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
            <Route path="/paciente" element={<AreaPaciente />} />

            {/* Medico routes */}
            <Route path="/medico" element={<MedicoLayout />}>
              <Route index element={<MedicoDashboard />} />
              <Route path="locais" element={<MedicoLocais />} />
              <Route path="agenda" element={<MedicoAgenda />} />
              <Route path="pagina-publica" element={<MedicoPaginaPublica />} />
              <Route path="dados-bancarios" element={<MedicoDadosBancarios />} />
              <Route path="avaliacoes" element={<MedicoAvaliacoes />} />
              <Route path="configuracoes" element={<MedicoConfiguracoes />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
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
