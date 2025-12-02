import { Grid3X3, MessageSquare, Search, Facebook, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <span className="text-2xl font-bold">
                <span className="text-primary-foreground">me</span>
                <span className="text-secondary">consulta</span>
              </span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Queremos que os pacientes encontrem o médico perfeito e marquem uma consulta da maneira mais fácil. 
              A jornada do paciente deve ser prazerosa.
            </p>
          </div>

          {/* Menu */}
          <div>
            <h4 className="font-semibold mb-4">Menu</h4>
            <nav className="space-y-3">
              <a href="#especialidades" className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                <Grid3X3 className="w-4 h-4" />
                Especialidades
              </a>
              <a href="#depoimentos" className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                <MessageSquare className="w-4 h-4" />
                Depoimentos
              </a>
              <a href="#especialistas" className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                <Search className="w-4 h-4" />
                Especialistas
              </a>
            </nav>
          </div>

          {/* Social & Privacy */}
          <div>
            <h4 className="font-semibold mb-4">Siga-nos</h4>
            <div className="flex gap-3 mb-6">
              <a href="#" className="w-10 h-10 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            <h4 className="font-semibold mb-3">Privacidade</h4>
            <nav className="space-y-2">
              <a href="#" className="block text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                Termos e Condições
              </a>
              <a href="#" className="block text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                Política de Privacidade
              </a>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contato</h4>
            <div className="space-y-3 text-sm text-primary-foreground/70">
              <p className="font-medium text-primary-foreground">
                Mc Soluções e Intermediação de Serviços LTDA
              </p>
              <p>CNPJ: 54.677.548/0001-08</p>
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Rua Agapito dos Anjos 750A, Montes Claros MG
              </p>
              <a href="mailto:contato@meconsulta.site" className="flex items-center gap-2 hover:text-secondary transition-colors">
                <Mail className="w-4 h-4" />
                contato@meconsulta.site
              </a>
              <a href="tel:+553832147415" className="flex items-center gap-2 hover:text-secondary transition-colors">
                <Phone className="w-4 h-4" />
                (38) 3214-7415
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-6 text-center text-sm text-primary-foreground/50">
          <p>© 2024 MeConsulta. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
