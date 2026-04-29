import type { Client, NfseRecord, NfseStatus } from "@/lib/types";
import { makeId, onlyDigits } from "@/lib/utils";

const DB_NAME = "sopec_nfse_frontend";
const DB_VERSION = 1;
const CLIENTS_STORE = "clients";
const RECORDS_STORE = "nfse_records";

type StoreName = typeof CLIENTS_STORE | typeof RECORDS_STORE;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(CLIENTS_STORE)) {
        const clients = database.createObjectStore(CLIENTS_STORE, { keyPath: "id" });
        clients.createIndex("documento", "documento", { unique: false });
        clients.createIndex("razao_social", "razao_social", { unique: false });
        clients.createIndex("is_active", "is_active", { unique: false });
      }

      if (!database.objectStoreNames.contains(RECORDS_STORE)) {
        const records = database.createObjectStore(RECORDS_STORE, { keyPath: "id" });
        records.createIndex("client_id", "client_id", { unique: false });
        records.createIndex("numero_rps", "numero_rps", { unique: false });
        records.createIndex("numero_nfse", "numero_nfse", { unique: false });
        records.createIndex("status", "status", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function getAll<T>(storeName: StoreName) {
  const database = await openDatabase();
  return new Promise<T[]>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function getById<T>(storeName: StoreName, id: string) {
  const database = await openDatabase();
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: StoreName, value: T) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve(value);
    request.onerror = () => reject(request.error);
  });
}

function sortByUpdated<T extends { updated_at: string; created_at: string }>(items: T[]) {
  return items.sort((a, b) => {
    const left = new Date(b.updated_at || b.created_at).getTime();
    const right = new Date(a.updated_at || a.created_at).getTime();
    return left - right;
  });
}

export const clientRepository = {
  async list(search = "", includeArchived = false) {
    const clients = await getAll<Client>(CLIENTS_STORE);
    const term = onlyDigits(search) || search.trim().toLowerCase();

    return sortByUpdated(
      clients.filter((client) => {
        const activeMatch = includeArchived || client.is_active;
        if (!term) {
          return activeMatch;
        }
        const haystack = `${client.razao_social} ${client.documento} ${client.email ?? ""}`.toLowerCase();
        return activeMatch && haystack.includes(term);
      })
    );
  },

  async get(id: string) {
    return getById<Client>(CLIENTS_STORE, id);
  },

  async create(input: Omit<Client, "id" | "created_at" | "updated_at" | "is_active">) {
    const now = new Date().toISOString();
    const client: Client = {
      ...input,
      documento: onlyDigits(input.documento),
      id: makeId("client"),
      is_active: true,
      created_at: now,
      updated_at: now
    };
    return put(CLIENTS_STORE, client);
  },

  async update(id: string, input: Omit<Client, "id" | "created_at" | "updated_at" | "is_active">) {
    const current = await this.get(id);
    if (!current) {
      throw new Error("Cliente não encontrado.");
    }

    const updated: Client = {
      ...current,
      ...input,
      documento: onlyDigits(input.documento),
      updated_at: new Date().toISOString()
    };
    return put(CLIENTS_STORE, updated);
  },

  async archive(id: string) {
    const current = await this.get(id);
    if (!current) {
      throw new Error("Cliente não encontrado.");
    }

    return put(CLIENTS_STORE, {
      ...current,
      is_active: false,
      updated_at: new Date().toISOString()
    });
  }
};

export const nfseHistoryRepository = {
  async list(filters: { clientId?: string; status?: NfseStatus; search?: string } = {}) {
    const records = await getAll<NfseRecord>(RECORDS_STORE);
    const term = (filters.search ?? "").trim().toLowerCase();

    return sortByUpdated(
      records.filter((record) => {
        const clientMatch = !filters.clientId || record.client_id === filters.clientId;
        const statusMatch = !filters.status || record.status === filters.status;
        const searchMatch =
          !term ||
          `${record.numero_rps} ${record.numero_nfse ?? ""} ${record.discriminacao}`.toLowerCase().includes(term);
        return clientMatch && statusMatch && searchMatch;
      })
    );
  },

  async get(id: string) {
    return getById<NfseRecord>(RECORDS_STORE, id);
  },

  async save(input: Omit<NfseRecord, "id" | "created_at" | "updated_at">) {
    const now = new Date().toISOString();
    const record: NfseRecord = {
      ...input,
      id: makeId("nfse_record"),
      created_at: now,
      updated_at: now
    };
    return put(RECORDS_STORE, record);
  },

  async update(id: string, patch: Partial<NfseRecord>) {
    const current = await this.get(id);
    if (!current) {
      throw new Error("Registro não encontrado.");
    }

    const updated: NfseRecord = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString()
    };
    return put(RECORDS_STORE, updated);
  },

  async markCancelledByNumber(numeroNfse: string, patch: Partial<NfseRecord>) {
    const records = await this.list({ search: numeroNfse });
    const matches = records.filter((record) => record.numero_nfse === numeroNfse);

    await Promise.all(
      matches.map((record) =>
        this.update(record.id, {
          ...patch,
          status: "cancelada"
        })
      )
    );

    return matches.length;
  }
};
