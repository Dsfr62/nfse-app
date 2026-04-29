"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { ResponsePanel } from "@/components/features/response-panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientRepository } from "@/lib/local-db";
import { consultarPrestadas } from "@/lib/nfse-api";
import type { Client, FiscalResponse } from "@/lib/types";
import {
  deepFindValue,
  extractObjectRows,
  formatCurrency,
  formatDate,
  formatDocument,
  getErrorMessage,
  onlyDigits,
  todayIso
} from "@/lib/utils";

function monthStartIso() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

export function PeriodQueryView() {
  const [form, setForm] = useState({
    data_inicial: monthStartIso(),
    data_final: todayIso(),
    pagina: "1",
    periodo_tipo: "emissao",
    numero_nfse: "",
    prestador_cnpj: "",
    inscricao_municipal: ""
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FiscalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void clientRepository.list().then(setClients);
  }, []);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const rows = useMemo(() => extractObjectRows(response?.parsed_response), [response]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResponse(null);

    if (!form.data_inicial || !form.data_final) {
      setError("Informe o período da consulta.");
      return;
    }
    if (form.data_final < form.data_inicial) {
      setError("Data final deve ser maior ou igual à data inicial.");
      return;
    }

    setLoading(true);
    try {
      setResponse(
        await consultarPrestadas({
          ...form,
          prestador_cnpj: onlyDigits(form.prestador_cnpj)
        })
      );
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const findClient = (row: Record<string, unknown>) => {
    const document =
      deepFindValue(row, ["cnpj", "cpf", "documento", "CpfCnpj"])?.replace(/\D/g, "") ?? "";
    return clients.find((client) => client.documento === document);
  };

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">NFS-e prestadas</h1>
        <p className="text-sm text-muted-foreground">Consulta por emissão ou competência.</p>
      </header>

      <form onSubmit={submit} className="grid gap-5 rounded-lg border bg-white p-5 shadow-soft">
        {error && <Alert variant="danger" className="whitespace-pre-wrap">{error}</Alert>}

        <div className="field-grid">
          <div className="grid gap-2">
            <Label htmlFor="data_inicial">Data inicial</Label>
            <Input
              id="data_inicial"
              type="date"
              value={form.data_inicial}
              onChange={(event) => setField("data_inicial", event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="data_final">Data final</Label>
            <Input
              id="data_final"
              type="date"
              value={form.data_final}
              onChange={(event) => setField("data_final", event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="periodo_tipo">Tipo de período</Label>
            <select
              id="periodo_tipo"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.periodo_tipo}
              onChange={(event) => setField("periodo_tipo", event.target.value)}
            >
              <option value="emissao">Emissão</option>
              <option value="competencia">Competência</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pagina">Página</Label>
            <Input
              id="pagina"
              value={form.pagina}
              onChange={(event) => setField("pagina", onlyDigits(event.target.value))}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="numero_nfse">Número NFS-e</Label>
            <Input
              id="numero_nfse"
              value={form.numero_nfse}
              onChange={(event) => setField("numero_nfse", onlyDigits(event.target.value))}
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
            <h2 className="text-lg font-semibold">Resultado</h2>
            <Badge variant={response.success ? "success" : "warning"}>{rows.length} itens</Badge>
          </div>

          <div className="table-scroll">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b bg-muted/60 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Número</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Tomador</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const client = findClient(row);
                  const number = deepFindValue(row, ["numero_nfse", "numero", "Numero"]);
                  const date = deepFindValue(row, ["data_emissao", "data", "DataEmissao", "competencia"]);
                  const taker = deepFindValue(row, ["razao_social", "razaoSocial", "tomador", "nome"]);
                  const amount = deepFindValue(row, ["valor_servicos", "valorServicos", "valor", "ValorServicos"]);

                  return (
                    <tr key={`${number ?? "row"}-${index}`} className="border-b last:border-0">
                      <td className="px-3 py-3">{number ?? "-"}</td>
                      <td className="px-3 py-3">{formatDate(date)}</td>
                      <td className="px-3 py-3">{taker ?? "-"}</td>
                      <td className="px-3 py-3">{amount ? formatCurrency(amount) : "-"}</td>
                      <td className="px-3 py-3">
                        {client ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/clientes/${client.id}`}>{client.razao_social}</Link>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">sem vínculo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td className="px-3 py-8 text-center text-muted-foreground" colSpan={5}>
                      Nenhuma lista tabular no retorno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ResponsePanel response={response} title="Retorno da consulta" />
    </div>
  );
}
