"use client";

import { CheckCircle2, Clipboard, ServerCrash, XCircle } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FiscalResponse } from "@/lib/types";

type ResponsePanelProps = {
  response?: FiscalResponse | null;
  error?: string | null;
  title?: string;
};

export function ResponsePanel({ response, error, title = "Resultado" }: ResponsePanelProps) {
  if (!response && !error) {
    return null;
  }

  const payload = response
    ? JSON.stringify(
        {
          success: response.success,
          provider: response.provider,
          operation: response.operation,
          parsed_response: response.parsed_response,
          messages: response.messages
        },
        null,
        2
      )
    : error ?? "";

  const copyPayload = () => {
    void navigator.clipboard?.writeText(payload);
  };

  return (
    <section className="rounded-lg border bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {response?.success ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : error ? (
            <ServerCrash className="h-5 w-5 text-red-600" />
          ) : (
            <XCircle className="h-5 w-5 text-amber-600" />
          )}
          <h2 className="text-lg font-semibold">{title}</h2>
          {response && (
            <Badge variant={response.success ? "success" : "warning"}>
              {response.success ? "sucesso" : "retorno fiscal"}
            </Badge>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={copyPayload}>
          <Clipboard className="h-4 w-4" />
          Copiar retorno
        </Button>
      </div>

      {error && <Alert variant="danger" className="whitespace-pre-wrap">{error}</Alert>}

      {response?.messages?.length ? (
        <div className="grid gap-2">
          {response.messages.map((message, index) => (
            <Alert key={`${message.codigo ?? "msg"}-${index}`} variant={response.success ? "default" : "warning"}>
              <div className="font-medium">{message.codigo ? `${message.codigo} · ` : null}{message.mensagem}</div>
              {message.correcao && <div className="mt-1 text-sm opacity-80">{message.correcao}</div>}
            </Alert>
          ))}
        </div>
      ) : null}

      {response && (
        <details className="mt-4 rounded-md border bg-muted/40 p-3">
          <summary className="cursor-pointer text-sm font-medium">Retorno técnico</summary>
          <pre className="technical-json mt-3 text-xs">{payload}</pre>
        </details>
      )}
    </section>
  );
}
