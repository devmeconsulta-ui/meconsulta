import { MessageCircle, Phone, BookOpen, AlertTriangle, Calendar, Users, CreditCard, Headset, Monitor, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const troubleshootingGuides = [
  {
    id: "agenda",
    icon: Calendar,
    title: "Problemas com Agenda",
    items: [
      {
        question: "Consulta aparecendo para o médico errado",
        answer: "Ao agendar uma consulta pela agenda da clínica, certifique-se de selecionar o médico correto no filtro antes de clicar no horário. Se o filtro estiver em 'Todos', o sistema exigirá a seleção de um médico. Caso o erro já tenha ocorrido, cancele a consulta e reagende no médico correto."
      },
      {
        question: "Médico não consegue ver a agenda dele",
        answer: "Verifique se o médico possui locais de atendimento vinculados. Vá em Médicos > Gerenciar e confira se há pelo menos um local ativo. Sem locais vinculados, a agenda não exibirá slots disponíveis."
      },
      {
        question: "Slots não aparecem na agenda",
        answer: "Os slots precisam ser gerados manualmente. Acesse a agenda do médico, clique em 'Gerar Horários' e defina o período, horário de início/fim e intervalo entre consultas. Após gerar, os slots ficarão disponíveis."
      },
    ]
  },
  {
    id: "consultas",
    icon: Users,
    title: "Problemas com Consultas",
    items: [
      {
        question: "Consulta não aparece na listagem",
        answer: "Verifique os filtros aplicados (data, médico, status). A consulta pode estar filtrada. Tente limpar todos os filtros e buscar novamente. Confira também se a consulta não foi cancelada."
      },
      {
        question: "Não consigo cancelar uma consulta",
        answer: "Consultas já finalizadas não podem ser canceladas. Apenas consultas com status 'agendada' ou 'confirmada' podem ser canceladas. Se o paciente pagou, o estorno precisa ser feito manualmente pelo financeiro."
      },
      {
        question: "Paciente não recebeu confirmação por WhatsApp",
        answer: "Verifique se a instância do WhatsApp está conectada em Atendimento > Dashboard. Confirme também se o número do paciente está correto e com DDD. Caso a instância esteja desconectada, reconecte escaneando o QR Code."
      },
    ]
  },
  {
    id: "financeiro",
    icon: CreditCard,
    title: "Problemas com Financeiro",
    items: [
      {
        question: "Pagamento não foi registrado",
        answer: "Se o pagamento foi feito via PIX/cartão pelo sistema, aguarde alguns minutos para o webhook processar. Se foi pagamento presencial, registre manualmente pelo caixa da clínica. Verifique se o caixa está aberto antes de registrar."
      },
      {
        question: "Caixa não abre / erro ao abrir caixa",
        answer: "Certifique-se de que o caixa anterior foi fechado corretamente. Apenas um caixa pode estar aberto por vez. Se houver um caixa aberto de outro dia, feche-o primeiro informando o saldo final."
      },
    ]
  },
  {
    id: "omnichannel",
    icon: Headset,
    title: "Problemas com Atendimento / WhatsApp",
    items: [
      {
        question: "WhatsApp desconectou",
        answer: "Acesse Atendimento > Dashboard e verifique o status da conexão. Clique em 'Reconectar' e escaneie o QR Code novamente com o celular vinculado. Evite usar o WhatsApp Web simultaneamente no mesmo número."
      },
      {
        question: "Mensagens não estão chegando",
        answer: "Verifique se a instância está com status 'Conectado'. Se estiver conectado mas as mensagens não chegam, desconecte e reconecte a instância. Caso persista, entre em contato com o suporte."
      },
      {
        question: "Confirmação de agenda enviou mensagem com médico errado",
        answer: "Ao selecionar pacientes para envio de confirmação, certifique-se de filtrar por médico antes. Se trocar o filtro de médico, a seleção anterior é limpa automaticamente. Sempre confira a lista antes de enviar."
      },
    ]
  },
  {
    id: "sistema",
    icon: Monitor,
    title: "Problemas Gerais do Sistema",
    items: [
      {
        question: "Tela em branco ou erro ao carregar",
        answer: "Tente atualizar a página (F5 ou Ctrl+R). Se persistir, limpe o cache do navegador (Ctrl+Shift+Del). Recomendamos usar Google Chrome ou Microsoft Edge na versão mais recente."
      },
      {
        question: "Dados não atualizam em tempo real",
        answer: "Algumas telas atualizam automaticamente, outras precisam de refresh manual. Clique no botão de atualizar ou pressione F5. Se os dados continuarem desatualizados, verifique sua conexão com a internet."
      },
      {
        question: "Não consigo acessar minha conta",
        answer: "Verifique se está usando o email e senha corretos. Caso tenha esquecido a senha, utilize a opção 'Esqueci minha senha' na tela de login. Se o problema persistir, entre em contato com o suporte pelo WhatsApp."
      },
    ]
  },
];

export default function ClinicaSuporte() {
  const whatsappNumber = "5538988642300";
  const whatsappLink = `https://wa.me/${whatsappNumber}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
        <p className="text-muted-foreground">Central de ajuda e contato com o suporte técnico</p>
      </div>

      {/* Contact Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">Precisa de ajuda?</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Nossa equipe de suporte está disponível via WhatsApp para te ajudar com qualquer problema ou dúvida.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-mono">
                  +55 (38) 98864-2300
                </span>
              </div>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white gap-2 px-6"
              onClick={() => window.open(whatsappLink, "_blank")}
            >
              <MessageCircle className="w-5 h-5" />
              Falar com Suporte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting Guides */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Guia de Resolução de Problemas</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Consulte os guias abaixo para resolver os problemas mais comuns antes de entrar em contato com o suporte.
        </p>

        <div className="grid gap-4">
          {troubleshootingGuides.map((guide) => (
            <Card key={guide.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <guide.icon className="w-4 h-4 text-primary" />
                  </div>
                  {guide.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Accordion type="multiple" className="w-full">
                  {guide.items.map((item, idx) => (
                    <AccordionItem key={idx} value={`${guide.id}-${idx}`}>
                      <AccordionTrigger className="text-sm text-left hover:no-underline">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          {item.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed pl-6">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-8 h-8 text-amber-600 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Problema não listado acima?</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Se o seu problema não está listado aqui, entre em contato diretamente com nosso suporte técnico.
          </p>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.open(whatsappLink, "_blank")}
          >
            <MessageCircle className="w-4 h-4" />
            Contatar Suporte via WhatsApp
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
