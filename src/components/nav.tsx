"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CURRENCY_OPTIONS } from "@/lib/format";

const items = [
  { href: "/", label: "总览", hint: "资产与收益" },
  { href: "/holdings", label: "持仓", hint: "录入与调整" },
  { href: "/returns", label: "收益", hint: "已实现收益" },
  { href: "/fire", label: "FIRE", hint: "财务自由" },
  { href: "/data", label: "数据", hint: "备份与恢复" },
  { href: "/accounts", label: "账户", hint: "银行 / 券商" },
  { href: "/categories", label: "分类", hint: "自定义分组" },
  { href: "/history", label: "历史", hint: "每日快照" },
  { href: "/sync", label: "行情同步", hint: "价格与汇率" },
];

function icon(path: string) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (path) {
    case "/":
      return (
        <svg {...common}>
          <path d="M3 13h6v8H3zM10 3h4v18h-4zM15 8h6v13h-6z" />
        </svg>
      );
    case "/holdings":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h10" />
          <circle cx="19" cy="18" r="2" />
        </svg>
      );
    case "/data":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
          <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        </svg>
      );
    case "/fire":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "/returns":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="M7 14l3-3 3 2 4-5" />
          <circle cx="17" cy="8" r="1.5" />
        </svg>
      );
    case "/accounts":
      return (
        <svg {...common}>
          <path d="M3 10h18M5 10V6l7-3 7 3v4M5 10v9h14v-9" />
          <path d="M9 14v2M15 14v2" />
        </svg>
      );
    case "/categories":
      return (
        <svg {...common}>
          <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
      );
    case "/history":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="M7 15l4-5 3 3 5-7" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M20 12a8 8 0 1 1-2.34-5.66" />
          <path d="M20 4v5h-5" />
        </svg>
      );
  }
}

export function Nav({ baseCurrency }: { baseCurrency: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(baseCurrency);

  async function changeCurrency(next: string) {
    setValue(next);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseCurrency: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <aside className="md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto shrink-0 border-b border-border/80 md:border-b-0 md:border-r bg-panel/40 backdrop-blur">
      <div className="flex h-full flex-col gap-6 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent/30 to-gold/20 ring-1 ring-border">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2c1 3.5-.5 5.5-2 7C8.2 10.8 7 12.6 7 15a5 5 0 0 0 10 0c0-1.6-.6-3-1.6-4.2-.6 1.1-1.4 1.8-2.4 2.1.7-2.6.3-5.5-1-7.9-.3-.6-1-1.2-1-1.2Z"
                fill="url(#flame)"
              />
              <defs>
                <linearGradient id="flame" x1="7" y1="2" x2="17" y2="21">
                  <stop stopColor="#7ab8ff" />
                  <stop offset="1" stopColor="#e0b25c" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">Fire Life</div>
            <div className="text-[11px] text-muted">个人资产管理</div>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {items.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-accent/10 text-ink ring-1 ring-accent/25"
                    : "text-muted hover:bg-panel-2 hover:text-ink"
                }`}
              >
                <span className={active ? "text-accent" : "text-muted group-hover:text-ink"}>
                  {icon(item.href)}
                </span>
                <span className="font-medium">{item.label}</span>
                <span className="ml-auto hidden text-[10px] text-muted md:block">
                  {item.hint}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 space-y-3 md:mt-auto">
          <ThemeToggle />
          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-wider text-muted">
              计价货币
            </label>
            <select
              value={value}
              onChange={(e) => void changeCurrency(e.target.value)}
              className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent/60"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-[10px] leading-relaxed text-muted">
              {pending ? "正在重新估值…" : "所有资产按最新汇率折算到该货币。"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
