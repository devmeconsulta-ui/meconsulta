import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import SouMedico from "./pages/SouMedico";
import BuscarMedicos from "./pages/BuscarMedicos";
import PerfilMedico from "./pages/PerfilMedico";
import Checkout from "./pages/Checkout";
import Pagamento from "./pages/Pagamento";
import Entrar from "./pages/Entrar";
import NotFound from "./pages/NotFound";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import TermosUso from "./pages/TermosUso";

// Admin pages
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminClinicas from "./pages/admin/AdminClinicas";
import AdminMedicos from "./pages/admin/AdminMedicos";
import AdminPacientes from "./pages/admin/AdminPacientes";
import AdminConsultas from "./pages/admin/AdminConsultas";
import AdminFinanceiroPage from "./pages/admin/AdminFinanceiroPage";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes";
import AdminIntegracoes from "./pages/admin/AdminIntegracoes";

// Medico pages
import { MedicoLayout } from "./components/medico/MedicoLayout";
import MedicoDashboard from "./pages/medico/MedicoDashboard";
import MedicoConsultas from "./pages/medico/MedicoConsultas";
import MedicoLocais from "./pages/medico/MedicoLocais";
import MedicoAgenda from "./pages/medico/MedicoAgenda";
import MedicoFinanceiro from "./pages/medico/MedicoFinanceiro";
import MedicoUsuariosClinica from "./pages/medico/MedicoUsuariosClinica";
import MedicoPaginaPublica from "./pages/medico/MedicoPaginaPublica";
import MedicoDadosBancarios from "./pages/medico/MedicoDadosBancarios";
import MedicoAvaliacoes from "./pages/medico/MedicoAvaliacoes";
import MedicoConfiguracoes from "./pages/medico/MedicoConfiguracoes";
import MedicoChat from "./pages/medico/MedicoChat";

// Paciente pages
import { PacienteLayout } from "./components/paciente/PacienteLayout";
import PacienteDashboard from "./pages/paciente/PacienteDashboard";
import PacienteConsultas from "./pages/paciente/PacienteConsultas";
import PacienteMarcar from "./pages/paciente/PacienteMarcar";
import PacienteFavoritos from "./pages/paciente/PacienteFavoritos";
import PacientePerfil from "./pages/paciente/PacientePerfil";
import PacienteHistorico from "./pages/paciente/PacienteHistorico";
import PacienteNotificacoes from "./pages/paciente/PacienteNotificacoes";
import PacienteConfiguracoes from "./pages/paciente/PacienteConfiguracoes";
import PacienteMeConsultaPay from "./pages/paciente/PacienteMeConsultaPay";

// Clinica pages
import { ClinicaLayout } from "./components/clinica/ClinicaLayout";
import ClinicaDashboard from "./pages/clinica/ClinicaDashboard";
import ClinicaMedicos from "./pages/clinica/ClinicaMedicos";
import ClinicaConsultas from "./pages/clinica/ClinicaConsultas";
import ClinicaPacientes from "./pages/clinica/ClinicaPacientes";
import ClinicaLocais from "./pages/clinica/ClinicaLocais";
import ClinicaAgenda from "./pages/clinica/ClinicaAgenda";
import ClinicaFinanceiro from "./pages/clinica/ClinicaFinanceiro";
import ClinicaRelatorios from "./pages/clinica/ClinicaRelatorios";
import ClinicaDadosBancarios from "./pages/clinica/ClinicaDadosBancarios";
import ClinicaAvaliacoes from "./pages/clinica/ClinicaAvaliacoes";
import ClinicaUsuarios from "./pages/clinica/ClinicaUsuarios";
import ClinicaConfiguracoes from "./pages/clinica/ClinicaConfiguracoes";
import ClinicaChat from "./pages/clinica/ClinicaChat";
import ClinicaCRM from "./pages/clinica/ClinicaCRM";

// Omnichannel pages
import OmniDashboard from "./pages/clinica/omnichannel/OmniDashboard";
import OmniFilas from "./pages/clinica/omnichannel/OmniFilas";
import OmniAtendimentos from "./pages/clinica/omnichannel/OmniAtendimentos";
import OmniContatos from "./pages/clinica/omnichannel/OmniContatos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
            <Route path="/pagamento/:consultaId" element={<Pagamento />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/termos-uso" element={<TermosUso />} />
            {/* Paciente routes */}
            <Route path="/paciente" element={<PacienteLayout />}>
              <Route index element={<PacienteDashboard />} />
              <Route path="consultas" element={<PacienteConsultas />} />
              <Route path="marcar" element={<PacienteMarcar />} />
              <Route path="meconsulta-pay" element={<PacienteMeConsultaPay />} />
              <Route path="favoritos" element={<PacienteFavoritos />} />
              <Route path="historico" element={<PacienteHistorico />} />
              <Route path="notificacoes" element={<PacienteNotificacoes />} />
              <Route path="perfil" element={<PacientePerfil />} />
              <Route path="configuracoes" element={<PacienteConfiguracoes />} />
            </Route>

            {/* Medico routes */}
            <Route path="/medico" element={<MedicoLayout />}>
              <Route index element={<MedicoDashboard />} />
              <Route path="consultas" element={<MedicoConsultas />} />
              <Route path="locais" element={<MedicoLocais />} />
              <Route path="agenda" element={<MedicoAgenda />} />
              <Route path="financeiro" element={<MedicoFinanceiro />} />
              <Route path="usuarios-clinica" element={<MedicoUsuariosClinica />} />
              <Route path="pagina-publica" element={<MedicoPaginaPublica />} />
              <Route path="dados-bancarios" element={<MedicoDadosBancarios />} />
              <Route path="avaliacoes" element={<MedicoAvaliacoes />} />
              <Route path="chat" element={<MedicoChat />} />
              <Route path="configuracoes" element={<MedicoConfiguracoes />} />
            </Route>

            {/* Clinica routes */}
            <Route path="/clinica" element={<ClinicaLayout />}>
              <Route index element={<ClinicaDashboard />} />
              <Route path="crm" element={<ClinicaCRM />} />
              <Route path="omnichannel" element={<OmniDashboard />} />
              <Route path="omnichannel/filas" element={<OmniFilas />} />
              <Route path="omnichannel/atendimentos" element={<OmniAtendimentos />} />
              <Route path="omnichannel/contatos" element={<OmniContatos />} />
              <Route path="medicos" element={<ClinicaMedicos />} />
              <Route path="consultas" element={<ClinicaConsultas />} />
              <Route path="pacientes" element={<ClinicaPacientes />} />
              <Route path="locais" element={<ClinicaLocais />} />
              <Route path="agenda" element={<ClinicaAgenda />} />
              <Route path="financeiro" element={<ClinicaFinanceiro />} />
              <Route path="relatorios" element={<ClinicaRelatorios />} />
              <Route path="dados-bancarios" element={<ClinicaDadosBancarios />} />
              <Route path="avaliacoes" element={<ClinicaAvaliacoes />} />
              <Route path="usuarios" element={<ClinicaUsuarios />} />
              <Route path="chat" element={<ClinicaChat />} />
              <Route path="configuracoes" element={<ClinicaConfiguracoes />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
              <Route path="clinicas" element={<AdminClinicas />} />
              <Route path="medicos" element={<AdminMedicos />} />
              <Route path="pacientes" element={<AdminPacientes />} />
              <Route path="consultas" element={<AdminConsultas />} />
              <Route path="financeiro" element={<AdminFinanceiroPage />} />
              <Route path="configuracoes" element={<AdminConfiguracoes />} />
              <Route path="integracoes" element={<AdminIntegracoes />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
