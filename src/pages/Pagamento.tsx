import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, CreditCard, QrCode, Copy, Check, Clock, ArrowLeft, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConsultaData {
  id: string;
  valor_consulta: number;
  data_hora: string;
  status_pagamento: string;
  status_consulta: string;
  asaas_payment_id: string | null;
  medico: {
    nome: string;
    especialidade: string;
    foto_url: string | null;
  } | null;
  local: {
    nome_local: string;
    endereco: string;
    cidade: string;
    estado: string;
  } | null;
}

interface PixData {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

const PAYMENT_TIMEOUT = 15 * 60 * 1000; // 15 minutes

// Credit card fee constants (same as edge function)
const CARD_FEE_PERCENTAGE = 2.99; // 2.99%
const CARD_FEE_FIXED = 0.49; // R$ 0.49
const INSTALLMENT_FEE_PER_MONTH = 1.99; // 1.99% per installment month

// Installment options
const INSTALLMENT_OPTIONS = [
  { value: 1, label: 'À vista' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 4, label: '4x' },
  { value: 5, label: '5x' },
  { value: 6, label: '6x' },
  { value: 7, label: '7x' },
  { value: 8, label: '8x' },
  { value: 9, label: '9x' },
  { value: 10, label: '10x' },
  { value: 11, label: '11x' },
  { value: 12, label: '12x' },
];

const calculateCardFees = (originalValue: number, installments: number = 1) => {
  // Base fees
  const percentageFee = originalValue * (CARD_FEE_PERCENTAGE / 100);
  let totalFees = percentageFee + CARD_FEE_FIXED;
  
  // Add installment fees if more than 1 installment
  if (installments > 1) {
    const installmentFee = originalValue * (INSTALLMENT_FEE_PER_MONTH / 100) * installments;
    totalFees += installmentFee;
  }
  
  const totalWithFees = Math.round((originalValue + totalFees) * 100) / 100;
  const installmentValue = Math.round((totalWithFees / installments) * 100) / 100;
  
  return { totalFees, totalWithFees, installmentValue };
};

const Pagamento = () => {
  const { consultaId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [consulta, setConsulta] = useState<ConsultaData | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  
  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardLoading, setCardLoading] = useState(false);
  const [installments, setInstallments] = useState(1);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT);
  const [startTime] = useState(Date.now());

  // Fetch consultation data
  useEffect(() => {
    const fetchConsulta = async () => {
      if (!consultaId) return;

      try {
        const { data, error } = await supabase
          .from("consultas")
          .select(`
            id,
            valor_consulta,
            data_hora,
            status_pagamento,
            status_consulta,
            asaas_payment_id,
            medico:medicos!consultas_medico_id_fkey(nome, especialidade, foto_url),
            local:locais_atendimento(nome_local, endereco, cidade, estado)
          `)
          .eq("id", consultaId)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          toast({
            title: "Consulta não encontrada",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        // Check if already paid
        if (data.status_pagamento === "pago") {
          toast({
            title: "Pagamento já confirmado!",
            description: "Esta consulta já foi paga.",
          });
          navigate("/paciente/consultas");
          return;
        }

        setConsulta(data as unknown as ConsultaData);
        
        // Generate PIX automatically
        if (data.asaas_payment_id) {
          await generatePixQrCode(data.asaas_payment_id);
        }
      } catch (error) {
        console.error("Error fetching consulta:", error);
        toast({
          title: "Erro ao carregar dados",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConsulta();
  }, [consultaId, navigate]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, PAYMENT_TIMEOUT - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        toast({
          title: "Tempo expirado",
          description: "O tempo para pagamento expirou. Por favor, tente novamente.",
          variant: "destructive",
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Check payment status periodically
  useEffect(() => {
    if (!consulta?.asaas_payment_id) return;

    const checkPayment = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-payment-status", {
          body: { consulta_id: consultaId },
        });

        if (data?.status === "pago" || data?.status === "RECEIVED" || data?.status === "CONFIRMED") {
          toast({
            title: "Pagamento confirmado!",
            description: "Sua consulta foi agendada com sucesso.",
          });
          navigate("/paciente/consultas");
        }
      } catch (error) {
        console.error("Error checking payment:", error);
      }
    };

    const interval = setInterval(checkPayment, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [consulta?.asaas_payment_id, consultaId, navigate]);

  const generatePixQrCode = async (paymentId: string) => {
    setPixLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-pix-qrcode", {
        body: { payment_id: paymentId },
      });

      if (error) throw error;
      
      if (data?.pixData) {
        setPixData(data.pixData);
      }
    } catch (error) {
      console.error("Error generating PIX:", error);
      toast({
        title: "Erro ao gerar QR Code PIX",
        description: "Tente novamente ou use cartão de crédito.",
        variant: "destructive",
      });
    } finally {
      setPixLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (!pixData?.payload) return;
    
    try {
      await navigator.clipboard.writeText(pixData.payload);
      setCopied(true);
      toast({ title: "Código PIX copiado!" });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({ title: "Erro ao copiar código", variant: "destructive" });
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 16);
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 2) {
      setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setCardExpiry(cleaned);
    }
  };

  const handleCardPayment = async () => {
    // Validate fields
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      toast({
        title: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    const cardNumberClean = cardNumber.replace(/\s/g, "");
    if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      toast({
        title: "Número do cartão inválido",
        variant: "destructive",
      });
      return;
    }

    const [month, year] = cardExpiry.split("/");
    if (!month || !year || parseInt(month) > 12 || parseInt(month) < 1) {
      toast({
        title: "Data de validade inválida",
        variant: "destructive",
      });
      return;
    }

    if (cardCvv.length < 3 || cardCvv.length > 4) {
      toast({
        title: "CVV inválido",
        variant: "destructive",
      });
      return;
    }

    setCardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-card-payment", {
        body: {
          consulta_id: consultaId,
          card: {
            number: cardNumberClean,
            holderName: cardName,
            expiryMonth: month,
            expiryYear: `20${year}`,
            ccv: cardCvv,
          },
          installments: installments,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Pagamento aprovado!",
          description: "Sua consulta foi agendada com sucesso.",
        });
        navigate("/paciente/consultas");
      } else {
        throw new Error(data?.error || "Erro no pagamento");
      }
    } catch (error: any) {
      console.error("Card payment error:", error);
      toast({
        title: "Erro no pagamento",
        description: error.message || "Verifique os dados do cartão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCardLoading(false);
    }
  };

  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const isTimeExpired = timeLeft === 0;
  const isTimeLow = timeLeft < 5 * 60 * 1000 && timeLeft > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!consulta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <p className="text-muted-foreground">Consulta não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pagamento</h1>
            <p className="text-muted-foreground">Finalize sua consulta</p>
          </div>
        </div>

        {/* Timer */}
        <Card className={`mb-6 ${isTimeExpired ? 'border-destructive bg-destructive/10' : isTimeLow ? 'border-yellow-500 bg-yellow-500/10' : ''}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${isTimeExpired ? 'text-destructive' : isTimeLow ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                <span className="text-sm text-muted-foreground">
                  {isTimeExpired ? "Tempo expirado" : "Tempo restante para pagamento"}
                </span>
              </div>
              <span className={`text-2xl font-mono font-bold ${isTimeExpired ? 'text-destructive' : isTimeLow ? 'text-yellow-500' : 'text-foreground'}`}>
                {formatTimeLeft()}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Payment Options */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Escolha a forma de pagamento</CardTitle>
                <CardDescription>PIX ou Cartão de Crédito/Débito</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'pix' | 'card')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="pix" className="flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      PIX
                    </TabsTrigger>
                    <TabsTrigger value="card" className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Cartão
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pix" className="space-y-4">
                    {pixLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Gerando QR Code...</p>
                      </div>
                    ) : pixData ? (
                      <div className="flex flex-col items-center space-y-6">
                        {/* QR Code */}
                        <div className="bg-white p-4 rounded-xl shadow-lg">
                          <img
                            src={`data:image/png;base64,${pixData.encodedImage}`}
                            alt="QR Code PIX"
                            className="w-64 h-64"
                          />
                        </div>

                        {/* Copy Pix Code */}
                        <div className="w-full max-w-md space-y-2">
                          <Label className="text-center block">Ou copie o código PIX:</Label>
                          <div className="flex gap-2">
                            <Input
                              value={pixData.payload}
                              readOnly
                              className="font-mono text-xs"
                            />
                            <Button
                              onClick={copyPixCode}
                              variant="outline"
                              className="shrink-0"
                            >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground text-center">
                          Abra o app do seu banco, escolha pagar via PIX e escaneie o QR Code ou cole o código.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground">Erro ao gerar QR Code PIX</p>
                        <Button 
                          onClick={() => consulta.asaas_payment_id && generatePixQrCode(consulta.asaas_payment_id)}
                          variant="outline"
                          className="mt-4"
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="card" className="space-y-4">
                    <div className="space-y-4">
                      {/* Card Number */}
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Número do Cartão</Label>
                        <Input
                          id="cardNumber"
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onChange={(e) => formatCardNumber(e.target.value)}
                          maxLength={19}
                        />
                      </div>

                      {/* Card Name */}
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Nome no Cartão</Label>
                        <Input
                          id="cardName"
                          placeholder="NOME COMO ESTÁ NO CARTÃO"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        />
                      </div>

                      {/* Expiry and CVV */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardExpiry">Validade</Label>
                          <Input
                            id="cardExpiry"
                            placeholder="MM/AA"
                            value={cardExpiry}
                            onChange={(e) => formatExpiry(e.target.value)}
                            maxLength={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardCvv">CVV</Label>
                          <Input
                            id="cardCvv"
                            placeholder="123"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            maxLength={4}
                            type="password"
                          />
                        </div>
                      </div>

                      {/* Installments Selector */}
                      <div className="space-y-2">
                        <Label>Parcelas</Label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {INSTALLMENT_OPTIONS.map((option) => {
                            const { installmentValue, totalWithFees } = calculateCardFees(consulta.valor_consulta, option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setInstallments(option.value)}
                                className={`p-2 rounded-lg border text-center transition-all ${
                                  installments === option.value
                                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div className="text-sm font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  R$ {installmentValue.toFixed(2).replace(".", ",")}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {installments > 1 && (
                          <p className="text-xs text-muted-foreground">
                            {installments}x de R$ {calculateCardFees(consulta.valor_consulta, installments).installmentValue.toFixed(2).replace(".", ",")} 
                            {" "}= R$ {calculateCardFees(consulta.valor_consulta, installments).totalWithFees.toFixed(2).replace(".", ",")} (taxa de {(CARD_FEE_PERCENTAGE + INSTALLMENT_FEE_PER_MONTH * installments).toFixed(2)}% + R$ 0,49)
                          </p>
                        )}
                      </div>

                      {/* Card Fee Notice */}
                      <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valor da consulta</span>
                          <span>R$ {consulta.valor_consulta.toFixed(2).replace(".", ",")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {installments === 1 
                              ? "Taxa do cartão (2,99% + R$ 0,49)"
                              : `Taxa do cartão + parcelamento (${(CARD_FEE_PERCENTAGE + INSTALLMENT_FEE_PER_MONTH * installments).toFixed(2)}% + R$ 0,49)`
                            }
                          </span>
                          <span>R$ {calculateCardFees(consulta.valor_consulta, installments).totalFees.toFixed(2).replace(".", ",")}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>Total a pagar</span>
                          <span className="text-primary">
                            {installments > 1 
                              ? `${installments}x R$ ${calculateCardFees(consulta.valor_consulta, installments).installmentValue.toFixed(2).replace(".", ",")}`
                              : `R$ ${calculateCardFees(consulta.valor_consulta, installments).totalWithFees.toFixed(2).replace(".", ",")}`
                            }
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          💡 Pague via PIX para não pagar taxa!
                        </p>
                      </div>

                      {/* Pay Button */}
                      <Button
                        className="w-full mt-4"
                        size="lg"
                        onClick={handleCardPayment}
                        disabled={cardLoading || isTimeExpired}
                      >
                        {cardLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : installments > 1 ? (
                          `Pagar ${installments}x de R$ ${calculateCardFees(consulta.valor_consulta, installments).installmentValue.toFixed(2).replace(".", ",")}`
                        ) : (
                          `Pagar R$ ${calculateCardFees(consulta.valor_consulta, installments).totalWithFees.toFixed(2).replace(".", ",")}`
                        )}
                      </Button>

                      {/* Security Badge */}
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        Pagamento seguro via Asaas
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Doctor Info */}
                {consulta.medico && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {consulta.medico.foto_url ? (
                        <img
                          src={consulta.medico.foto_url}
                          alt={consulta.medico.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-lg">
                          {consulta.medico.nome.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{consulta.medico.nome}</p>
                      <p className="text-sm text-muted-foreground">{consulta.medico.especialidade}</p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  {/* Date/Time */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data</span>
                    <span className="font-medium">
                      {format(new Date(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {/* Location */}
                  {consulta.local && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Local</span>
                      <span className="font-medium text-right">
                        {consulta.local.nome_local}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {consulta.local.cidade}/{consulta.local.estado}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Consulta</span>
                    <span className="font-medium">
                      R$ {consulta.valor_consulta.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  {paymentMethod === 'card' && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {installments > 1 ? 'Taxa + parcelamento' : 'Taxa do cartão'}
                      </span>
                      <span className="text-muted-foreground">
                        + R$ {calculateCardFees(consulta.valor_consulta, installments).totalFees.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="text-lg font-semibold">Total</span>
                    <div className="text-right">
                      {paymentMethod === 'card' && installments > 1 ? (
                        <>
                          <span className="text-2xl font-bold text-primary">
                            {installments}x R$ {calculateCardFees(consulta.valor_consulta, installments).installmentValue.toFixed(2).replace(".", ",")}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            Total: R$ {calculateCardFees(consulta.valor_consulta, installments).totalWithFees.toFixed(2).replace(".", ",")}
                          </div>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-primary">
                          R$ {paymentMethod === 'card' 
                            ? calculateCardFees(consulta.valor_consulta, installments).totalWithFees.toFixed(2).replace(".", ",")
                            : consulta.valor_consulta.toFixed(2).replace(".", ",")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pagamento;
