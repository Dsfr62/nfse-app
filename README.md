# SOPEC NFS-e Frontend

Mini frontend operacional em Next.js App Router para emissão, consulta, cancelamento e histórico local de NFS-e.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Componentes no padrão shadcn/ui
- Lucide React
- IndexedDB para clientes e histórico local

## Execução

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Variáveis

```env
NEXT_PUBLIC_NFSE_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_NFSE_DATA_API_URL=http://127.0.0.1:8001
```

O app não manipula certificado digital, senha do certificado nem credenciais do WebISS. A emissão, consulta e cancelamento são feitos pelo backend fiscal.
