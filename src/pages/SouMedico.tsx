import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  DollarSign, 
  Calendar, 
  Users, 
  TrendingUp, 
  Stethoscope,
  Star,
  Shield,
  Clock,
  Zap,
  ArrowRight,
  Play,
  BadgeCheck,
  HeartPulse,
  Smartphone,
  BarChart3
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import doctorImage from "@/assets/doctor-sou-medico.png";

const SouMedico = () => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState(15);
  const consultationValue = 160;
  const doctorEarning = 120;
  
  const totalEarning = consultations * doctorEarning;
  const monthlyEarning = totalEarning * 4;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCTA = () => {
    window.open('https://wa.me/5511999999999?text=Olá! Sou médico e tenho interesse em ser parceiro MeConsulta.', '_blank');
  };

  const stats = [
    { number: "500+", label: "Médicos Parceiros" },
    { number: "50mil+", label: "Consultas Realizadas" },
    { number: "4.9", label: "Avaliação Média", icon: Star },
    { number: "R$2M+", label: "Repassados aos Médicos" }
  ];

  const benefits = [
    {
      icon: Calendar,
      title: "Agenda Inteligente 24h",
      description: "Sistema automatizado que preenche sua agenda mesmo enquanto você dorme."
    },
    {
      icon: Users,
      title: "Base de Pacientes Qualificada",
      description: "Conectamos você a pacientes que realmente precisam do seu atendimento."
    },
    {
      icon: Shield,
      title: "Pagamento 100% Garantido",
      description: "Receba semanalmente sem preocupações. Nós cuidamos da cobrança."
    },
    {
      icon: Smartphone,
      title: "Gestão Simplificada",
      description: "Dashboard completo para gerenciar consultas, pacientes e finanças."
    },
    {
      icon: TrendingUp,
      title: "Visibilidade Online",
      description: "Perfil otimizado que aparece nas buscas de pacientes da sua região."
    },
    {
      icon: BarChart3,
      title: "Relatórios Detalhados",
      description: "Acompanhe seu desempenho com métricas e insights valiosos."
    }
  ];

  const testimonials = [
    {
      name: "Dra. Marina Santos",
      specialty: "Cardiologista",
      location: "São Paulo, SP",
      text: "Em 3 meses aumentei minha carteira de pacientes em 40%. A plataforma é intuitiva e o suporte é excelente.",
      rating: 5,
      earnings: "R$ 12.000/mês"
    },
    {
      name: "Dr. Ricardo Oliveira",
      specialty: "Dermatologista",
      location: "Rio de Janeiro, RJ",
      text: "O MeConsulta transformou minha rotina. Agenda sempre cheia e pagamentos em dia, sem dor de cabeça.",
      rating: 5,
      earnings: "R$ 18.500/mês"
    },
    {
      name: "Dra. Camila Ferreira",
      specialty: "Nutricionista",
      location: "Belo Horizonte, MG",
      text: "Finalmente posso focar no que importa: atender bem meus pacientes. A gestão ficou muito mais fácil.",
      rating: 5,
      earnings: "R$ 8.200/mês"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Cadastre-se",
      description: "Preencha seus dados e especialidade em menos de 5 minutos."
    },
    {
      number: "02",
      title: "Configure sua Agenda",
      description: "Defina seus horários disponíveis e valor da consulta."
    },
    {
      number: "03",
      title: "Receba Pacientes",
      description: "Comece a receber agendamentos e aumente seus ganhos."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section - Impactante */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 py-16 lg:py-24">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              <div className="text-primary-foreground">
                {/* Badge de Urgência */}
                <div className="inline-flex items-center gap-2 bg-secondary/20 backdrop-blur-sm border border-secondary/30 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Zap className="w-4 h-4" />
                  <span>Vagas limitadas na sua região</span>
                </div>
                
                <h1 className="text-3xl lg:text-5xl xl:text-6xl font-bold mb-6 leading-tight">
                  Aumente seus ganhos em até{" "}
                  <span className="text-secondary relative">
                    300%
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                      <path d="M2 10C50 2 150 2 198 10" stroke="hsl(var(--secondary))" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  </span>
                  {" "}com o MeConsulta
                </h1>
                
                <p className="text-lg lg:text-xl mb-8 opacity-90 leading-relaxed">
                  Junte-se a mais de <strong>500 médicos</strong> que já transformaram suas carreiras. 
                  Agenda sempre cheia, pagamentos garantidos e zero burocracia.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Button 
                    size="lg" 
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    onClick={handleCTA}
                  >
                    Quero Aumentar Meus Ganhos
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-full px-8 py-6 text-lg"
                    onClick={() => scrollToSection('como-funciona')}
                  >
                    <Play className="mr-2 w-5 h-5" />
                    Ver Como Funciona
                  </Button>
                </div>
                
                {/* Trust Badges */}
                <div className="flex items-center gap-6 text-sm opacity-80">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-secondary" />
                    <span>100% Seguro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-secondary" />
                    <span>Cadastro em 5 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-5 h-5 text-secondary" />
                    <span>Sem mensalidade</span>
                  </div>
                </div>
              </div>
              
              <div className="relative flex justify-center lg:justify-end">
                {/* Card flutuante com stats */}
                <div className="absolute -left-4 top-10 bg-white rounded-2xl shadow-2xl p-4 z-20 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ganhos este mês</p>
                      <p className="text-lg font-bold text-foreground">R$ 15.840</p>
                    </div>
                  </div>
                </div>
                
                {/* Card de consultas */}
                <div className="absolute -right-4 bottom-20 bg-white rounded-2xl shadow-2xl p-4 z-20 animate-float" style={{ animationDelay: "1s" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nova consulta</p>
                      <p className="text-sm font-semibold text-foreground">João Silva - 14:30</p>
                    </div>
                  </div>
                </div>
                
                <img 
                  src={doctorImage}
                  alt="Médica profissional usando o MeConsulta"
                  className="rounded-3xl shadow-2xl max-w-xs lg:max-w-sm border-4 border-white/20"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Stats */}
        <section className="py-8 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {stat.icon && <stat.icon className="w-5 h-5 text-secondary fill-secondary" />}
                    <p className="text-2xl lg:text-3xl font-bold text-primary">{stat.number}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 lg:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block bg-primary/10 text-primary text-sm font-medium px-4 py-1 rounded-full mb-4">
                Por que escolher o MeConsulta?
              </span>
              <h2 className="text-2xl lg:text-4xl font-bold mb-4 text-foreground">
                Tudo que você precisa para{" "}
                <span className="text-primary">crescer sua carreira</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Ferramentas completas para você focar no que realmente importa: cuidar dos seus pacientes.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {benefits.map((benefit, index) => (
                <div 
                  key={index}
                  className="group bg-card p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-border/50"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <benefit.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Calculator Section - Interativo */}
        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <span className="inline-block bg-secondary/20 text-secondary-foreground text-sm font-medium px-4 py-1 rounded-full mb-4">
                    💰 Calculadora de Ganhos
                  </span>
                  <h2 className="text-2xl lg:text-4xl font-bold mb-4 text-foreground">
                    Descubra seu potencial de{" "}
                    <span className="text-secondary">faturamento</span>
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    Simule agora quanto você pode ganhar por mês com o MeConsulta. 
                    Sem surpresas, sem taxas escondidas.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-foreground">Sem taxa de adesão</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-foreground">Sem mensalidade</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-foreground">Pagamento semanal garantido via PIX</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-foreground">Você recebe 75% do valor da consulta</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-3xl shadow-2xl p-8 border border-border">
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Quantas consultas por semana você deseja fazer?
                    </label>
                    <div className="relative">
                      <Input 
                        type="number"
                        value={consultations}
                        onChange={(e) => setConsultations(Number(e.target.value) || 0)}
                        className="text-3xl font-bold text-center h-20 text-primary border-2 border-primary/20 focus:border-primary"
                        min={1}
                        max={100}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        consultas
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="50" 
                      value={consultations}
                      onChange={(e) => setConsultations(Number(e.target.value))}
                      className="w-full mt-4 accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1</span>
                      <span>50</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-muted rounded-xl">
                      <span className="text-muted-foreground">Valor da consulta</span>
                      <span className="text-lg font-semibold text-foreground">R$ {consultationValue},00</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-muted rounded-xl">
                      <span className="text-muted-foreground">Você recebe por consulta</span>
                      <span className="text-lg font-semibold text-primary">R$ {doctorEarning},00</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-muted rounded-xl">
                      <span className="text-muted-foreground">Ganho semanal</span>
                      <span className="text-xl font-bold text-primary">R$ {totalEarning.toLocaleString('pt-BR')},00</span>
                    </div>

                    <div className="flex justify-between items-center p-5 bg-gradient-to-r from-secondary/20 to-secondary/10 rounded-xl border-2 border-secondary">
                      <div>
                        <span className="text-sm text-muted-foreground">Ganho mensal estimado</span>
                        <p className="text-3xl font-bold text-secondary">
                          R$ {monthlyEarning.toLocaleString('pt-BR')},00
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">por mês</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full mt-6 bg-primary hover:bg-primary/90 rounded-full py-6 text-lg font-semibold"
                    onClick={handleCTA}
                  >
                    Começar a Ganhar Agora
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="como-funciona" className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block bg-primary/10 text-primary text-sm font-medium px-4 py-1 rounded-full mb-4">
                Simples e Rápido
              </span>
              <h2 className="text-2xl lg:text-4xl font-bold text-foreground">
                Comece em <span className="text-primary">3 passos</span>
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {steps.map((step, index) => (
                <div key={index} className="relative text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground text-2xl font-bold rounded-2xl mb-4">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
                  )}
                  <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block bg-primary/10 text-primary text-sm font-medium px-4 py-1 rounded-full mb-4">
                Depoimentos Reais
              </span>
              <h2 className="text-2xl lg:text-4xl font-bold text-foreground">
                O que nossos <span className="text-primary">médicos parceiros</span> dizem
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index}
                  className="bg-card p-6 rounded-2xl shadow-lg border border-border/50 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-secondary fill-secondary" />
                    ))}
                  </div>
                  
                  <p className="text-foreground mb-6 italic">"{testimonial.text}"</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.specialty}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Fatura</p>
                      <p className="font-bold text-primary">{testimonial.earnings}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-primary via-primary to-primary/90 relative overflow-hidden">
          {/* Background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-20 w-64 h-64 bg-secondary rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-20 w-80 h-80 bg-white rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-3xl mx-auto">
              <HeartPulse className="w-16 h-16 text-secondary mx-auto mb-6" />
              
              <h2 className="text-2xl lg:text-4xl xl:text-5xl font-bold text-primary-foreground mb-6">
                Está pronto para transformar sua carreira médica?
              </h2>
              
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                Junte-se a mais de 500 profissionais que já aumentaram seus ganhos e qualidade de vida com o MeConsulta.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  size="lg" 
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-10 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  onClick={handleCTA}
                >
                  Falar com Especialista
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex items-center justify-center gap-6 text-sm text-primary-foreground/70">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-secondary" />
                  <span>Cadastro gratuito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-secondary" />
                  <span>Sem compromisso</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-secondary" />
                  <span>Suporte dedicado</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Teaser */}
        <section className="py-12 bg-muted">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground">
              Tem dúvidas? Entre em contato pelo{" "}
              <a href="https://wa.me/5511999999999" className="text-primary font-semibold hover:underline">
                WhatsApp
              </a>{" "}
              ou{" "}
              <a href="mailto:medicos@meconsulta.com.br" className="text-primary font-semibold hover:underline">
                medicos@meconsulta.com.br
              </a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SouMedico;
