import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Prefixes where internal navigation should NOT scroll to top
const NO_SCROLL_PREFIXES = ["/clinica", "/medico", "/paciente", "/admin", "/atendente"];

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const prev = prevPathname.current;
    prevPathname.current = pathname;

    // Skip scroll-to-top for internal panel navigation
    const isInternalNav = NO_SCROLL_PREFIXES.some(
      (prefix) => prev.startsWith(prefix) && pathname.startsWith(prefix)
    );

    if (!isInternalNav) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
};
