"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, Edit3, Eye, Plus, Search } from "lucide-react";

import { ClientForm } from "@/components/features/client-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientRepository } from "@/lib/local-db";
import type { Client } from "@/lib/types";
import { formatDocument, getErrorMessage } from "@/lib/utils";

export function ClientsView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (term = search) => {
    setClients(await clientRepository.list(term));
  };

  useEffect(() => {
    void clientRepository.list("").then(setClients);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (!editId) {
      return;
    }

    void clientRepository.get(editId).then((client) => {
      if (client) {
        setEditing(client);
        setShowForm(true);
      }
    });
  }, []);

  const submit = async (draft: Parameters<typeof clientRepository.create>[0]) => {
    setError(null);
    try {
      if (editing) {
        await clientRepository.update(editing.id, draft);
      } else {
        await clientRepository.create(draft);
      }
      setEditing(null);
      setShowForm(false);
      await load();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  const archive = async (client: Client) => {
    setError(null);
    try {
      await clientRepository.archive(client.id);
      await load();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Tomadores reutilizáveis na emissão.</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm((current) => !current); }}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </header>

      {error && <Alert variant="danger">{error}</Alert>}

      {showForm && (
        <ClientForm
          key={editing?.id ?? "new"}
          initialClient={editing}
          onSubmit={submit}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
          submitLabel={editing ? "Atualizar cliente" : "Salvar cliente"}
        />
      )}

      <section className="rounded-lg border bg-white p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou documento"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                void load(event.target.value);
              }}
            />
          </div>
          <Badge variant="muted">{clients.length} ativos</Badge>
        </div>

        <div className="table-scroll">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-muted/60 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Contato</th>
                <th className="px-3 py-2 font-medium">Município</th>
                <th className="px-3 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b last:border-0">
                  <td className="px-3 py-3 font-medium">{client.razao_social}</td>
                  <td className="px-3 py-3">{formatDocument(client.documento, client.tipo_documento)}</td>
                  <td className="px-3 py-3">
                    <div>{client.email || "-"}</div>
                    <div className="text-xs text-muted-foreground">{client.telefone || ""}</div>
                  </td>
                  <td className="px-3 py-3">
                    {client.endereco.codigo_municipio || "-"} {client.endereco.uf ? `· ${client.endereco.uf}` : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/clientes/${client.id}`}>
                          <Eye className="h-4 w-4" />
                          Abrir
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(client);
                          setShowForm(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => archive(client)}>
                        <Archive className="h-4 w-4" />
                        Arquivar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!clients.length && (
                <tr>
                  <td className="px-3 py-8 text-center text-muted-foreground" colSpan={5}>
                    Nenhum cliente ativo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
