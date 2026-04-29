import type { FiscalResponse } from "@/lib/types";
import { compactQuery } from "@/lib/utils";

export const fiscalApiBaseUrl = process.env.NEXT_PUBLIC_NFSE_API_URL ?? "http://127.0.0.1:8000";
export const dataApiBaseUrl = process.env.NEXT_PUBLIC_NFSE_DATA_API_URL ?? "http://127.0.0.1:8001";

export class FiscalApiError extends Error {
  status?: number;
  detail?: unknown;

  constructor(message: string, status?: number, detail?: unknown) {
    super(message);
    this.name = "FiscalApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function parseError(response: Response) {
  try {
    const body = await response.json();
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item: { loc?: string[]; msg?: string }) => `${item.loc?.join(".") ?? "campo"}: ${item.msg}`)
        .join("\n");
    }
    return body.detail ?? body.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

async function requestFiscal(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`${fiscalApiBaseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });
  } catch (error) {
    throw new FiscalApiError(
      "Backend fiscal offline ou bloqueado por CORS. Verifique a API em http://127.0.0.1:8000.",
      undefined,
      error
    );
  }

  if (!response.ok) {
    const detail = await parseError(response);
    const hint =
      response.status === 502
        ? "Falha de comunicação com WebISS."
        : response.status === 422
          ? "Erro de validação do backend."
          : "Erro retornado pela API fiscal.";
    throw new FiscalApiError(`${hint}\n${detail}`, response.status, detail);
  }

  return (await response.json()) as FiscalResponse;
}

export async function checkHealth(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/health`, { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, detail: `HTTP ${response.status}` };
    }
    const body = await response.json();
    return { ok: true, detail: body.provider ?? body.service ?? body.status ?? "ok" };
  } catch {
    return { ok: false, detail: "offline ou CORS" };
  }
}

export function emitirNfse(payload: Record<string, unknown>) {
  return requestFiscal("/nfse/emitir", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function consultarRps(params: {
  numero: string;
  serie: string;
  tipo: string;
  prestador_cnpj?: string;
  inscricao_municipal?: string;
}) {
  const query = compactQuery({
    serie: params.serie,
    tipo: params.tipo || 1,
    prestador_cnpj: params.prestador_cnpj,
    inscricao_municipal: params.inscricao_municipal
  });

  return requestFiscal(`/nfse/rps/${params.numero}?${query}`, { method: "GET" });
}

export function consultarPrestadas(params: {
  data_inicial: string;
  data_final: string;
  pagina: string;
  periodo_tipo: string;
  numero_nfse?: string;
  prestador_cnpj?: string;
  inscricao_municipal?: string;
}) {
  const query = compactQuery(params);
  return requestFiscal(`/nfse/prestadas?${query}`, { method: "GET" });
}

export function cancelarNfse(params: {
  numero: string;
  codigo_cancelamento: string;
  prestador_cnpj?: string;
  inscricao_municipal?: string;
  codigo_municipio?: string;
}) {
  const query = compactQuery({
    prestador_cnpj: params.prestador_cnpj,
    inscricao_municipal: params.inscricao_municipal,
    codigo_municipio: params.codigo_municipio
  });

  return requestFiscal(`/nfse/${params.numero}/cancelar${query ? `?${query}` : ""}`, {
    method: "POST",
    body: JSON.stringify({
      codigo_cancelamento: Number(params.codigo_cancelamento || 2)
    })
  });
}
