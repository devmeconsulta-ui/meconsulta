import { Button } from "@/components/ui/button";
import { Menu, User, Grid3X3, MessageSquare, Search } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.avif";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img src={logo} alt="MeConsulta" className="h-8" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            <a href="#especialidades" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <Grid3X3 className="w-5 h-5 text-primary" />
              Especialidades
            </a>
            <a href="#depoimentos" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <MessageSquare className="w-5 h-5 text-primary" />
              Depoimentos
            </a>
            <a href="#especialistas" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <Search className="w-5 h-5 text-primary" />
              Especialistas
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" className="flex items-center gap-2 text-foreground font-medium">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              Entrar
            </Button>
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-8 font-semibold">
              Inscrever-se
            </Button>
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
              <a href="#especialidades" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                <Grid3X3 className="w-4 h-4 text-primary" />
                Especialidades
              </a>
              <a href="#depoimentos" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                <MessageSquare className="w-4 h-4 text-primary" />
                Depoimentos
              </a>
              <a href="#especialistas" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                <Search className="w-4 h-4 text-primary" />
                Especialistas
              </a>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" className="flex-1">Entrar</Button>
                <Button className="flex-1 bg-secondary text-secondary-foreground rounded-full">Inscrever-se</Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;