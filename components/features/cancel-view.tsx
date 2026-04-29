"use client";

import { FormEvent, useState } from "react";
import { Ban, Loader2 } from "lucide-react";

import { ResponsePanel } from "@/components/features/response-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nfseHistoryRepository } from "@/lib/local-db";
import { cancelarNfse } from "@/lib/nfse-api";
import type { FiscalResponse } from "@/lib/types";
import { formatDocument, getErrorMessage, onlyDigits } from "@/lib/utils";

export function CancelView() {
  const [form, setForm] = useState({
    numero: "",
    codigo_cancelamento: "2",
    prestador_cnpj: "",
    inscricao_municipal: "",
    codigo_municipio: "2800308"
  });
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FiscalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedRecords, setUpdatedRecords] = useState<number | null>(null);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResponse(null);
    setUpdatedRecords(null);

    if (!form.numero || Number(form.numero) <= 0) {
      setError("Informe o número da NFS-e.");
      return;
    }
    if (!confirmed) {
      setError("Confirme o cancelamento antes de enviar.");
      return;
    }

    setLoading(true);
    try {
      const fiscalResponse = await cancelarNfse({
        ...form,
        prestador_cnpj: onlyDigits(form.prestador_cnpj),
        codigo_municipio: onlyDigits(form.codigo_municipio)
      });
      setResponse(fiscalResponse);

      if (fiscalResponse.success) {
        const updated = await nfseHistoryRepository.markCancelledByNumber(form.numero, {
          operation: fiscalResponse.operation,
          parsed_response: fiscalResponse.parsed_response,
          messages: fiscalResponse.messages,
          raw_response_xml: fiscalResponse.raw_response_xml ?? null
        });
        setUpdatedRecords(updated);
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Cancelamento</h1>
        <p className="text-sm text-muted-foreground">Ação fiscal sensível com confirmação explícita.</p>
      </header>

      <form onSubmit={submit} className="grid gap-5 rounded-lg border bg-white p-5 shadow-soft">
        {error && <Alert variant="danger" className="whitespace-pre-wrap">{error}</Alert>}
        {updatedRecords !== null && (
          <Alert variant="success">{updatedRecords} registro(s) local(is) atualizado(s).</Alert>
        )}

        <div className="field-grid">
          <div className="grid gap-2">
            <Label htmlFor="numero">Número da NFS-e</Label>
            <Input
              id="numero"
              value={form.numero}
              onChange={(event) => setField("numero", onlyDigits(event.target.value))}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="codigo_cancelamento">Código cancelamento</Label>
            <select
              id="codigo_cancelamento"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.codigo_cancelamento}
              onChange={(event) => setField("codigo_cancelamento", event.target.value)}
            >
              {[1, 2, 3, 4, 5].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="codigo_municipio">Código município</Label>
            <Input
              id="codigo_municipio"
              value={form.codigo_municipio}
              onChange={(event) => setField("codigo_municipio", onlyDigits(event.target.value).slice(0, 7))}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prestador_cnpj">CNPJ prestador</Label>
            <Input
              id="prestador_cnpj"
              value={formatDocument(form.prestador_cnpj, "cnpj")}
              onChange={(event) => setField("prestador_cnpj", onlyDigits(event.target.value).slice(0, 14))}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inscricao_municipal">Inscrição municipal</Label>
            <Input
              id="inscricao_municipal"
              value={form.inscricao_municipal}
              onChange={(event) => setField("inscricao_municipal", event.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-lg border bg-amber-50 p-4 text-sm text-amber-950">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="h-4 w-4"
          />
          Confirmo o envio do pedido de cancelamento para a NFS-e informada.
        </label>

        <div className="flex justify-end">
          <Button type="submit" variant="destructive" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Cancelar NFS-e
          </Button>
        </div>
      </form>

      <ResponsePanel response={response} title="Retorno do cancelamento" />
    </div>
  );
}
