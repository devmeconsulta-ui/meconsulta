import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import SpecialtiesCatalogSection from "@/components/SpecialtiesCatalogSection";
import SpecialtiesSection from "@/components/SpecialtiesSection";
import AboutSection from "@/components/AboutSection";
import ProfessionalCTASection from "@/components/ProfessionalCTASection";
import TestimonialsSection from "@/components/TestimonialsSection";
import SearchCTASection from "@/components/SearchCTASection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import CookieConsent from "@/components/CookieConsent";
import PartnersCarousel from "@/components/PartnersCarousel";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { scrollTo?: string } | null;
    if (state?.scrollTo) {
      // Small delay to ensure the page has rendered
      setTimeout(() => {
        const element = document.getElementById(state.scrollTo!);
        element?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      // Clear the state to prevent re-scrolling on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PartnersCarousel />
        <SpecialtiesCatalogSection />
        <SpecialtiesSection />
        <AboutSection />
        <ProfessionalCTASection />
        <TestimonialsSection />
        <SearchCTASection />
        <ContactSection />
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieConsent />
    </div>
  );
};

export default Index;
