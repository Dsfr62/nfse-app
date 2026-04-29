"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Clock3,
  FilePlus2,
  History,
  RefreshCcw,
  Search,
  UsersRound
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkHealth, dataApiBaseUrl, fiscalApiBaseUrl } from "@/lib/nfse-api";
import { clientRepository, nfseHistoryRepository } from "@/lib/local-db";
import type { Client, HealthStatus, NfseRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function statusVariant(status: NfseRecord["status"]) {
  if (status === "emitida") return "success";
  if (status === "cancelada") return "danger";
  if (status === "rejeitada" || status === "erro_comunicacao") return "warning";
  return "muted";
}

export function DashboardView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [records, setRecords] = useState<NfseRecord[]>([]);
  const [health, setHealth] = useState<HealthStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [clientList, recordList, fiscalHealth, dataHealth] = await Promise.all([
      clientRepository.list(),
      nfseHistoryRepository.list(),
      checkHealth(fiscalApiBaseUrl),
      checkHealth(dataApiBaseUrl)
    ]);

    setClients(clientList);
    setRecords(recordList);
    setHealth([
      { label: "Fiscal", ok: fiscalHealth.ok, detail: fiscalHealth.detail },
      { label: "Dados", ok: dataHealth.ok, detail: dataHealth.detail }
    ]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const metrics = useMemo(() => {
    const issued = records.filter((record) => record.status === "emitida");
    const rejected = records.filter((record) => record.status === "rejeitada" || record.status === "erro_comunicacao");
    const cancelled = records.filter((record) => record.status === "cancelada");
    const total = issued.reduce((sum, record) => sum + Number(record.valor_servicos || 0), 0);

    return { issued: issued.length, rejected: rejected.length, cancelled: cancelled.length, total };
  }, [records]);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Operação fiscal e histórico local.</p>
        </div>
        <Button type="button" variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          Atualizar
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Clientes
              <UsersRound className="h-4 w-4 text-teal-700" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{clients.length}</div>
            <div className="text-sm text-muted-foreground">tomadores ativos</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Emitidas
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.issued}</div>
            <div className="text-sm text-muted-foreground">{formatCurrency(metrics.total)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pendências
              <Clock3 className="h-4 w-4 text-amber-700" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.rejected}</div>
            <div className="text-sm text-muted-foreground">rejeições ou comunicação</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Canceladas
              <Ban className="h-4 w-4 text-red-700" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.cancelled}</div>
            <div className="text-sm text-muted-foreground">registros locais</div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Últimas NFS-e</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/consultas/periodo">
                <History className="h-4 w-4" />
                Consultar
              </Link>
            </Button>
          </div>

          <div className="table-scroll">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/60 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">RPS</th>
                  <th className="px-3 py-2 font-medium">NFS-e</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 8).map((record) => (
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
                {!records.length && (
                  <tr>
                    <td className="px-3 py-8 text-center text-muted-foreground" colSpan={5}>
                      Nenhum histórico local.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border bg-white p-5 shadow-soft">
            <h2 className="mb-4 text-lg font-semibold">Ações</h2>
            <div className="grid gap-2">
              <Button asChild>
                <Link href="/emissao">
                  <FilePlus2 className="h-4 w-4" />
                  Emitir NFS-e
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/clientes">
                  <UsersRound className="h-4 w-4" />
                  Clientes
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/consultas/rps">
                  <Search className="h-4 w-4" />
                  Consulta por RPS
                </Link>
              </Button>
              <Button asChild variant="amber">
                <Link href="/cancelamento">
                  <Ban className="h-4 w-4" />
                  Cancelamento
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-soft">
            <h2 className="mb-4 text-lg font-semibold">APIs</h2>
            <div className="grid gap-3">
              {health.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.detail}</div>
                  </div>
                  <Badge variant={item.ok ? "success" : "danger"}>{item.ok ? "online" : "offline"}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
