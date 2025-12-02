import { Button } from "@/components/ui/button";
import { Menu, User, Grid3X3, MessageSquare, Search } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-2xl font-bold">
              <span className="text-primary">me</span>
              <span className="text-secondary">consulta</span>
            </span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:block">facilidade sem mensalidade</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#especialidades" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
              <Grid3X3 className="w-4 h-4" />
              Especialidades
            </a>
            <a href="#depoimentos" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
              <MessageSquare className="w-4 h-4" />
              Depoimentos
            </a>
            <a href="#especialistas" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
              <Search className="w-4 h-4" />
              Especialistas
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Entrar
            </Button>
            <Button variant="hero" size="default">
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
                <Grid3X3 className="w-4 h-4" />
                Especialidades
              </a>
              <a href="#depoimentos" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                <MessageSquare className="w-4 h-4" />
                Depoimentos
              </a>
              <a href="#especialistas" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                <Search className="w-4 h-4" />
                Especialistas
              </a>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" className="flex-1">Entrar</Button>
                <Button variant="hero" className="flex-1">Inscrever-se</Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
