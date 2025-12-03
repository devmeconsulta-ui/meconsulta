import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, MapPin, ChevronLeft, CreditCard, User } from "lucide-react";
import { getDoctorById, Doctor } from "@/data/mockDoctors";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const selectedDate = searchParams.get("data") || "";
  const selectedTime = searchParams.get("horario") || "";
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState<string>("sim");
  const [noInsurance, setNoInsurance] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: ""
  });

  useEffect(() => {
    if (id) {
      const foundDoctor = getDoctorById(id);
      setDoctor(foundDoctor || null);
    }
  }, [id]);

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Médico não encontrado</h1>
          <Button onClick={() => navigate("/buscar-medicos")}>Voltar para busca</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const formattedDate = selectedDate 
    ? format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.cpf) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }
    
    // Here would go the payment integration
    toast.success("Consulta agendada com sucesso! Você receberá um e-mail com os detalhes.");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6 gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form - Left Column */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl p-6 shadow-md">
                <h1 className="text-2xl font-bold text-foreground mb-6">
                  Selecione as opções da consulta
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Consultation Type */}
                  <div>
                    <Label className="text-base font-medium">Tipo de visita *</Label>
                    <div className="mt-2 p-4 bg-muted rounded-lg flex justify-between items-center">
                      <span className="text-foreground">
                        Primeira consulta {doctor.specialty.toLowerCase()} • R$ {doctor.consultationPrice.toFixed(2).replace(".", ",")}
                      </span>
                      <button type="button" className="text-primary font-medium hover:underline">
                        Altere
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Os preços são para pacientes sem convênio médico
                    </p>
                  </div>

                  {/* Insurance */}
                  <div>
                    <Label className="text-base font-medium">Convênio médico *</Label>
                    <div className="mt-2 p-4 bg-muted rounded-lg">
                      <span className="text-foreground">Consulta particular</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Checkbox 
                        id="no-insurance"
                        checked={noInsurance}
                        onCheckedChange={(checked) => setNoInsurance(checked as boolean)}
                      />
                      <label htmlFor="no-insurance" className="text-sm text-foreground cursor-pointer">
                        Estou agendando sem convênio médico
                      </label>
                    </div>
                  </div>

                  {/* First Visit */}
                  <div>
                    <Label className="text-base font-medium">É a sua primeira consulta com este especialista? *</Label>
                    <RadioGroup value={isFirstVisit} onValueChange={setIsFirstVisit} className="mt-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sim" id="first-yes" />
                        <Label htmlFor="first-yes" className="cursor-pointer">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nao" id="first-no" />
                        <Label htmlFor="first-no" className="cursor-pointer">Não</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-border pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Seus dados</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome completo *</Label>
                        <Input 
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Digite seu nome completo"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cpf">CPF *</Label>
                        <Input 
                          id="cpf"
                          name="cpf"
                          value={formData.cpf}
                          onChange={handleInputChange}
                          placeholder="000.000.000-00"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-mail *</Label>
                        <Input 
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="seu@email.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefone *</Label>
                        <Input 
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="(00) 00000-0000"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="border-t border-border pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Pagamento</h2>
                    </div>
                    
                    <p className="text-muted-foreground mb-4">
                      O pagamento será processado de forma segura.
                    </p>

                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm text-foreground">
                        💳 Integração com gateway de pagamento será adicionada posteriormente.
                      </p>
                    </div>
                  </div>

                  {/* Submit */}
                  <Button type="submit" className="w-full h-12 text-base font-semibold">
                    Confirmar Agendamento
                  </Button>
                </form>
              </div>
            </div>

            {/* Summary - Right Column */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 shadow-md sticky top-24">
                {/* Doctor Info */}
                <div className="flex gap-4 mb-6 pb-6 border-b border-border">
                  <img 
                    src={doctor.image} 
                    alt={doctor.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-foreground">{doctor.name}</h3>
                    <p className="text-sm text-primary">{doctor.specialty}</p>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        {formattedDate}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTime} - Fuso horário: Brasília
                      </p>
                      <button className="text-primary text-sm font-medium hover:underline">
                        Mudar a data
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{doctor.neighborhood}</p>
                      <p className="text-sm text-muted-foreground">{doctor.address}</p>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">Total</span>
                    <span className="text-2xl font-bold text-foreground">
                      R$ {doctor.consultationPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
