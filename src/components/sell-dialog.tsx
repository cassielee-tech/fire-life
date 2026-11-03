"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeSellAllocation } from "@/lib/returns";
import { formatMoney, formatNumber, formatPct, toneClass } from "@/lib/format";

export type SellTarget = {
  id: number;
  name: string;
  quantity: number;
  costBasis: number;
  currency: string;
  price: number | null;
};

const inputClass =
  "w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent/60";
const labelClass = "mb-1 block text-[11px] uppercase tracking-wider text-muted";

function todayInShanghai() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function SellDialog({
  target,
  onClose,
  onDone,
}: {
  target: SellTarget;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const router = useRouter();
  const [sellQuantity, setSellQuantity] = useState(String(target.quantity));
  const [price, setPrice] = useState(
    target.price === null ? "" : String(target.price),
  );
  const [fee, setFee] = useState("0");
  const [sellDate, setSellDate] = useState(todayInShanghai);
  const [creditCash, setCreditCash] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allocation = useMemo(
    () =>
      computeSellAllocation({
        quantity: target.quantity,
        costBasis: target.costBasis,
        sellQuantity: Number(sellQuantity || 0),
        price: Number(price || 0),
        fee: Number(fee || 0),
      }),
    [target.quantity, target.costBasis, sellQuantity, price, fee],
  );

  async function submit() {
    const quantity = Number(sellQuantity || 0);
    const sellPrice = Number(price || 0);
    const sellFee = Number(fee || 0);

    if (!(quantity > 0)) {
      setError("卖出数量需大于 0");
      return;
    }
    if (quantity > target.quantity + 1e-9) {
      setError("卖出数量不能超过持仓数量");
      return;
    }
    if (!(sellPrice >= 0) || price === "") {
      setError("请填写卖出价");
      return;
    }
    if (!(sellFee >= 0)) {
      setError("手续费不能为负");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/holdings/${target.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          price: sellPrice,
          fee: sellFee,
          sellDate,
          creditCash,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "卖出失败");
      router.refresh();
      onDone(
        `已卖出 ${target.name}，已实现收益 ${formatMoney(
          allocation.pnl,
          target.currency,
          2,
        )}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "卖出失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`卖出 ${target.name}`}
        className="w-full max-w-lg rounded-2xl border border-border bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">卖出 / 清仓</h2>
            <p className="mt-1 text-xs text-muted">
              {target.name} · 当前持有 {formatNumber(target.quantity, 2)} ·{" "}
              {target.currency}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted transition hover:text-ink"
          >
            关闭
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>卖出数量</label>
            <input
              type="number"
              step="any"
              min="0"
              value={sellQuantity}
              onChange={(e) => setSellQuantity(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>卖出价（原币）</label>
            <input
              type="number"
              step="any"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
              placeholder="如 12.50"
            />
          </div>
          <div>
            <label className={labelClass}>手续费（原币）</label>
            <input
              type="number"
              step="any"
              min="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>卖出日期</label>
            <input
              type="date"
              value={sellDate}
              onChange={(e) => setSellDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={creditCash}
            onChange={(e) => setCreditCash(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          回款计入同账户 {target.currency} 现金
        </label>

        <div className="mt-4 space-y-1.5 rounded-xl border border-border/70 bg-panel-2/60 px-4 py-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">卖出金额</span>
            <span className="num">
              {formatMoney(allocation.gross, target.currency, 2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">卖出成本</span>
            <span className="num">
              {formatMoney(allocation.costOfSold, target.currency, 2)}
            </span>
          </div>
          <div className={`flex justify-between ${toneClass(allocation.pnl)}`}>
            <span>已实现收益</span>
            <span className="num">
              {formatMoney(allocation.pnl, target.currency, 2)} ·{" "}
              {formatPct(allocation.rate)}
            </span>
          </div>
          <div className="flex justify-between text-muted">
            <span>卖出后剩余</span>
            <span className="num">
              {formatNumber(allocation.remainingQuantity, 2)}
            </span>
          </div>
          {creditCash && allocation.netProceeds > 0 ? (
            <div className="flex justify-between text-muted">
              <span>回款现金</span>
              <span className="num">
                {formatMoney(allocation.netProceeds, target.currency, 2)}
              </span>
            </div>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-xs text-gain">{error}</p> : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs text-muted transition hover:text-ink"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-xs font-medium text-accent transition hover:bg-accent/25 disabled:opacity-50"
          >
            {busy ? "卖出中…" : allocation.isFull ? "确认清仓" : "确认卖出"}
          </button>
        </div>
      </div>
    </div>
  );
}
