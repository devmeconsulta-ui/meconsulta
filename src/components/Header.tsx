import { Button } from "@/components/ui/button";
import { Menu, User, Grid3X3, MessageSquare, Search, Stethoscope, LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.avif";
import { SignupModal } from "./SignupModal";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getUserArea = () => {
    if (currentUser?.tipo === "admin") return "/admin";
    if (currentUser?.tipo === "medico") return "/medico";
    if (currentUser?.tipo === "clinica") return "/clinica";
    return "/paciente";
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img src={logo} alt="MeConsulta" className="h-8" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="/#especialidades" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <Grid3X3 className="w-5 h-5 text-primary" />
                Especialidades
              </a>
              <a href="/#depoimentos" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <MessageSquare className="w-5 h-5 text-primary" />
                Depoimentos
              </a>
              <a href="/#especialistas" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <Search className="w-5 h-5 text-primary" />
                Especialistas
              </a>
              <Link to="/sou-medico" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <Stethoscope className="w-5 h-5 text-primary" />
                Sou Médico
              </Link>
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {currentUser ? (
                <>
                  <Link to={getUserArea()}>
                    <Button variant="ghost" className="flex items-center gap-2 text-foreground font-medium">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                      {currentUser.nome.split(" ")[0]}
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLogout}
                    className="gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/entrar">
                    <Button variant="ghost" className="flex items-center gap-2 text-foreground font-medium">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                      Entrar
                    </Button>
                  </Link>
                  <Button 
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-8 font-semibold"
                    onClick={() => setSignupModalOpen(true)}
                  >
                    Inscrever-se
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <nav className="flex flex-col gap-4">
                <a href="/#especialidades" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                  <Grid3X3 className="w-4 h-4 text-primary" />
                  Especialidades
                </a>
                <a href="/#depoimentos" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Depoimentos
                </a>
                <a href="/#especialistas" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                  <Search className="w-4 h-4 text-primary" />
                  Especialistas
                </a>
                <Link to="/sou-medico" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  Sou Médico
                </Link>
                <div className="flex gap-2 pt-2">
                  {currentUser ? (
                    <>
                      <Link to={getUserArea()} className="flex-1">
                        <Button variant="ghost" className="w-full">Minha Área</Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleLogout}
                      >
                        Sair
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/entrar" className="flex-1">
                        <Button variant="ghost" className="w-full">Entrar</Button>
                      </Link>
                      <Button 
                        className="flex-1 bg-secondary text-secondary-foreground rounded-full"
                        onClick={() => setSignupModalOpen(true)}
                      >
                        Inscrever-se
                      </Button>
                    </>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <SignupModal open={signupModalOpen} onOpenChange={setSignupModalOpen} />
    </>
  );
};

export default Header;
