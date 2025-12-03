import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, DollarSign, Calendar, Users, TrendingUp, Stethoscope } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const SouMedico = () => {
  const [consultations, setConsultations] = useState(10);
  const consultationValue = 160;
  const doctorEarning = 120;
  
  const totalEarning = consultations * doctorEarning;
  const monthlyEarning = totalEarning * 4; // 4 semanas

  const benefits = [
    {
      icon: Calendar,
      title: "Agenda Online 24h",
      description: "Receba agendamentos a qualquer hora do dia, mesmo quando não estiver no consultório."
    },
    {
      icon: Users,
      title: "Mais Pacientes",
      description: "Aumente sua base de pacientes com nossa plataforma que conecta milhares de pessoas."
    },
    {
      icon: DollarSign,
      title: "Ganhos Garantidos",
      description: "Receba R$120 por consulta de R$160. Pagamento rápido e seguro."
    },
    {
      icon: TrendingUp,
      title: "Presença Online",
      description: "Aumente sua visibilidade na internet e seja encontrado por novos pacientes."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-primary py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              <div className="text-primary-foreground">
                <h1 className="text-3xl lg:text-5xl font-bold mb-6">
                  Também é <span className="text-secondary">Profissional da Saúde?</span>
                </h1>
                <p className="text-lg lg:text-xl mb-8 opacity-90">
                  Transforme a gestão do seu consultório. Conecte-se com pacientes, receba agendamentos 24h e aumente sua presença online.
                </p>
                <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-8 animate-glow">
                  Começar Agora
                </Button>
              </div>
              
              <div className="flex justify-center">
                <img 
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&h=600&fit=crop"
                  alt="Médica profissional"
                  className="rounded-2xl shadow-2xl max-w-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-center mb-12 text-foreground">
              Vantagens de ser um <span className="text-primary">Parceiro MeConsulta</span>
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {benefits.map((benefit, index) => (
                <div 
                  key={index}
                  className="bg-card p-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-foreground">
                  <DollarSign className="inline w-8 h-8 text-secondary mr-2" />
                  Calculadora de Ganhos
                </h2>
                <p className="text-muted-foreground">
                  Veja quanto você pode ganhar com o MeConsulta
                </p>
              </div>

              <div className="bg-card rounded-2xl shadow-xl p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Consultas por semana
                    </label>
                    <Input 
                      type="number"
                      value={consultations}
                      onChange={(e) => setConsultations(Number(e.target.value) || 0)}
                      className="text-2xl font-bold text-center h-16"
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Valor da consulta: R$ {consultationValue},00
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-muted rounded-xl p-4">
                      <p className="text-sm text-muted-foreground">Ganho por consulta</p>
                      <p className="text-2xl font-bold text-primary">R$ {doctorEarning},00</p>
                    </div>
                    
                    <div className="bg-muted rounded-xl p-4">
                      <p className="text-sm text-muted-foreground">Ganho semanal</p>
                      <p className="text-2xl font-bold text-primary">R$ {totalEarning.toLocaleString('pt-BR')},00</p>
                    </div>

                    <div className="bg-secondary/20 rounded-xl p-4 border-2 border-secondary">
                      <p className="text-sm text-muted-foreground">Ganho mensal estimado</p>
                      <p className="text-3xl font-bold text-secondary">R$ {monthlyEarning.toLocaleString('pt-BR')},00</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Sem taxas de adesão ou mensalidade
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Pagamento semanal garantido
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Suporte dedicado para profissionais
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <Stethoscope className="w-16 h-16 text-secondary mx-auto mb-6" />
            <h2 className="text-2xl lg:text-3xl font-bold text-primary-foreground mb-4">
              Pronto para começar?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Junte-se a centenas de profissionais que já estão aumentando seus ganhos com o MeConsulta.
            </p>
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-10 animate-glow">
              Cadastrar como Médico
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SouMedico;