import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Star, MapPin, GraduationCap, Stethoscope, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { getDoctorById, Doctor } from "@/data/mockDoctors";
import { format, addDays, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const PerfilMedico = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(0);

  useEffect(() => {
    if (id) {
      const foundDoctor = getDoctorById(id);
      if (foundDoctor) {
        setDoctor(foundDoctor);
        if (foundDoctor.availableSlots.length > 0) {
          setSelectedDate(foundDoctor.availableSlots[0].date);
        }
      }
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

  const getVisibleDays = () => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const date = addDays(new Date(), weekStart + i);
      days.push(date);
    }
    return days;
  };

  const getTimesForDate = (dateStr: string) => {
    const slot = doctor.availableSlots.find(s => s.date === dateStr);
    return slot?.times || [];
  };

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      navigate(`/checkout/${doctor.id}?data=${selectedDate}&horario=${selectedTime}`);
    }
  };

  const visibleDays = getVisibleDays();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-8">
        <div className="container mx-auto px-4">
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
            {/* Doctor Info - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Card */}
              <div className="bg-card rounded-2xl p-6 shadow-md">
                <div className="flex flex-col md:flex-row gap-6">
                  <img 
                    src={doctor.image} 
                    alt={doctor.name}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover mx-auto md:mx-0"
                  />
                  <div className="text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      {doctor.name}
                    </h1>
                    <p className="text-lg text-primary font-medium mb-2">{doctor.specialty}</p>
                    <p className="text-muted-foreground mb-3">{doctor.crm}</p>
                    
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                      <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-foreground">{doctor.rating}</span>
                      </div>
                      <span className="text-muted-foreground text-sm">({doctor.reviewCount} avaliações)</span>
                    </div>

                    <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{doctor.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="bg-card rounded-2xl p-6 shadow-md">
                <h2 className="text-xl font-bold text-foreground mb-4">Sobre</h2>
                <p className="text-muted-foreground leading-relaxed">{doctor.bio}</p>
              </div>

              {/* Education */}
              <div className="bg-card rounded-2xl p-6 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Formação</h2>
                </div>
                <ul className="space-y-2">
                  {doctor.education.map((item, index) => (
                    <li key={index} className="text-muted-foreground flex items-start gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Services */}
              <div className="bg-card rounded-2xl p-6 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Serviços</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {doctor.services.map((service, index) => (
                    <span 
                      key={index}
                      className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking - Right Column */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 shadow-md sticky top-24">
                <div className="text-center mb-6">
                  <p className="text-muted-foreground text-sm">Valor da consulta</p>
                  <p className="text-3xl font-bold text-foreground">
                    R$ {doctor.consultationPrice.toFixed(2).replace(".", ",")}
                  </p>
                </div>

                {/* Date Selection */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">Escolha a data</span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setWeekStart(Math.max(0, weekStart - 5))}
                        className="p-1 hover:bg-muted rounded disabled:opacity-50"
                        disabled={weekStart === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setWeekStart(weekStart + 5)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2">
                    {visibleDays.map((date) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      const hasSlots = doctor.availableSlots.some(s => s.date === dateStr);
                      const isSelected = selectedDate === dateStr;
                      
                      return (
                        <button
                          key={dateStr}
                          onClick={() => {
                            if (hasSlots) {
                              setSelectedDate(dateStr);
                              setSelectedTime(null);
                            }
                          }}
                          disabled={!hasSlots}
                          className={`
                            p-2 rounded-lg text-center transition-all
                            ${isSelected 
                              ? "bg-primary text-primary-foreground" 
                              : hasSlots 
                                ? "bg-muted hover:bg-primary/20 text-foreground" 
                                : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                            }
                          `}
                        >
                          <div className="text-xs uppercase">
                            {format(date, "EEE", { locale: ptBR })}
                          </div>
                          <div className="text-lg font-bold">
                            {format(date, "dd")}
                          </div>
                          <div className="text-xs">
                            {format(date, "MMM", { locale: ptBR })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">Escolha o horário</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {getTimesForDate(selectedDate).map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`
                            py-2 px-3 rounded-lg text-sm font-medium transition-all
                            ${selectedTime === time 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted hover:bg-primary/20 text-foreground"
                            }
                          `}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Continue Button */}
                <Button 
                  onClick={handleContinue}
                  disabled={!selectedDate || !selectedTime}
                  className="w-full h-12 text-base font-semibold"
                >
                  Continuar
                </Button>

                {selectedDate && selectedTime && (
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    {format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PerfilMedico;
