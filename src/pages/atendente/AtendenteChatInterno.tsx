import { useOutletContext } from "react-router-dom";
import ClinicaChat from "@/pages/clinica/ClinicaChat";

// Reutiliza a página de chat interno da clínica
export default function AtendenteChatInterno() {
  return <ClinicaChat />;
}
