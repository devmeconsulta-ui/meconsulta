import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollText, Users, CreditCard, AlertTriangle, Scale, Ban, RefreshCw, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

const TermosUso = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <ScrollText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Termos de Uso
            </h1>
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none space-y-8">
            {/* Introdução */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <ScrollText className="h-5 w-5 text-primary" />
                1. Aceitação dos Termos
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Bem-vindo à MeConsulta! Ao acessar ou usar nossa plataforma, você concorda em cumprir e estar vinculado a estes 
                Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá usar nossos serviços.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Estes Termos de Uso constituem um acordo legal entre você ("Usuário") e a MeConsulta ("Plataforma", "nós", "nosso").
              </p>
            </section>

            {/* Sobre a Plataforma */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                2. Sobre a Plataforma
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A MeConsulta é um marketplace de saúde que conecta pacientes a médicos e clínicas, facilitando:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Agendamento de consultas médicas presenciais e online</li>
                <li>Gerenciamento de agenda para profissionais de saúde</li>
                <li>Processamento de pagamentos de consultas</li>
                <li>Emissão de prescrições médicas digitais</li>
                <li>Armazenamento seguro de histórico médico</li>
              </ul>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-4">
                <p className="text-yellow-700 dark:text-yellow-400 text-sm font-medium">
                  ⚠️ Importante: A MeConsulta é uma plataforma intermediária. Não prestamos serviços médicos diretamente. 
                  A responsabilidade técnica pelos atendimentos é exclusiva dos profissionais de saúde cadastrados.
                </p>
              </div>
            </section>

            {/* Tipos de Usuários */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                3. Tipos de Usuários e Responsabilidades
              </h2>
              
              <h3 className="font-medium text-foreground mt-4 mb-2">3.1 Pacientes</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Comparecer às consultas agendadas ou cancelar com antecedência</li>
                <li>Efetuar os pagamentos devidos</li>
                <li>Não compartilhar credenciais de acesso</li>
                <li>Respeitar os profissionais de saúde</li>
              </ul>

              <h3 className="font-medium text-foreground mt-4 mb-2">3.2 Médicos e Profissionais de Saúde</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Manter registro profissional ativo e válido (CRM)</li>
                <li>Fornecer informações profissionais precisas</li>
                <li>Cumprir os horários de atendimento disponibilizados</li>
                <li>Seguir as normas éticas e legais da profissão</li>
                <li>Não solicitar contato direto com pacientes fora da plataforma</li>
              </ul>

              <h3 className="font-medium text-foreground mt-4 mb-2">3.3 Clínicas</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Manter documentação regularizada</li>
                <li>Gerenciar adequadamente os profissionais vinculados</li>
                <li>Garantir a qualidade das instalações (para atendimentos presenciais)</li>
                <li>Cumprir as obrigações financeiras com a plataforma</li>
              </ul>
            </section>

            {/* Pagamentos */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-primary" />
                4. Pagamentos e Taxas
              </h2>
              
              <h3 className="font-medium text-foreground mt-4 mb-2">4.1 Pacientes</h3>
              <p className="text-muted-foreground leading-relaxed">
                Os pagamentos das consultas são processados através de nossa plataforma de pagamentos segura. 
                Aceitamos cartão de crédito (à vista ou parcelado) e PIX. O valor da consulta é definido pelo profissional de saúde.
              </p>

              <h3 className="font-medium text-foreground mt-4 mb-2">4.2 Profissionais e Clínicas</h3>
              <p className="text-muted-foreground leading-relaxed">
                A MeConsulta retém uma taxa de intermediação sobre cada consulta realizada. Os repasses são efetuados 
                conforme cronograma definido, após a conclusão da consulta e confirmação do pagamento.
              </p>

              <h3 className="font-medium text-foreground mt-4 mb-2">4.3 Cancelamentos e Reembolsos</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Cancelamentos pelo paciente com mais de 24h de antecedência: reembolso integral</li>
                <li>Cancelamentos com menos de 24h: sujeito a taxa de cancelamento</li>
                <li>Cancelamentos pelo profissional: reembolso integral ao paciente</li>
                <li>No-show do paciente: sem direito a reembolso</li>
              </ul>
            </section>

            {/* Proibições */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <Ban className="h-5 w-5 text-primary" />
                5. Condutas Proibidas
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                É expressamente proibido aos usuários:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Fornecer informações falsas ou enganosas</li>
                <li>Tentar burlar os sistemas de segurança da plataforma</li>
                <li>Realizar pagamentos fora da plataforma para consultas agendadas por aqui</li>
                <li>Compartilhar credenciais de acesso com terceiros</li>
                <li>Utilizar a plataforma para fins ilegais ou não autorizados</li>
                <li>Assediar, ameaçar ou discriminar outros usuários</li>
                <li>Coletar dados de outros usuários sem autorização</li>
                <li>Tentar contato direto com pacientes fora da plataforma (para profissionais)</li>
                <li>Publicar avaliações falsas ou difamatórias</li>
              </ul>
            </section>

            {/* Limitações */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-primary" />
                6. Limitações de Responsabilidade
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A MeConsulta não se responsabiliza por:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Qualidade técnica dos atendimentos médicos realizados</li>
                <li>Diagnósticos, prescrições ou tratamentos recomendados pelos profissionais</li>
                <li>Indisponibilidade temporária da plataforma por manutenção ou problemas técnicos</li>
                <li>Danos decorrentes de informações falsas fornecidas por usuários</li>
                <li>Disputas entre pacientes e profissionais de saúde</li>
                <li>Perdas ou danos indiretos relacionados ao uso da plataforma</li>
              </ul>
              <div className="bg-primary/5 rounded-lg p-4 mt-4">
                <p className="text-muted-foreground text-sm">
                  A plataforma atua como intermediária e não substitui a relação médico-paciente. 
                  Em caso de emergência médica, procure imediatamente um serviço de urgência.
                </p>
              </div>
            </section>

            {/* Propriedade Intelectual */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-primary" />
                7. Propriedade Intelectual
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Todo o conteúdo da plataforma, incluindo mas não limitado a logotipos, textos, imagens, 
                código-fonte e design, é propriedade da MeConsulta ou de seus licenciadores, protegido 
                por leis de direitos autorais e propriedade intelectual.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                É proibida a reprodução, distribuição ou modificação de qualquer conteúdo sem autorização prévia por escrito.
              </p>
            </section>

            {/* Suspensão e Encerramento */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <RefreshCw className="h-5 w-5 text-primary" />
                8. Suspensão e Encerramento de Conta
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Reservamos o direito de suspender ou encerrar contas de usuários que:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Violem estes Termos de Uso</li>
                <li>Pratiquem fraudes ou atividades ilegais</li>
                <li>Apresentem comportamento inadequado repetidamente</li>
                <li>Não cumpram obrigações financeiras</li>
                <li>Tenham registro profissional cancelado ou suspenso (para médicos)</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                O usuário também pode solicitar o encerramento de sua conta a qualquer momento, 
                respeitando eventuais obrigações pendentes.
              </p>
            </section>

            {/* Alterações */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                9. Alterações nos Termos
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Podemos modificar estes Termos de Uso a qualquer momento. Alterações significativas serão 
                comunicadas por e-mail ou aviso na plataforma com pelo menos 30 dias de antecedência. 
                O uso continuado após as alterações constitui aceitação dos novos termos.
              </p>
            </section>

            {/* Lei Aplicável */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                10. Lei Aplicável e Foro
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. 
                Qualquer disputa será submetida ao foro da comarca de [Cidade/Estado], 
                com exclusão de qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            {/* Contato */}
            <section className="bg-primary/5 rounded-xl p-6 border border-primary/20">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-primary" />
                11. Contato
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Para dúvidas sobre estes Termos de Uso, entre em contato:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>E-mail:</strong> contato@meconsulta.com.br</p>
                <p><strong>Telefone:</strong> (XX) XXXX-XXXX</p>
              </div>
            </section>

            {/* Link para Privacidade */}
            <section className="bg-muted/50 rounded-xl p-6 text-center">
              <p className="text-muted-foreground">
                Consulte também nossa{" "}
                <Link to="/politica-privacidade" className="text-primary hover:underline font-medium">
                  Política de Privacidade
                </Link>{" "}
                para entender como tratamos seus dados pessoais.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermosUso;
