"use client";

import { FormEvent, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { ResponsePanel } from "@/components/features/response-panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { consultarRps } from "@/lib/nfse-api";
import type { FiscalResponse } from "@/lib/types";
import { deepFindValue, formatDocument, getErrorMessage, onlyDigits } from "@/lib/utils";

export function RpsQueryView() {
  const [form, setForm] = useState({
    numero: "",
    serie: "A1",
    tipo: "1",
    prestador_cnpj: "",
    inscricao_municipal: ""
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FiscalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResponse(null);

    if (!form.numero || Number(form.numero) <= 0) {
      setError("Informe o número do RPS.");
      return;
    }
    if (!form.serie.trim()) {
      setError("Informe a série do RPS.");
      return;
    }

    setLoading(true);
    try {
      setResponse(
        await consultarRps({
          ...form,
          prestador_cnpj: onlyDigits(form.prestador_cnpj),
          inscricao_municipal: form.inscricao_municipal
        })
      );
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const nfseNumber = deepFindValue(response?.parsed_response, ["numero_nfse", "numeroNfse", "numero"]);
  const verification = deepFindValue(response?.parsed_response, ["codigo_verificacao", "codigoVerificacao"]);

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Consulta por RPS</h1>
        <p className="text-sm text-muted-foreground">Busca fiscal no WebISS via backend.</p>
      </header>

      <form onSubmit={submit} className="grid gap-5 rounded-lg border bg-white p-5 shadow-soft">
        {error && <Alert variant="danger" className="whitespace-pre-wrap">{error}</Alert>}

        <div className="field-grid">
          <div className="grid gap-2">
            <Label htmlFor="numero">Número do RPS</Label>
            <Input
              id="numero"
              value={form.numero}
              onChange={(event) => setField("numero", onlyDigits(event.target.value))}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="serie">Série</Label>
            <Input id="serie" value={form.serie} onChange={(event) => setField("serie", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tipo">Tipo</Label>
            <select
              id="tipo"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.tipo}
              onChange={(event) => setField("tipo", event.target.value)}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
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

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar
          </Button>
        </div>
      </form>

      {response && (
        <section className="rounded-lg border bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Dados principais</h2>
            <Badge variant={response.success ? "success" : "warning"}>{response.success ? "localizada" : "retorno"}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">NFS-e</div>
              <div className="text-lg font-semibold">{nfseNumber ?? "-"}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Verificação</div>
              <div className="text-lg font-semibold">{verification ?? "-"}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Provider</div>
              <div className="text-lg font-semibold">{response.provider}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Operação</div>
              <div className="text-lg font-semibold">{response.operation}</div>
            </div>
          </div>
        </section>
      )}

      <ResponsePanel response={response} title="Retorno da consulta" />
    </div>
  );
}
