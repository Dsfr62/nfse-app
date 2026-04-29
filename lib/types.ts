export type DocumentType = "cpf" | "cnpj";

export type NfseStatus =
  | "rascunho"
  | "emitindo"
  | "emitida"
  | "rejeitada"
  | "cancelada"
  | "erro_comunicacao";

export type WebissMessage = {
  codigo?: string | null;
  mensagem?: string | null;
  correcao?: string | null;
};

export type FiscalResponse = {
  success: boolean;
  provider: string;
  operation: string;
  parsed_response: Record<string, unknown>;
  messages: WebissMessage[];
  raw_response_xml?: string | null;
};

export type ClientAddress = {
  endereco: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  codigo_municipio: string;
  uf: string;
  codigo_pais: string;
  cep: string;
};

export type Client = {
  id: string;
  tipo_documento: DocumentType;
  documento: string;
  razao_social: string;
  inscricao_municipal?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco: ClientAddress;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type NfseRecord = {
  id: string;
  client_id?: string | null;
  provider: string;
  operation?: string | null;
  status: NfseStatus;
  numero_lote?: number | null;
  numero_rps: number;
  serie_rps: string;
  tipo_rps: number;
  numero_nfse?: string | null;
  codigo_verificacao?: string | null;
  data_emissao?: string | null;
  competencia?: string | null;
  valor_servicos: string;
  valor_iss?: string | null;
  aliquota?: string | null;
  discriminacao: string;
  item_lista_servico?: string | null;
  codigo_tributacao_municipio?: string | null;
  codigo_nbs?: string | null;
  ibscbs_cst?: string | null;
  ibscbs_classificacao?: string | null;
  request_payload?: Record<string, unknown> | null;
  parsed_response?: Record<string, unknown> | null;
  messages?: WebissMessage[];
  raw_response_xml?: string | null;
  created_at: string;
  updated_at: string;
};

export type HealthStatus = {
  label: string;
  ok: boolean;
  detail: string;
};
