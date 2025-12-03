import professionalSection from "@/assets/professional-section.png";

const ProfessionalCTASection = () => {
  return (
    <section className="relative w-full">
      <img 
        src={professionalSection}
        alt="Também é Profissional da Saúde?"
        className="w-full h-auto"
      />
    </section>
  );
};

export default ProfessionalCTASection;
