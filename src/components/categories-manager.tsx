"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_COLORS, formatMoney } from "@/lib/format";

export type CategoryRow = {
  id: number;
  name: string;
  color: string;
  holdingCount: number;
  marketValue: number;
};

const inputClass =
  "w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent/60";
const labelClass = "mb-1 block text-[11px] uppercase tracking-wider text-muted";

type FormState = { id: number | null; name: string; color: string };

export function CategoriesManager({
  categories,
  currency,
}: {
  categories: CategoryRow[];
  currency: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    id: null,
    name: "",
    color: CATEGORY_COLORS[0],
  });
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
      const res = await fetch(
        form.id ? `/api/categories/${form.id}` : "/api/categories",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.trim(), color: form.color }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      setMessage(form.id ? "分类已更新" : "分类已创建");
      setForm({
        id: null,
        name: "",
        color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length],
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: CategoryRow) {
    if (
      !window.confirm(
        `确认删除「${category.name}」？${category.holdingCount} 笔持仓会变为未分类。`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "删除失败");
      }
      setMessage("分类已删除");
      if (form.id === category.id) {
        setForm({ id: null, name: "", color: CATEGORY_COLORS[0] });
      }
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
          <div>
            <h2 className="text-sm font-semibold">
              {form.id ? "编辑分类" : "新建分类"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              一笔持仓只能属于一个分类；分类用于总览饼图和资产分组。
            </p>
          </div>
          {form.id ? (
            <button
              type="button"
              onClick={() => setForm({ id: null, name: "", color: CATEGORY_COLORS[0] })}
              className="text-xs text-muted hover:text-ink"
            >
              取消编辑
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className={labelClass}>分类名称</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
              placeholder="如：核心资产 / 长期 / 养老"
              required
            />
          </div>
          <div>
            <label className={labelClass}>颜色</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set("color", color)}
                  aria-label={`选择颜色 ${color}`}
                  className={`h-7 w-7 rounded-md ring-2 transition ${
                    form.color === color ? "ring-ink" : "ring-transparent"
                  }`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/25 disabled:opacity-50"
          >
            {busy ? "保存中…" : form.id ? "保存修改" : "创建分类"}
          </button>
        </div>

        {message ? <p className="mt-3 text-xs text-loss">{message}</p> : null}
        {error ? <p className="mt-3 text-xs text-gain">{error}</p> : null}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-panel/70">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-5 py-3 font-medium">分类</th>
              <th className="px-3 py-3 text-right font-medium">持仓数</th>
              <th className="px-3 py-3 text-right font-medium">市值</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted">
                  还没有自定义分类，先创建一个。
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-t border-border/50 hover:bg-panel-2/50"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ background: category.color }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </td>
                  <td className="num px-3 py-3 text-right text-xs text-muted">
                    {category.holdingCount}
                  </td>
                  <td className="num px-3 py-3 text-right">
                    {formatMoney(category.marketValue, currency, 0)}
                  </td>
                  <td className="px-5 py-3 text-right text-xs">
                    <button
                      onClick={() => {
                        setForm({
                          id: category.id,
                          name: category.name,
                          color: category.color,
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-accent hover:underline"
                    >
                      编辑
                    </button>
                    <span className="mx-2 text-border">|</span>
                    <button
                      onClick={() => void remove(category)}
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
