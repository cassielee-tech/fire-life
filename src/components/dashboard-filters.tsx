"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SelectedCategory = number | "none" | null;

export function DashboardFilters({
  accounts,
  categories,
  selectedAccountId,
  selectedCategory,
}: {
  accounts: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  selectedAccountId: number | null;
  selectedCategory: SelectedCategory;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [account, setAccount] = useState(
    selectedAccountId === null ? "all" : String(selectedAccountId),
  );
  const [category, setCategory] = useState(
    selectedCategory === null ? "all" : String(selectedCategory),
  );

  function navigate(nextAccount: string, nextCategory: string) {
    const params = new URLSearchParams();
    if (nextAccount !== "all") params.set("account", nextAccount);
    if (nextCategory !== "all") params.set("category", nextCategory);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/?${query}` : "/");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <span className="hidden sm:inline">账户</span>
        <select
          value={account}
          onChange={(event) => {
            setAccount(event.target.value);
            navigate(event.target.value, category);
          }}
          disabled={pending}
          className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-xs text-ink outline-none transition focus:border-accent/60 disabled:opacity-60"
        >
          <option value="all">全部账户</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-muted">
        <span className="hidden sm:inline">分类</span>
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            navigate(account, event.target.value);
          }}
          disabled={pending}
          className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-xs text-ink outline-none transition focus:border-accent/60 disabled:opacity-60"
        >
          <option value="all">全部分类</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
          <option value="none">未分类</option>
        </select>
      </label>
    </div>
  );
}
