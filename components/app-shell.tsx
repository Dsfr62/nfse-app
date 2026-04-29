"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Ban,
  FileClock,
  FilePlus2,
  Home,
  Search,
  UsersRound
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/emissao", label: "Emitir NFS-e", icon: FilePlus2 },
  { href: "/clientes", label: "Clientes", icon: UsersRound },
  { href: "/consultas/rps", label: "Consulta RPS", icon: Search },
  { href: "/consultas/periodo", label: "Prestadas", icon: FileClock },
  { href: "/cancelamento", label: "Cancelar", icon: Ban }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="flex h-full flex-col gap-5 p-4">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-semibold">SOPEC NFS-e</span>
              <span className="block text-xs text-muted-foreground">WebISS Aracaju</span>
            </span>
          </Link>

          <nav className="grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-lg border bg-accent/60 p-3 text-xs text-accent-foreground">
            Certificado A1 e credenciais ficam somente no backend fiscal.
          </div>
        </div>
      </aside>

      <main className="min-w-0 py-6">
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}
