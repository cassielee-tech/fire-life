"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncResponse = {
  updated?: Array<{ symbol: string; market: string }>;
  failures?: Array<{ symbol: string; error: string }>;
  fx?: { ok: boolean; count: number };
  error?: string;
};

export function SyncButton({ label = "同步行情" }: { label?: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function run() {
    setRunning(true);
    setMessage(null);
    setFailed(false);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = (await res.json()) as SyncResponse;
      if (!res.ok) throw new Error(data.error ?? "同步失败");
      const updated = data.updated?.length ?? 0;
      const failures = data.failures?.length ?? 0;
      setFailed(failures > 0);
      setMessage(
        `已更新 ${updated} 个价格${failures > 0 ? `，${failures} 个失败` : ""}${
          data.fx?.ok ? `，汇率 ${data.fx.count} 对` : "，汇率更新失败"
        }`,
      );
      router.refresh();
    } catch (err) {
      setFailed(true);
      setMessage(err instanceof Error ? err.message : "同步失败");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {message ? (
        <span className={`text-xs ${failed ? "text-gold" : "text-muted"}`}>{message}</span>
      ) : null}
      <button
        onClick={() => void run()}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/15 px-3.5 py-2 text-xs font-medium text-accent transition hover:bg-accent/25 disabled:cursor-wait disabled:opacity-60"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={running ? "animate-spin" : ""}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        {running ? "同步中…" : label}
      </button>
    </div>
  );
}
