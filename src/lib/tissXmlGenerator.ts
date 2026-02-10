/**
 * TISS XML Generator - Generates XML following ANS TISS standard
 * Validates required fields before generating
 */

export interface TissGuiaData {
  numero_guia: string | null;
  operadora: string;
  plano: string | null;
  carteirinha: string | null;
  crm: string | null;
  crm_uf: string | null;
  tipo_guia: string;
  data_emissao: string;
  valor_total: number;
  paciente_nome?: string;
  paciente_cpf?: string;
  medico_nome?: string;
  itens: TissGuiaItemData[];
}

export interface TissGuiaItemData {
  codigo_tuss: string;
  descricao: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  especie: string | null;
}

export interface TissLoteData {
  numero_lote: string;
  operadora: string;
  competencia: string;
  clinica_cnpj: string | null;
  clinica_nome: string;
  created_at: string;
  guias: TissGuiaData[];
}

export interface ValidationError {
  field: string;
  message: string;
  guia?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
}

function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
}

export function validateTissLote(lote: TissLoteData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!lote.numero_lote) errors.push({ field: "numero_lote", message: "Número do lote é obrigatório" });
  if (!lote.operadora) errors.push({ field: "operadora", message: "Operadora do lote é obrigatória" });
  if (!lote.competencia) errors.push({ field: "competencia", message: "Competência do lote é obrigatória" });
  if (!lote.clinica_nome) errors.push({ field: "clinica_nome", message: "Nome da clínica é obrigatório" });

  if (lote.guias.length === 0) {
    errors.push({ field: "guias", message: "Lote não possui guias vinculadas" });
  }

  lote.guias.forEach((guia, idx) => {
    const guiaLabel = guia.numero_guia || `Guia ${idx + 1}`;

    if (!guia.numero_guia) errors.push({ field: "numero_guia", message: "Número da guia ausente", guia: guiaLabel });
    if (!guia.operadora) errors.push({ field: "operadora", message: "Operadora ausente na guia", guia: guiaLabel });
    if (!guia.carteirinha) errors.push({ field: "carteirinha", message: "Carteirinha do paciente ausente", guia: guiaLabel });
    if (!guia.crm) errors.push({ field: "crm", message: "CRM do médico ausente", guia: guiaLabel });
    if (!guia.crm_uf) errors.push({ field: "crm_uf", message: "UF do CRM ausente", guia: guiaLabel });
    if (!guia.paciente_nome) errors.push({ field: "paciente_nome", message: "Nome do paciente ausente", guia: guiaLabel });

    if (guia.itens.length === 0) {
      errors.push({ field: "itens", message: "Guia sem procedimentos", guia: guiaLabel });
    }

    guia.itens.forEach((item, iIdx) => {
      if (!item.codigo_tuss) errors.push({ field: `item_${iIdx}_codigo`, message: `Código TUSS ausente no item ${iIdx + 1}`, guia: guiaLabel });
      if (item.valor_unitario <= 0) errors.push({ field: `item_${iIdx}_valor`, message: `Valor unitário inválido no item ${iIdx + 1}`, guia: guiaLabel });
    });
  });

  return errors;
}

export function generateTissXml(lote: TissLoteData): string {
  const now = new Date();
  const sequencial = lote.numero_lote.replace(/\D/g, "").slice(-12).padStart(12, "0");

  let guiasXml = "";
  lote.guias.forEach((guia) => {
    let itensXml = "";
    guia.itens.forEach((item, idx) => {
      itensXml += `
            <ans:procedimentoExecutado>
              <ans:sequencialItem>${idx + 1}</ans:sequencialItem>
              <ans:dataExecucao>${formatDate(guia.data_emissao)}</ans:dataExecucao>
              <ans:horaInicial>00:00:00</ans:horaInicial>
              <ans:horaFinal>00:30:00</ans:horaFinal>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>${escapeXml(item.codigo_tuss)}</ans:codigoProcedimento>
                <ans:descricaoProcedimento>${escapeXml(item.descricao || "")}</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>${item.quantidade}</ans:quantidadeExecutada>
              <ans:reducaoAcrescimo>1.00</ans:reducaoAcrescimo>
              <ans:valorUnitario>${item.valor_unitario.toFixed(2)}</ans:valorUnitario>
              <ans:valorTotal>${item.valor_total.toFixed(2)}</ans:valorTotal>
            </ans:procedimentoExecutado>`;
    });

    guiasXml += `
        <ans:guiaSP-SADT>
          <ans:cabecalhoGuia>
            <ans:registroANS>${escapeXml(guia.operadora)}</ans:registroANS>
            <ans:numeroGuiaPrestador>${escapeXml(guia.numero_guia || "")}</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>${escapeXml(guia.carteirinha || "")}</ans:numeroCarteira>
            <ans:nomeBeneficiario>${escapeXml(guia.paciente_nome || "")}</ans:nomeBeneficiario>
          </ans:dadosBeneficiario>
          <ans:dadosSolicitante>
            <ans:contratadoSolicitante>
              <ans:nomeContratado>${escapeXml(lote.clinica_nome)}</ans:nomeContratado>
            </ans:contratadoSolicitante>
            <ans:profissionalSolicitante>
              <ans:nomeProfissional>${escapeXml(guia.medico_nome || "")}</ans:nomeProfissional>
              <ans:conselhoProfissional>CRM</ans:conselhoProfissional>
              <ans:numeroConselhoProfissional>${escapeXml(guia.crm || "")}</ans:numeroConselhoProfissional>
              <ans:UF>${escapeXml(guia.crm_uf || "")}</ans:UF>
            </ans:profissionalSolicitante>
          </ans:dadosSolicitante>
          <ans:dadosExecutante>
            <ans:contratadoExecutante>
              <ans:nomeContratado>${escapeXml(lote.clinica_nome)}</ans:nomeContratado>
              ${lote.clinica_cnpj ? `<ans:CNPJ>${escapeXml(lote.clinica_cnpj.replace(/\D/g, ""))}</ans:CNPJ>` : ""}
            </ans:contratadoExecutante>
          </ans:dadosExecutante>
          <ans:procedimentosExecutados>${itensXml}
          </ans:procedimentosExecutados>
          <ans:valorTotal>
            <ans:valorProcedimentos>${guia.valor_total.toFixed(2)}</ans:valorProcedimentos>
            <ans:valorTotal>${guia.valor_total.toFixed(2)}</ans:valorTotal>
          </ans:valorTotal>
        </ans:guiaSP-SADT>`;
  });

  const valorTotalLote = lote.guias.reduce((sum, g) => sum + g.valor_total, 0);

  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.ans.gov.br/padroes/tiss/schemas tissV4_01_00.xsd">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${sequencial}</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${formatDate(now.toISOString())}</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>${now.toTimeString().slice(0, 8)}</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:nomeContratado>${escapeXml(lote.clinica_nome)}</ans:nomeContratado>
        ${lote.clinica_cnpj ? `<ans:CNPJ>${escapeXml(lote.clinica_cnpj.replace(/\D/g, ""))}</ans:CNPJ>` : ""}
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>${escapeXml(lote.operadora)}</ans:registroANS>
    </ans:destino>
    <ans:versaoPadrao>4.01.00</ans:versaoPadrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>${escapeXml(lote.numero_lote)}</ans:numeroLote>
      <ans:guiasTISS>${guiasXml}
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
  <ans:epilogo>
    <ans:hash>__HASH__</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`;

  const hash = generateHash(xmlBody);
  return xmlBody.replace("__HASH__", hash);
}

export function validateXmlStructure(xml: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check well-formedness via DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    errors.push({ field: "xml", message: `XML mal-formado: ${parseError.textContent?.slice(0, 200)}` });
    return errors;
  }

  // Verify required TISS elements
  const requiredElements = [
    { path: "cabecalho", label: "Cabeçalho" },
    { path: "prestadorParaOperadora", label: "Prestador para Operadora" },
    { path: "epilogo", label: "Epílogo" },
  ];

  const root = doc.documentElement;
  requiredElements.forEach(({ path, label }) => {
    const found = root.getElementsByTagNameNS("*", path);
    if (found.length === 0) {
      errors.push({ field: path, message: `Elemento obrigatório ausente: ${label}` });
    }
  });

  // Verify loteGuias exists
  const loteGuias = root.getElementsByTagNameNS("*", "loteGuias");
  if (loteGuias.length === 0) {
    errors.push({ field: "loteGuias", message: "Lote de guias ausente no XML" });
  }

  // Verify guias exist
  const guias = root.getElementsByTagNameNS("*", "guiaSP-SADT");
  if (guias.length === 0) {
    errors.push({ field: "guias", message: "Nenhuma guia SP/SADT encontrada no XML" });
  }

  // Check hash
  const hashEl = root.getElementsByTagNameNS("*", "hash");
  if (hashEl.length === 0 || !hashEl[0].textContent?.trim()) {
    errors.push({ field: "hash", message: "Hash do epílogo ausente ou vazio" });
  }

  // Check versaoPadrao
  const versao = root.getElementsByTagNameNS("*", "versaoPadrao");
  if (versao.length > 0 && versao[0].textContent !== "4.01.00") {
    errors.push({ field: "versao", message: `Versão TISS esperada: 4.01.00, encontrada: ${versao[0].textContent}` });
  }

  return errors;
}
