import type { Client, FiscalResponse, NfseRecord } from "@/lib/types";
import { deepFindValue, decimalString, onlyDigits } from "@/lib/utils";

export type IssueForm = {
  numero_lote: string;
  prestador_cnpj: string;
  prestador_inscricao_municipal: string;
  rps_numero: string;
  rps_serie: string;
  rps_tipo: string;
  data_emissao: string;
  competencia: string;
  valor_servicos: string;
  valor_deducoes: string;
  valor_pis: string;
  valor_cofins: string;
  valor_inss: string;
  valor_ir: string;
  valor_csll: string;
  outras_retencoes: string;
  valor_iss: string;
  aliquota: string;
  desconto_incondicionado: string;
  desconto_condicionado: string;
  iss_retido: string;
  item_lista_servico: string;
  codigo_cnae: string;
  codigo_tributacao_municipio: string;
  codigo_nbs: string;
  discriminacao: string;
  codigo_municipio: string;
  codigo_pais: string;
  exigibilidade_iss: string;
  municipio_incidencia: string;
  optante_simples_nacional: string;
  incentivo_fiscal: string;
  fin_nfse: string;
  ind_final: string;
  cIndOp: string;
  ind_dest: string;
  ibscbs_cst: string;
  ibscbs_classificacao: string;
};

export function clientToTomador(client: Client) {
  return {
    cpf_cnpj: client.tipo_documento === "cpf" ? { cpf: client.documento } : { cnpj: client.documento },
    inscricao_municipal: client.inscricao_municipal || undefined,
    razao_social: client.razao_social,
    endereco: {
      endereco: client.endereco.endereco || undefined,
      numero: client.endereco.numero || undefined,
      complemento: client.endereco.complemento || undefined,
      bairro: client.endereco.bairro || undefined,
      codigo_municipio: onlyDigits(client.endereco.codigo_municipio) || undefined,
      uf: client.endereco.uf || undefined,
      codigo_pais: onlyDigits(client.endereco.codigo_pais) || undefined,
      cep: onlyDigits(client.endereco.cep) || undefined
    },
    contato: {
      telefone: onlyDigits(client.telefone ?? "") || undefined,
      email: client.email || undefined
    }
  };
}

export function buildEmitirPayload(form: IssueForm, client: Client) {
  return {
    numero_lote: Number(form.numero_lote),
    prestador: {
      cpf_cnpj: {
        cnpj: onlyDigits(form.prestador_cnpj)
      },
      inscricao_municipal: form.prestador_inscricao_municipal
    },
    rps: {
      numero: Number(form.rps_numero),
      serie: form.rps_serie,
      tipo: Number(form.rps_tipo || 1),
      data_emissao: form.data_emissao,
      status: 1
    },
    competencia: form.competencia,
    servico: {
      valores: {
        valor_servicos: decimalString(form.valor_servicos, 2),
        valor_deducoes: decimalString(form.valor_deducoes, 2),
        valor_pis: decimalString(form.valor_pis, 2),
        valor_cofins: decimalString(form.valor_cofins, 2),
        valor_inss: decimalString(form.valor_inss, 2),
        valor_ir: decimalString(form.valor_ir, 2),
        valor_csll: decimalString(form.valor_csll, 2),
        outras_retencoes: decimalString(form.outras_retencoes, 2),
        valor_iss: decimalString(form.valor_iss, 2),
        aliquota: decimalString(form.aliquota, 4),
        desconto_incondicionado: decimalString(form.desconto_incondicionado, 2),
        desconto_condicionado: decimalString(form.desconto_condicionado, 2)
      },
      iss_retido: Number(form.iss_retido || 2),
      item_lista_servico: form.item_lista_servico,
      codigo_cnae: form.codigo_cnae ? Number(onlyDigits(form.codigo_cnae)) : undefined,
      codigo_tributacao_municipio: form.codigo_tributacao_municipio || undefined,
      codigo_nbs: onlyDigits(form.codigo_nbs),
      discriminacao: form.discriminacao,
      codigo_municipio: onlyDigits(form.codigo_municipio),
      codigo_pais: onlyDigits(form.codigo_pais),
      exigibilidade_iss: Number(form.exigibilidade_iss || 1),
      municipio_incidencia: onlyDigits(form.municipio_incidencia || form.codigo_municipio)
    },
    tomador: clientToTomador(client),
    optante_simples_nacional: Number(form.optante_simples_nacional || 2),
    incentivo_fiscal: Number(form.incentivo_fiscal || 2),
    ibscbs: {
      fin_nfse: Number(form.fin_nfse || 0),
      ind_final: Number(form.ind_final || 0),
      cIndOp: form.cIndOp,
      ind_dest: Number(form.ind_dest || 0),
      tributacao: {
        cst: form.ibscbs_cst,
        codigo_classificacao_tributaria: form.ibscbs_classificacao
      }
    }
  };
}

export function fiscalResponseToRecord(
  form: IssueForm,
  client: Client,
  payload: Record<string, unknown>,
  response: FiscalResponse | null,
  fallbackStatus: NfseRecord["status"]
): Omit<NfseRecord, "id" | "created_at" | "updated_at"> {
  const parsed = response?.parsed_response ?? {};
  const nfseNumber = deepFindValue(parsed, ["numero_nfse", "numeroNfse", "numero", "Numero"]);
  const verificationCode = deepFindValue(parsed, [
    "codigo_verificacao",
    "codigoVerificacao",
    "CodigoVerificacao",
    "codigo"
  ]);

  return {
    client_id: client.id,
    provider: response?.provider ?? "webiss_aracaju",
    operation: response?.operation ?? "RecepcionarLoteRpsSincrono",
    status: response ? (response.success ? "emitida" : "rejeitada") : fallbackStatus,
    numero_lote: Number(form.numero_lote),
    numero_rps: Number(form.rps_numero),
    serie_rps: form.rps_serie,
    tipo_rps: Number(form.rps_tipo || 1),
    numero_nfse: nfseNumber ?? null,
    codigo_verificacao: verificationCode ?? null,
    data_emissao: form.data_emissao,
    competencia: form.competencia,
    valor_servicos: decimalString(form.valor_servicos, 2),
    valor_iss: decimalString(form.valor_iss, 2),
    aliquota: decimalString(form.aliquota, 4),
    discriminacao: form.discriminacao,
    item_lista_servico: form.item_lista_servico,
    codigo_tributacao_municipio: form.codigo_tributacao_municipio,
    codigo_nbs: onlyDigits(form.codigo_nbs),
    ibscbs_cst: form.ibscbs_cst,
    ibscbs_classificacao: form.ibscbs_classificacao,
    request_payload: payload,
    parsed_response: parsed,
    messages: response?.messages ?? [],
    raw_response_xml: response?.raw_response_xml ?? null
  };
}
