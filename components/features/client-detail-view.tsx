"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Edit3, FilePlus2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clientRepository, nfseHistoryRepository } from "@/lib/local-db";
import type { Client, NfseRecord, NfseStatus } from "@/lib/types";
import { formatCurrency, formatDate, formatDocument } from "@/lib/utils";

const statuses: Array<"todos" | NfseStatus> = [
  "todos",
  "emitida",
  "rejeitada",
  "cancelada",
  "erro_comunicacao",
  "rascunho"
];

function statusVariant(status: NfseRecord["status"]) {
  if (status === "emitida") return "success";
  if (status === "cancelada") return "danger";
  if (status === "rejeitada" || status === "erro_comunicacao") return "warning";
  return "muted";
}

export function ClientDetailView() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [records, setRecords] = useState<NfseRecord[]>([]);
  const [status, setStatus] = useState<"todos" | NfseStatus>("todos");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!params.id) {
      return;
    }

    void Promise.all([clientRepository.get(params.id), nfseHistoryRepository.list({ clientId: params.id })]).then(
      ([clientResult, recordList]) => {
        setClient(clientResult ?? null);
        setRecords(recordList);
      }
    );
  }, [params.id]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const statusMatch = status === "todos" || record.status === status;
      const date = record.data_emissao ?? record.competencia ?? "";
      const startMatch = !startDate || date >= startDate;
      const endMatch = !endDate || date <= endDate;
      return statusMatch && startMatch && endMatch;
    });
  }, [endDate, records, startDate, status]);

  const total = filteredRecords
    .filter((record) => record.status === "emitida")
    .reduce((sum, record) => sum + Number(record.valor_servicos || 0), 0);

  if (!client) {
    return (
      <div className="grid gap-4">
        <Button asChild variant="outline" className="w-fit">
          <Link href="/clientes">
            <ArrowLeft className="h-4 w-4" />
            Clientes
          </Link>
        </Button>
        <section className="rounded-lg border bg-white p-8 text-center text-muted-foreground shadow-soft">
          Cliente não encontrado.
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="icon" aria-label="Voltar">
            <Link href="/clientes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{client.razao_social}</h1>
            <p className="text-sm text-muted-foreground">{formatDocument(client.documento, client.tipo_documento)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/clientes?edit=${client.id}`}>
              <Edit3 className="h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/emissao?clientId=${client.id}`}>
              <FilePlus2 className="h-4 w-4" />
              Emitir NFS-e
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-lg border bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-semibold">Cadastro</h2>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="font-medium">{client.email || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Telefone</dt>
              <dd className="font-medium">{client.telefone || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inscrição municipal</dt>
              <dd className="font-medium">{client.inscricao_municipal || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Endereço</dt>
              <dd className="font-medium">
                {[client.endereco.endereco, client.endereco.numero, client.endereco.bairro]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Município</dt>
              <dd className="font-medium">
                {client.endereco.codigo_municipio || "-"} {client.endereco.uf ? `· ${client.endereco.uf}` : null}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-soft">
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-lg font-semibold">Histórico</h2>
              <p className="text-sm text-muted-foreground">{formatCurrency(total)} no filtro atual.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <input
                type="date"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-scroll">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/60 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">RPS</th>
                  <th className="px-3 py-2 font-medium">NFS-e</th>
                  <th className="px-3 py-2 font-medium">Emissão</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b last:border-0">
                    <td className="px-3 py-3">{record.numero_rps}/{record.serie_rps}</td>
                    <td className="px-3 py-3">{record.numero_nfse ?? "-"}</td>
                    <td className="px-3 py-3">{formatDate(record.data_emissao)}</td>
                    <td className="px-3 py-3">{formatCurrency(record.valor_servicos)}</td>
                    <td className="px-3 py-3">
                      <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
                    </td>
                  </tr>
                ))}
                {!filteredRecords.length && (
                  <tr>
                    <td className="px-3 py-8 text-center text-muted-foreground" colSpan={5}>
                      Cliente sem histórico neste filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
