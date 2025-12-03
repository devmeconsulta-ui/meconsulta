import { Grid3X3, MessageSquare, Search } from "lucide-react";
import logo from "@/assets/logo.avif";

const Footer = () => {
  return (
    <footer className="py-10" style={{ backgroundColor: 'hsl(210, 11%, 85%)' }}>
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-6">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <div className="mb-6">
              <img src={logo} alt="MeConsulta" className="h-8" />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(214, 25%, 35%)' }}>
              Queremos que os pacientes encontrem o médico perfeito e marquem uma consulta da maneira mais fácil. 
              A jornada do paciente deve ser prazerosa e é por isso que estamos sempre ao lado dele: para ajudá-lo a encontrar o melhor atendimento possível. Qualquer hora qualquer lugar.
            </p>
          </div>

          {/* Menu */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Menu</h4>
            <nav className="space-y-3">
              <a href="#especialidades" className="flex items-center gap-2 text-sm hover:text-primary transition-colors" style={{ color: 'hsl(214, 25%, 35%)' }}>
                <Grid3X3 className="w-4 h-4 text-primary" />
                Especialidades
              </a>
              <a href="#depoimentos" className="flex items-center gap-2 text-sm hover:text-primary transition-colors" style={{ color: 'hsl(214, 25%, 35%)' }}>
                <MessageSquare className="w-4 h-4 text-primary" />
                Depoimentos
              </a>
              <a href="#especialistas" className="flex items-center gap-2 text-sm hover:text-primary transition-colors" style={{ color: 'hsl(214, 25%, 35%)' }}>
                <Search className="w-4 h-4 text-primary" />
                Especialistas
              </a>
            </nav>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Siga-nos</h4>
            <nav className="space-y-3">
              <a href="#" className="block text-sm hover:text-primary transition-colors" style={{ color: 'hsl(214, 25%, 35%)' }}>
                Facebook
              </a>
              <a href="#" className="block text-sm hover:text-primary transition-colors" style={{ color: 'hsl(214, 25%, 35%)' }}>
                Instagram
              </a>
              <a href="#" className="block text-sm hover:text-primary transition-colors" style={{ color: 'hsl(214, 25%, 35%)' }}>
                Linkedin
              </a>
            </nav>
          </div>

          {/* Privacy */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Privacidade</h4>
            <nav className="space-y-3">
              <a href="#" className="block text-sm hover:text-primary transition-colors" style={{ color: 'hsl(214, 25%, 35%)' }}>
                Termos e Condições
              </a>
              <a href="#" className="block text-sm hover:text-primary transition-colors" style={{ color: 'hsl(214, 25%, 35%)' }}>
                Política de Privacidade
              </a>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Contato</h4>
            <div className="space-y-2 text-sm" style={{ color: 'hsl(214, 25%, 35%)' }}>
              <p>Mc Soluções e Intermediação de Serviços LTDA</p>
              <p>CNPJ: 54.677.548/0001-08</p>
              <p>Rua Agapito dos Anjos 750A, Montes Claros MG</p>
              <p className="pt-2">
                <a href="mailto:contato@meconsulta.site" className="text-primary hover:underline">
                  contato@meconsulta.site
                </a>
              </p>
              <p>(38) 3214-7415</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;