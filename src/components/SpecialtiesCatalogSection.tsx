import { useState } from "react";
import { 
  Heart, Brain, Eye, Bone, Baby, Stethoscope, 
  Pill, Smile, Ear, Microscope, Activity, UserRound,
  Scissors, Leaf, Moon, Thermometer, ChevronDown, ChevronUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface SpecialtyItem {
  name: string;
  icon: LucideIcon;
  color: string;
}

const specialtiesData: SpecialtyItem[] = [
  { name: "Cardiologia", icon: Heart, color: "text-red-500" },
  { name: "Neurologia", icon: Brain, color: "text-purple-500" },
  { name: "Oftalmologia", icon: Eye, color: "text-blue-500" },
  { name: "Ortopedia", icon: Bone, color: "text-amber-600" },
  { name: "Pediatria", icon: Baby, color: "text-pink-500" },
  { name: "Clínico Geral", icon: Stethoscope, color: "text-primary" },
  { name: "Dermatologia", icon: UserRound, color: "text-orange-500" },
  { name: "Psiquiatria", icon: Moon, color: "text-indigo-500" },
  { name: "Otorrinolaringologia", icon: Ear, color: "text-teal-500" },
  { name: "Ginecologia", icon: Activity, color: "text-rose-500" },
  { name: "Urologia", icon: Thermometer, color: "text-cyan-500" },
  { name: "Endocrinologia", icon: Pill, color: "text-green-500" },
  { name: "Gastroenterologia", icon: Leaf, color: "text-lime-600" },
  { name: "Cirurgia Geral", icon: Scissors, color: "text-slate-600" },
  { name: "Odontologia", icon: Smile, color: "text-sky-500" },
  { name: "Exames", icon: Microscope, color: "text-violet-500" },
];

const SpecialtiesCatalogSection = () => {
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  const displayedSpecialties = showAll ? specialtiesData : specialtiesData.slice(0, 6);

  const handleSpecialtyClick = (specialtyName: string) => {
    navigate(`/buscar-medicos?especialidade=${encodeURIComponent(specialtyName.toLowerCase())}`);
  };

  return (
    <section id="especialidades" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Especialidades
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Encontre o especialista ideal para cuidar da sua saúde
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
          {displayedSpecialties.map((specialty) => {
            const IconComponent = specialty.icon;
            return (
              <button
                key={specialty.name}
                onClick={() => handleSpecialtyClick(specialty.name)}
                className="group flex flex-col items-center p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <IconComponent className={`w-6 h-6 ${specialty.color}`} />
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">
                  {specialty.name}
                </span>
              </button>
            );
          })}
        </div>

        {specialtiesData.length > 6 && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="gap-2"
            >
              {showAll ? (
                <>
                  Ver menos
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Ver mais especialidades
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default SpecialtiesCatalogSection;
