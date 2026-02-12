import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const PANEL_PREFIXES = ["/clinica", "/medico", "/paciente", "/admin", "/atendente"];

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Don't scroll to top when navigating inside panels
    const isPanel = PANEL_PREFIXES.some((p) => pathname.startsWith(p));
    if (!isPanel) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
};
