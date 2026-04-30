"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, FilePlus2, Loader2, Plus, Save } from "lucide-react";

import { ClientForm } from "@/components/features/client-form";
import { ResponsePanel } from "@/components/features/response-panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clientRepository, nfseHistoryRepository } from "@/lib/local-db";
import { emitirNfse } from "@/lib/nfse-api";
import {
  buildEmitirPayload,
  fiscalResponseToRecord,
  type IssueForm
} from "@/lib/nfse-payload";
import type { Client, FiscalResponse } from "@/lib/types";
import {
  decimalString,
  formatCurrency,
  formatDocument,
  getErrorMessage,
  normalizeDecimalInput,
  onlyDigits,
  requiredLength,
  todayIso
} from "@/lib/utils";

type Step = "prestador" | "rps" | "servico" | "tomador" | "ibscbs" | "revisao";

const steps: Array<{ id: Step; label: string }> = [
  { id: "prestador", label: "Prestador" },
  { id: "rps", label: "RPS" },
  { id: "servico", label: "Serviço" },
  { id: "tomador", label: "Tomador" },
  { id: "ibscbs", label: "IBS/CBS" },
  { id: "revisao", label: "Revisão" }
];

const initialForm = (): IssueForm => ({
  numero_lote: String(Date.now()).slice(-7),
  prestador_cnpj: "",
  prestador_inscricao_municipal: "",
  rps_numero: "",
  rps_serie: "A1",
  rps_tipo: "1",
  data_emissao: todayIso(),
  competencia: todayIso(),
  valor_servicos: "1500.00",
  valor_deducoes: "0.00",
  valor_pis: "0.00",
  valor_cofins: "0.00",
  valor_inss: "0.00",
  valor_ir: "0.00",
  valor_csll: "0.00",
  outras_retencoes: "0.00",
  valor_iss: "75.00",
  aliquota: "0.0500",
  desconto_incondicionado: "0.00",
  desconto_condicionado: "0.00",
  iss_retido: "2",
  item_lista_servico: "1.05",
  codigo_cnae: "6202300",
  codigo_tributacao_municipio: "0105",
  codigo_nbs: "115021000",
  discriminacao: "Licenciamento de software sob encomenda.",
  codigo_municipio: "2800308",
  codigo_pais: "1058",
  exigibilidade_iss: "1",
  municipio_incidencia: "2800308",
  optante_simples_nacional: "2",
  incentivo_fiscal: "2",
  fin_nfse: "0",
  ind_final: "0",
  cIndOp: "010101",
  ind_dest: "0",
  ibscbs_cst: "000",
  ibscbs_classificacao: "000001"
});

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function IssueView() {
  const [step, setStep] = useState<Step>("prestador");
  const [form, setForm] = useState<IssueForm>(() => initialForm());
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<FiscalResponse | null>(null);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;

  useEffect(() => {
    void clientRepository.list().then((clientList) => {
      setClients(clientList);

      const urlClientId = new URLSearchParams(window.location.search).get("clientId");
      if (urlClientId && clientList.some((client) => client.id === urlClientId)) {
        setSelectedClientId(urlClientId);
        setStep("servico");
      }
    });
  }, []);

  const payloadPreview = useMemo(() => {
    if (!selectedClient) {
      return null;
    }
    return buildEmitirPayload(form, selectedClient);
  }, [form, selectedClient]);

  const setFormField = <K extends keyof IssueForm>(field: K, value: IssueForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const autoCalculateIss = () => {
    const serviceAmount = Number(decimalString(form.valor_servicos, 2));
    const taxRate = Number(decimalString(form.aliquota, 4));
    setFormField("valor_iss", (serviceAmount * taxRate).toFixed(2));
  };

  const validate = () => {
    if (!requiredLength(form.prestador_cnpj, 14)) return "CNPJ do prestador deve ter 14 dígitos.";
    if (!form.prestador_inscricao_municipal.trim()) return "Informe a inscrição municipal do prestador.";
    if (!form.numero_lote || Number(form.numero_lote) <= 0) return "Informe o número do lote.";
    if (!form.rps_numero || Number(form.rps_numero) <= 0) return "Informe o número do RPS.";
    if (!form.rps_serie.trim()) return "Informe a série do RPS.";
    if (!form.valor_servicos || Number(form.valor_servicos) < 0) return "Informe o valor dos serviços.";
    if (!requiredLength(form.codigo_nbs, 9)) return "Código NBS deve ter exatamente 9 dígitos.";
    if (!requiredLength(form.codigo_municipio, 7)) return "Código IBGE do serviço deve ter 7 dígitos.";
    if (!form.discriminacao.trim()) return "Informe a discriminação do serviço.";
    if (!selectedClient) return "Selecione ou cadastre o tomador.";
    if (!form.cIndOp.trim()) return "Informe o indicador da operação IBS/CBS.";
    if (form.ibscbs_cst.length !== 3) return "CST IBS/CBS deve ter 3 caracteres.";
    if (!form.ibscbs_classificacao.trim()) return "Informe a classificação tributária IBS/CBS.";
    return null;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResponse(null);

    const validationError = validate();
    if (validationError || !selectedClient) {
      setError(validationError);
      return;
    }

    const payload = buildEmitirPayload(form, selectedClient);
    setLoading(true);

    try {
      const fiscalResponse = await emitirNfse(payload);
      setResponse(fiscalResponse);
      await nfseHistoryRepository.save(fiscalResponseToRecord(form, selectedClient, payload, fiscalResponse, "emitida"));
      setStep("revisao");
    } catch (caught) {
      const message = getErrorMessage(caught);
      setError(message);
      await nfseHistoryRepository.save(fiscalResponseToRecord(form, selectedClient, payload, null, "erro_comunicacao"));
    } finally {
      setLoading(false);
    }
  };

  const createClientInline = async (draft: Parameters<typeof clientRepository.create>[0]) => {
    const created = await clientRepository.create(draft);
    const updated = await clientRepository.list();
    setClients(updated);
    setSelectedClientId(created.id);
    setShowClientForm(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Emitir NFS-e</h1>
          <p className="text-sm text-muted-foreground">RPS, serviço, tomador e tributação.</p>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
          Enviar
        </Button>
      </header>

      <nav className="tab-strip rounded-lg border bg-white p-2 shadow-soft">
        {steps.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={item.id === step ? "default" : "ghost"}
            size="sm"
            onClick={() => setStep(item.id)}
          >
            {item.id === step && <Check className="h-4 w-4" />}
            {item.label}
          </Button>
        ))}
      </nav>

      {error && <Alert variant="danger" className="whitespace-pre-wrap">{error}</Alert>}

      {step === "prestador" && (
        <section className="rounded-lg border bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-semibold">Prestador</h2>
          <div className="field-grid">
            <Field label="CNPJ">
              <Input
                value={formatDocument(form.prestador_cnpj, "cnpj")}
                onChange={(event) => setFormField("prestador_cnpj", onlyDigits(event.target.value).slice(0, 14))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Inscrição municipal">
              <Input
                value={form.prestador_inscricao_municipal}
                onChange={(event) => setFormField("prestador_inscricao_municipal", event.target.value)}
              />
            </Field>
          </div>
        </section>
      )}

      {step === "rps" && (
        <section className="rounded-lg border bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-semibold">RPS</h2>
          <div className="field-grid">
            <Field label="Número do lote">
              <Input
                value={form.numero_lote}
                onChange={(event) => setFormField("numero_lote", onlyDigits(event.target.value))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Número do RPS">
              <Input
                value={form.rps_numero}
                onChange={(event) => setFormField("rps_numero", onlyDigits(event.target.value))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Série">
              <Input value={form.rps_serie} onChange={(event) => setFormField("rps_serie", event.target.value)} />
            </Field>
            <Field label="Tipo">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.rps_tipo}
                onChange={(event) => setFormField("rps_tipo", event.target.value)}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </Field>
            <Field label="Data de emissão">
              <Input
                type="date"
                value={form.data_emissao}
                onChange={(event) => setFormField("data_emissao", event.target.value)}
              />
            </Field>
            <Field label="Competência">
              <Input
                type="date"
                value={form.competencia}
                onChange={(event) => setFormField("competencia", event.target.value)}
              />
            </Field>
          </div>
        </section>
      )}

      {step === "servico" && (
        <section className="rounded-lg border bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Serviço</h2>
            <Button type="button" variant="outline" size="sm" onClick={autoCalculateIss}>
              Calcular ISS
            </Button>
          </div>
          <div className="field-grid">
            <Field label="Valor dos serviços">
              <Input
                value={form.valor_servicos}
                onChange={(event) => setFormField("valor_servicos", normalizeDecimalInput(event.target.value, 2))}
                inputMode="decimal"
              />
            </Field>
            <Field label="Alíquota">
              <Input
                value={form.aliquota}
                onChange={(event) => setFormField("aliquota", normalizeDecimalInput(event.target.value, 4))}
                inputMode="decimal"
              />
            </Field>
            <Field label="Valor ISS">
              <Input
                value={form.valor_iss}
                onChange={(event) => setFormField("valor_iss", normalizeDecimalInput(event.target.value, 2))}
                inputMode="decimal"
              />
            </Field>
            <Field label="ISS retido">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.iss_retido}
                onChange={(event) => setFormField("iss_retido", event.target.value)}
              >
                <option value="2">Não</option>
                <option value="1">Sim</option>
              </select>
            </Field>
            <Field label="Item lista serviço">
              <Input
                value={form.item_lista_servico}
                onChange={(event) => setFormField("item_lista_servico", event.target.value)}
              />
            </Field>
            <Field label="CNAE">
              <Input
                value={form.codigo_cnae}
                onChange={(event) => setFormField("codigo_cnae", onlyDigits(event.target.value))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Código tributação municipal">
              <Input
                value={form.codigo_tributacao_municipio}
                onChange={(event) => setFormField("codigo_tributacao_municipio", event.target.value)}
              />
            </Field>
            <Field label="Código NBS">
              <Input
                value={form.codigo_nbs}
                onChange={(event) => setFormField("codigo_nbs", onlyDigits(event.target.value).slice(0, 9))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Código município">
              <Input
                value={form.codigo_municipio}
                onChange={(event) => setFormField("codigo_municipio", onlyDigits(event.target.value).slice(0, 7))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Município incidência">
              <Input
                value={form.municipio_incidencia}
                onChange={(event) => setFormField("municipio_incidencia", onlyDigits(event.target.value).slice(0, 7))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Código país">
              <Input
                value={form.codigo_pais}
                onChange={(event) => setFormField("codigo_pais", onlyDigits(event.target.value).slice(0, 4))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Exigibilidade ISS">
              <Input
                value={form.exigibilidade_iss}
                onChange={(event) => setFormField("exigibilidade_iss", onlyDigits(event.target.value).slice(0, 1))}
                inputMode="numeric"
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-2">
            <Label>Discriminação</Label>
            <Textarea value={form.discriminacao} onChange={(event) => setFormField("discriminacao", event.target.value)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Deduções", "valor_deducoes"],
              ["PIS", "valor_pis"],
              ["COFINS", "valor_cofins"],
              ["INSS", "valor_inss"],
              ["IR", "valor_ir"],
              ["CSLL", "valor_csll"],
              ["Outras retenções", "outras_retencoes"],
              ["Desc. incondicionado", "desconto_incondicionado"],
              ["Desc. condicionado", "desconto_condicionado"]
            ].map(([label, key]) => (
              <Field key={key} label={label}>
                <Input
                  value={form[key as keyof IssueForm]}
                  onChange={(event) =>
                    setFormField(key as keyof IssueForm, normalizeDecimalInput(event.target.value, 2))
                  }
                  inputMode="decimal"
                />
              </Field>
            ))}
          </div>
        </section>
      )}

      {step === "tomador" && (
        <section className="rounded-lg border bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Tomador</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowClientForm((current) => !current)}>
              <Plus className="h-4 w-4" />
              Cadastrar
            </Button>
          </div>

          <div className="grid gap-4">
            <Field label="Cliente">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
              >
                <option value="">Selecione</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.razao_social} · {formatDocument(client.documento, client.tipo_documento)}
                  </option>
                ))}
              </select>
            </Field>

            {selectedClient && (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{selectedClient.razao_social}</div>
                    <div className="text-muted-foreground">
                      {formatDocument(selectedClient.documento, selectedClient.tipo_documento)}
                    </div>
                  </div>
                  <Badge variant="secondary">{selectedClient.endereco.codigo_municipio || "sem município"}</Badge>
                </div>
              </div>
            )}

            {showClientForm && (
              <ClientForm
                onSubmit={createClientInline}
                onCancel={() => setShowClientForm(false)}
                submitLabel="Salvar e selecionar"
              />
            )}
          </div>
        </section>
      )}

      {step === "ibscbs" && (
        <section className="rounded-lg border bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-semibold">IBS/CBS</h2>
          <div className="field-grid">
            <Field label="Finalidade">
              <Input value={form.fin_nfse} onChange={(event) => setFormField("fin_nfse", onlyDigits(event.target.value))} />
            </Field>
            <Field label="Consumidor final">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.ind_final}
                onChange={(event) => setFormField("ind_final", event.target.value)}
              >
                <option value="0">Não</option>
                <option value="1">Sim</option>
              </select>
            </Field>
            <Field label="Indicador da operação">
              <Input value={form.cIndOp} onChange={(event) => setFormField("cIndOp", event.target.value.slice(0, 6))} />
            </Field>
            <Field label="Destinatário">
              <Input value={form.ind_dest} onChange={(event) => setFormField("ind_dest", onlyDigits(event.target.value))} />
            </Field>
            <Field label="CST">
              <Input value={form.ibscbs_cst} onChange={(event) => setFormField("ibscbs_cst", event.target.value.slice(0, 3))} />
            </Field>
            <Field label="Classificação tributária">
              <Input
                value={form.ibscbs_classificacao}
                onChange={(event) => setFormField("ibscbs_classificacao", event.target.value.slice(0, 10))}
              />
            </Field>
            <Field label="Optante Simples Nacional">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.optante_simples_nacional}
                onChange={(event) => setFormField("optante_simples_nacional", event.target.value)}
              >
                <option value="2">Não</option>
                <option value="1">Sim</option>
              </select>
            </Field>
            <Field label="Incentivo fiscal">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.incentivo_fiscal}
                onChange={(event) => setFormField("incentivo_fiscal", event.target.value)}
              >
                <option value="2">Não</option>
                <option value="1">Sim</option>
              </select>
            </Field>
          </div>
        </section>
      )}

      {step === "revisao" && (
        <section className="rounded-lg border bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Revisão e envio</h2>
            <div className="text-sm font-medium">{formatCurrency(form.valor_servicos)}</div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="mb-2 font-medium">Resumo</div>
              <dl className="grid gap-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">RPS</dt>
                  <dd>{form.rps_numero || "-"} / {form.rps_serie}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tomador</dt>
                  <dd className="text-right">{selectedClient?.razao_social ?? "-"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">NBS</dt>
                  <dd>{form.codigo_nbs}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">IBS/CBS</dt>
                  <dd>{form.ibscbs_cst} · {form.ibscbs_classificacao}</dd>
                </div>
              </dl>
            </div>
            <details className="rounded-lg border bg-muted/40 p-4">
              <summary className="cursor-pointer text-sm font-medium">Payload fiscal</summary>
              <pre className="technical-json mt-3 text-xs">
                {payloadPreview ? JSON.stringify(payloadPreview, null, 2) : "Selecione um tomador."}
              </pre>
            </details>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {selectedClient && (
              <Button asChild variant="outline">
                <Link href={`/clientes/${selectedClient.id}`}>Abrir cliente</Link>
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Emitir agora
            </Button>
          </div>
        </section>
      )}

      <ResponsePanel response={response} error={error && !loading ? null : null} title="Resultado da emissão" />
    </form>
  );
}
