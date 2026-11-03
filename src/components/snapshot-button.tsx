"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SnapshotButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/snapshot", { method: "POST" });
      const data = (await res.json()) as { count?: number; date?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "快照失败");
      setMessage(`${data.date} 已记录 ${data.count} 笔持仓`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "快照失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {message ? <span className="text-xs text-muted">{message}</span> : null}
      <button
        onClick={() => void run()}
        disabled={busy}
        className="rounded-lg border border-border bg-panel-2 px-3.5 py-2 text-xs text-muted transition hover:text-ink disabled:opacity-60"
      >
        {busy ? "记录中…" : "记录今日快照"}
      </button>
    </div>
  );
}
