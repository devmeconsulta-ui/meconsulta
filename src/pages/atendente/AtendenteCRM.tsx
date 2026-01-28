import { useOutletContext } from "react-router-dom";
import ClinicaCRM from "@/pages/clinica/ClinicaCRM";

// Reutiliza a página de CRM da clínica
export default function AtendenteCRM() {
  return <ClinicaCRM />;
}
