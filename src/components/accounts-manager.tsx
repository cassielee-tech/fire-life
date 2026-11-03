"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_OPTIONS, formatMoney } from "@/lib/format";

export type AccountRow = {
  id: number;
  name: string;
  institution: string;
  kind: "bank" | "broker" | "cash" | "other";
  currency: string;
  note: string;
  holdingCount: number;
  marketValue: number;
};

const KIND_OPTIONS = [
  { value: "bank", label: "银行" },
  { value: "broker", label: "券商" },
  { value: "cash", label: "现金钱包" },
  { value: "other", label: "其他" },
] as const;

const inputClass =
  "w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent/60";
const labelClass = "mb-1 block text-[11px] uppercase tracking-wider text-muted";

type FormState = {
  id: number | null;
  name: string;
  institution: string;
  kind: "bank" | "broker" | "cash" | "other";
  currency: string;
  note: string;
};

const empty: FormState = {
  id: null,
  name: "",
  institution: "",
  kind: "bank",
  currency: "CNY",
  note: "",
};

export function AccountsManager({
  accounts,
  baseCurrency,
}: {
  accounts: AccountRow[];
  baseCurrency: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(form.id ? `/api/accounts/${form.id}` : "/api/accounts", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          institution: form.institution.trim(),
          kind: form.kind,
          currency: form.currency,
          note: form.note.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      setMessage(form.id ? "账户已更新" : "账户已创建");
      setForm(empty);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove(account: AccountRow) {
    if (
      !window.confirm(
        `确认删除「${account.name}」？该账户下的 ${account.holdingCount} 笔持仓会一并删除。`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "删除失败");
      }
      setMessage("账户已删除");
      if (form.id === account.id) setForm(empty);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded-2xl border border-border/80 bg-panel/70 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{form.id ? "编辑账户" : "新增账户"}</h2>
          {form.id ? (
            <button
              type="button"
              onClick={() => setForm(empty)}
              className="text-xs text-muted hover:text-ink"
            >
              取消编辑
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div>
            <label className={labelClass}>账户名称</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
              placeholder="如：招商银行"
              required
            />
          </div>
          <div>
            <label className={labelClass}>机构</label>
            <input
              value={form.institution}
              onChange={(e) => set("institution", e.target.value)}
              className={inputClass}
              placeholder="如：CMB / HSBC"
            />
          </div>
          <div>
            <label className={labelClass}>类型</label>
            <select
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as FormState["kind"])}
              className={inputClass}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>主币种</label>
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className={inputClass}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>备注</label>
            <input
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              className={inputClass}
              placeholder="可选"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/25 disabled:opacity-50"
          >
            {busy ? "保存中…" : form.id ? "保存修改" : "创建账户"}
          </button>
          {message ? <span className="text-xs text-loss">{message}</span> : null}
          {error ? <span className="text-xs text-gain">{error}</span> : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-panel/70">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-5 py-3 font-medium">账户</th>
              <th className="px-3 py-3 font-medium">类型</th>
              <th className="px-3 py-3 font-medium">币种</th>
              <th className="px-3 py-3 text-right font-medium">持仓数</th>
              <th className="px-3 py-3 text-right font-medium">市值</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted">
                  还没有账户，先创建一个银行或券商账户。
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id} className="border-t border-border/50 hover:bg-panel-2/50">
                  <td className="px-5 py-3">
                    <div className="font-medium">{account.name}</div>
                    <div className="text-[11px] text-muted">
                      {account.institution || "—"}
                      {account.note ? ` · ${account.note}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    {KIND_OPTIONS.find((o) => o.value === account.kind)?.label}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">{account.currency}</td>
                  <td className="num px-3 py-3 text-right text-xs">{account.holdingCount}</td>
                  <td className="num px-3 py-3 text-right">
                    {formatMoney(account.marketValue, baseCurrency, 0)}
                  </td>
                  <td className="px-5 py-3 text-right text-xs">
                    <button
                      onClick={() => {
                        setForm({
                          id: account.id,
                          name: account.name,
                          institution: account.institution,
                          kind: account.kind,
                          currency: account.currency,
                          note: account.note,
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-accent hover:underline"
                    >
                      编辑
                    </button>
                    <span className="mx-2 text-border">|</span>
                    <button
                      onClick={() => void remove(account)}
                      className="text-gain hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
