import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Lock, Eye, FileText, UserCheck, Trash2, AlertCircle } from "lucide-react";

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Política de Privacidade
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
                <FileText className="h-5 w-5 text-primary" />
                1. Introdução
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                A MeConsulta ("nós", "nosso" ou "Plataforma") está comprometida em proteger a privacidade e os dados pessoais de seus usuários. 
                Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais em conformidade 
                com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e demais legislações aplicáveis.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Ao utilizar nossa plataforma, você concorda com as práticas descritas nesta política. Recomendamos a leitura completa 
                deste documento para entender como seus dados são tratados.
              </p>
            </section>

            {/* Dados Coletados */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-primary" />
                2. Dados que Coletamos
              </h2>
              
              <h3 className="font-medium text-foreground mt-4 mb-2">2.1 Dados de Pacientes</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Nome completo</li>
                <li>CPF (protegido e parcialmente mascarado)</li>
                <li>Data de nascimento</li>
                <li>E-mail e telefone (protegidos)</li>
                <li>Endereço (cidade, estado, bairro)</li>
                <li>Histórico de consultas e agendamentos</li>
                <li>Informações de saúde fornecidas durante consultas</li>
              </ul>

              <h3 className="font-medium text-foreground mt-4 mb-2">2.2 Dados de Médicos e Clínicas</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Nome e dados profissionais</li>
                <li>CRM e especialidade</li>
                <li>Dados bancários para repasses</li>
                <li>Informações de contato profissional</li>
              </ul>

              <h3 className="font-medium text-foreground mt-4 mb-2">2.3 Dados de Navegação</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Endereço IP</li>
                <li>Tipo de navegador e dispositivo</li>
                <li>Páginas visitadas e tempo de permanência</li>
                <li>Cookies e tecnologias similares</li>
              </ul>
            </section>

            {/* Uso dos Dados */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <UserCheck className="h-5 w-5 text-primary" />
                3. Como Usamos Seus Dados
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Utilizamos seus dados pessoais para as seguintes finalidades:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Prestação de serviços:</strong> Agendamento de consultas, gerenciamento de prontuários e comunicação entre pacientes e profissionais de saúde.</li>
                <li><strong>Processamento de pagamentos:</strong> Cobrança e repasse de valores aos profissionais de saúde.</li>
                <li><strong>Comunicações:</strong> Envio de confirmações, lembretes de consultas e notificações importantes.</li>
                <li><strong>Melhoria da plataforma:</strong> Análise de uso para aprimorar nossos serviços.</li>
                <li><strong>Cumprimento legal:</strong> Atendimento a obrigações legais e regulatórias.</li>
                <li><strong>Segurança:</strong> Prevenção de fraudes e proteção da plataforma.</li>
              </ul>
            </section>

            {/* Proteção de Dados */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <Lock className="h-5 w-5 text-primary" />
                4. Proteção de Dados Sensíveis
              </h2>
              <div className="bg-primary/5 rounded-lg p-4 mb-4">
                <p className="text-foreground font-medium">
                  🔒 Modelo de Marketplace Seguro
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  A MeConsulta opera como um marketplace onde os dados sensíveis dos pacientes (telefone, e-mail, CPF) 
                  <strong> nunca são totalmente expostos</strong> a clínicas ou médicos. Todas as informações de contato 
                  exibidas aos profissionais de saúde são mascaradas/parciais, protegendo sua privacidade.
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Implementamos medidas técnicas e organizacionais apropriadas para proteger seus dados contra acesso não autorizado, 
                alteração, divulgação ou destruição, incluindo:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>Criptografia de dados em trânsito e em repouso</li>
                <li>Controles de acesso rigorosos</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Mascaramento de dados sensíveis</li>
                <li>Backups regulares e seguros</li>
              </ul>
            </section>

            {/* Cookies */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                🍪 5. Política de Cookies
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência em nossa plataforma.
              </p>
              
              <h3 className="font-medium text-foreground mt-4 mb-2">5.1 Tipos de Cookies</h3>
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium text-foreground">Cookies Essenciais</p>
                  <p className="text-sm text-muted-foreground">Necessários para o funcionamento básico do site, como autenticação e segurança.</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium text-foreground">Cookies de Desempenho</p>
                  <p className="text-sm text-muted-foreground">Coletam informações sobre como você usa o site para melhorias.</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium text-foreground">Cookies de Funcionalidade</p>
                  <p className="text-sm text-muted-foreground">Lembram suas preferências, como idioma e região.</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium text-foreground">Cookies de Marketing</p>
                  <p className="text-sm text-muted-foreground">Usados para exibir anúncios relevantes (quando aplicável).</p>
                </div>
              </div>

              <h3 className="font-medium text-foreground mt-4 mb-2">5.2 Gerenciamento de Cookies</h3>
              <p className="text-muted-foreground leading-relaxed">
                Você pode gerenciar suas preferências de cookies através das configurações do seu navegador. 
                Note que desabilitar certos cookies pode afetar a funcionalidade do site.
              </p>
            </section>

            {/* Direitos LGPD */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-primary" />
                6. Seus Direitos (LGPD)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                De acordo com a Lei Geral de Proteção de Dados, você tem os seguintes direitos:
              </p>
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">1</span>
                  <div>
                    <p className="font-medium text-foreground">Confirmação e Acesso</p>
                    <p className="text-sm text-muted-foreground">Confirmar se tratamos seus dados e acessar suas informações.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">2</span>
                  <div>
                    <p className="font-medium text-foreground">Correção</p>
                    <p className="text-sm text-muted-foreground">Solicitar a correção de dados incompletos ou incorretos.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">3</span>
                  <div>
                    <p className="font-medium text-foreground">Anonimização ou Eliminação</p>
                    <p className="text-sm text-muted-foreground">Solicitar a anonimização ou exclusão de dados desnecessários.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">4</span>
                  <div>
                    <p className="font-medium text-foreground">Portabilidade</p>
                    <p className="text-sm text-muted-foreground">Solicitar a portabilidade dos dados para outro fornecedor.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">5</span>
                  <div>
                    <p className="font-medium text-foreground">Revogação do Consentimento</p>
                    <p className="text-sm text-muted-foreground">Revogar seu consentimento a qualquer momento.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">6</span>
                  <div>
                    <p className="font-medium text-foreground">Oposição</p>
                    <p className="text-sm text-muted-foreground">Opor-se ao tratamento de dados em determinadas situações.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Exclusão de Dados */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                <Trash2 className="h-5 w-5 text-primary" />
                7. Retenção e Exclusão de Dados
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta política, 
                ou conforme exigido por lei. Dados de saúde podem ser mantidos por prazos mais longos conforme 
                regulamentações do setor de saúde (mínimo de 20 anos para prontuários médicos, conforme Resolução CFM nº 1.821/2007).
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Para solicitar a exclusão de seus dados, entre em contato conosco através dos canais indicados abaixo.
              </p>
            </section>

            {/* Compartilhamento */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                8. Compartilhamento de Dados
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Podemos compartilhar seus dados nas seguintes situações:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Com profissionais de saúde:</strong> Dados necessários para a prestação do serviço médico (com mascaramento de dados sensíveis).</li>
                <li><strong>Processadores de pagamento:</strong> Dados necessários para processar transações financeiras.</li>
                <li><strong>Prestadores de serviço:</strong> Empresas que nos auxiliam na operação da plataforma (hospedagem, e-mail, etc.).</li>
                <li><strong>Obrigações legais:</strong> Quando exigido por lei, ordem judicial ou autoridade competente.</li>
              </ul>
            </section>

            {/* Contato */}
            <section className="bg-primary/5 rounded-xl p-6 border border-primary/20">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                9. Contato e Encarregado de Dados (DPO)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>E-mail:</strong> privacidade@meconsulta.com.br</p>
                <p><strong>Telefone:</strong> (XX) XXXX-XXXX</p>
                <p><strong>Endereço:</strong> [Endereço da empresa]</p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Responderemos às solicitações no prazo de 15 dias, conforme estabelecido pela LGPD.
              </p>
            </section>

            {/* Alterações */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                10. Alterações nesta Política
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Podemos atualizar esta Política de Privacidade periodicamente. Quando fizermos alterações significativas, 
                notificaremos você por e-mail ou através de aviso em destaque em nossa plataforma. 
                Recomendamos que você revise esta política regularmente.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PoliticaPrivacidade;
