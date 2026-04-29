import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function formatDocument(document: string, type?: "cpf" | "cnpj") {
  const digits = onlyDigits(document);
  const documentType = type ?? (digits.length > 11 ? "cnpj" : "cpf");

  if (documentType === "cpf" && digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2")
      .slice(0, 14);
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

export function formatZipCode(value: string) {
  return onlyDigits(value).replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
}

export function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function decimalString(value: string | number, scale = 2) {
  const normalized = String(value || 0).replace(/\./g, "").replace(",", ".");
  const number = Number.parseFloat(normalized);

  if (Number.isNaN(number)) {
    return (0).toFixed(scale);
  }

  return number.toFixed(scale);
}

export function normalizeDecimalInput(value: string, scale = 2) {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const firstDot = normalized.indexOf(".");
  const clean =
    firstDot === -1
      ? normalized
      : `${normalized.slice(0, firstDot + 1)}${normalized.slice(firstDot + 1).replace(/\./g, "")}`;
  const [whole, fraction] = clean.split(".");
  return fraction === undefined ? whole : `${whole}.${fraction.slice(0, scale)}`;
}

export function formatCurrency(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

export function validateDocumentLength(type: "cpf" | "cnpj", value: string) {
  const length = onlyDigits(value).length;
  return type === "cpf" ? length === 11 : length === 14;
}

export function requiredLength(value: string, length: number) {
  return onlyDigits(value).length === length;
}

export function compactQuery(params: Record<string, string | number | undefined | null>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Não foi possível concluir a operação.";
}

export function deepFindValue(source: unknown, keys: string[]): string | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const normalizedKeys = keys.map((key) => key.toLowerCase());
  const stack: unknown[] = [source];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") {
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (normalizedKeys.includes(key.toLowerCase()) && value !== null && value !== undefined) {
        return String(value);
      }
      if (typeof value === "object") {
        stack.push(value);
      }
    }
  }

  return undefined;
}

export function extractObjectRows(source: unknown): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const stack: unknown[] = [source];

  while (stack.length > 0 && rows.length === 0) {
    const current = stack.pop();
    if (Array.isArray(current) && current.every((item) => item && typeof item === "object")) {
      rows.push(...(current as Array<Record<string, unknown>>));
      break;
    }

    if (current && typeof current === "object") {
      stack.push(...Object.values(current));
    }
  }

  return rows.slice(0, 50);
}
