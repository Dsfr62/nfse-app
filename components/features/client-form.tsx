"use client";

import { Save, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Client, DocumentType } from "@/lib/types";
import {
  formatDocument,
  formatPhone,
  formatZipCode,
  onlyDigits,
  requiredLength,
  validateDocumentLength
} from "@/lib/utils";

type ClientDraft = Omit<Client, "id" | "created_at" | "updated_at" | "is_active">;

const emptyDraft: ClientDraft = {
  tipo_documento: "cnpj",
  documento: "",
  razao_social: "",
  inscricao_municipal: "",
  email: "",
  telefone: "",
  endereco: {
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    codigo_municipio: "2800308",
    uf: "SE",
    codigo_pais: "1058",
    cep: ""
  },
  notes: ""
};

export function ClientForm({
  initialClient,
  onSubmit,
  onCancel,
  submitLabel = "Salvar cliente"
}: {
  initialClient?: Client | null;
  onSubmit: (client: ClientDraft) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const initialDraft = useMemo<ClientDraft>(() => {
    if (!initialClient) {
      return emptyDraft;
    }

    return {
      tipo_documento: initialClient.tipo_documento,
      documento: initialClient.documento,
      razao_social: initialClient.razao_social,
      inscricao_municipal: initialClient.inscricao_municipal ?? "",
      email: initialClient.email ?? "",
      telefone: initialClient.telefone ?? "",
      endereco: {
        endereco: initialClient.endereco.endereco ?? "",
        numero: initialClient.endereco.numero ?? "",
        complemento: initialClient.endereco.complemento ?? "",
        bairro: initialClient.endereco.bairro ?? "",
        codigo_municipio: initialClient.endereco.codigo_municipio ?? "2800308",
        uf: initialClient.endereco.uf ?? "SE",
        codigo_pais: initialClient.endereco.codigo_pais ?? "1058",
        cep: initialClient.endereco.cep ?? ""
      },
      notes: initialClient.notes ?? ""
    };
  }, [initialClient]);

  const [draft, setDraft] = useState<ClientDraft>(initialDraft);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof ClientDraft>(field: K, value: ClientDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const setAddressField = <K extends keyof ClientDraft["endereco"]>(
    field: K,
    value: ClientDraft["endereco"][K]
  ) => {
    setDraft((current) => ({
      ...current,
      endereco: {
        ...current.endereco,
        [field]: value
      }
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!draft.razao_social.trim()) {
      setError("Informe o nome ou razão social do tomador.");
      return;
    }
    if (!validateDocumentLength(draft.tipo_documento, draft.documento)) {
      setError(draft.tipo_documento === "cpf" ? "CPF deve ter 11 dígitos." : "CNPJ deve ter 14 dígitos.");
      return;
    }
    if (draft.endereco.codigo_municipio && !requiredLength(draft.endereco.codigo_municipio, 7)) {
      setError("Código IBGE do município deve ter 7 dígitos.");
      return;
    }
    if (draft.endereco.cep && !requiredLength(draft.endereco.cep, 8)) {
      setError("CEP deve ter 8 dígitos.");
      return;
    }
    if (draft.endereco.uf && draft.endereco.uf.length !== 2) {
      setError("UF deve ter 2 letras.");
      return;
    }

    await onSubmit({
      ...draft,
      documento: onlyDigits(draft.documento),
      telefone: onlyDigits(draft.telefone ?? ""),
      endereco: {
        ...draft.endereco,
        codigo_municipio: onlyDigits(draft.endereco.codigo_municipio),
        codigo_pais: onlyDigits(draft.endereco.codigo_pais),
        cep: onlyDigits(draft.endereco.cep),
        uf: draft.endereco.uf.toUpperCase()
      }
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-lg border bg-white p-5 shadow-soft">
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="field-grid">
        <div className="grid gap-2">
          <Label htmlFor="tipo_documento">Documento</Label>
          <select
            id="tipo_documento"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={draft.tipo_documento}
            onChange={(event) => setField("tipo_documento", event.target.value as DocumentType)}
          >
            <option value="cnpj">CNPJ</option>
            <option value="cpf">CPF</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="documento">Número</Label>
          <Input
            id="documento"
            value={formatDocument(draft.documento, draft.tipo_documento)}
            onChange={(event) => setField("documento", onlyDigits(event.target.value))}
            inputMode="numeric"
          />
        </div>

        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="razao_social">Nome ou razão social</Label>
          <Input
            id="razao_social"
            value={draft.razao_social}
            onChange={(event) => setField("razao_social", event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="inscricao_municipal">Inscrição municipal</Label>
          <Input
            id="inscricao_municipal"
            value={draft.inscricao_municipal ?? ""}
            onChange={(event) => setField("inscricao_municipal", event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={draft.email ?? ""}
            onChange={(event) => setField("email", event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={formatPhone(draft.telefone ?? "")}
            onChange={(event) => setField("telefone", onlyDigits(event.target.value))}
            inputMode="tel"
          />
        </div>
      </div>

      <div className="field-grid">
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="endereco">Logradouro</Label>
          <Input
            id="endereco"
            value={draft.endereco.endereco}
            onChange={(event) => setAddressField("endereco", event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            value={draft.endereco.numero}
            onChange={(event) => setAddressField("numero", event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            value={draft.endereco.complemento ?? ""}
            onChange={(event) => setAddressField("complemento", event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Input
            id="bairro"
            value={draft.endereco.bairro}
            onChange={(event) => setAddressField("bairro", event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="codigo_municipio">Código IBGE</Label>
          <Input
            id="codigo_municipio"
            value={draft.endereco.codigo_municipio}
            onChange={(event) => setAddressField("codigo_municipio", onlyDigits(event.target.value).slice(0, 7))}
            inputMode="numeric"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="uf">UF</Label>
          <Input
            id="uf"
            value={draft.endereco.uf}
            onChange={(event) => setAddressField("uf", event.target.value.toUpperCase().slice(0, 2))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="codigo_pais">Código país</Label>
          <Input
            id="codigo_pais"
            value={draft.endereco.codigo_pais}
            onChange={(event) => setAddressField("codigo_pais", onlyDigits(event.target.value).slice(0, 4))}
            inputMode="numeric"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cep">CEP</Label>
          <Input
            id="cep"
            value={formatZipCode(draft.endereco.cep)}
            onChange={(event) => setAddressField("cep", onlyDigits(event.target.value).slice(0, 8))}
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" value={draft.notes ?? ""} onChange={(event) => setField("notes", event.target.value)} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        )}
        <Button type="submit">
          <Save className="h-4 w-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
