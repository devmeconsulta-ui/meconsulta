import { useOutletContext } from "react-router-dom";
import OmniAtendimentos from "@/pages/clinica/omnichannel/OmniAtendimentos";

// Reutiliza a página de atendimentos da clínica
// O contexto é passado automaticamente pelo outlet
export default function AtendenteAtendimentos() {
  return <OmniAtendimentos />;
}
