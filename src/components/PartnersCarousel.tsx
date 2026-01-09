import sicoobLogo from "@/assets/partners/sicoob.png";
import santanderLogo from "@/assets/partners/santander.png";
import bradescoLogo from "@/assets/partners/bradesco.png";
import uberLogo from "@/assets/partners/uber.png";

interface Partner {
  name: string;
  logo: string;
}

const partners: Partner[] = [
  { name: "Sicoob", logo: sicoobLogo },
  { name: "Santander", logo: santanderLogo },
  { name: "Bradesco", logo: bradescoLogo },
  { name: "Uber", logo: uberLogo },
];

interface PartnersCarouselProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export default function PartnersCarousel({ 
  title = "Nossos Parceiros", 
  subtitle = "Empresas que confiam na MeConsulta",
  compact = false
}: PartnersCarouselProps) {
  // Duplicate for seamless infinite scroll
  const duplicatedPartners = [...partners, ...partners, ...partners];

  return (
    <section className={compact ? "py-4 sm:py-6" : "py-8 sm:py-12 lg:py-16"}>
      <div className={compact ? "" : "container mx-auto px-4"}>
        {!compact && (
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">
              {title}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {subtitle}
            </p>
          </div>
        )}

        {compact && (
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">{title}</h3>
          </div>
        )}

        {/* Carousel Container */}
        <div className="relative overflow-hidden">
          {/* Gradient Overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          {/* Scrolling Track */}
          <div className="flex animate-scroll">
            {duplicatedPartners.map((partner, index) => (
              <div
                key={`${partner.name}-${index}`}
                className={`flex-shrink-0 ${compact ? "mx-2 sm:mx-4 lg:mx-6" : "mx-3 sm:mx-6 lg:mx-10"}`}
              >
                <div className={`
                  bg-card/50 rounded-lg sm:rounded-xl border border-border/50 
                  flex items-center justify-center
                  hover:border-primary/30 hover:bg-card transition-all duration-300
                  ${compact ? "w-20 h-10 sm:w-24 sm:h-12 lg:w-32 lg:h-16 p-1.5 sm:p-2" : "w-24 h-14 sm:w-32 sm:h-20 lg:w-44 lg:h-24 p-2 sm:p-4"}
                `}>
                  <img
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    className="max-w-full max-h-full object-contain filter grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
