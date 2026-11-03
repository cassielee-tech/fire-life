"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/theme-provider";
import { DEFAULT_THEME, type ThemeMode } from "@/lib/theme";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function SunIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

const OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  icon: React.ReactNode;
}> = [
  { mode: "light", label: "浅色", icon: <SunIcon /> },
  { mode: "dark", label: "深色", icon: <MoonIcon /> },
  { mode: "system", label: "系统", icon: <MonitorIcon /> },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const mounted = useMounted();

  const activeMode = mounted ? mode : DEFAULT_THEME;

  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted">
        主题
      </div>
      <div className="inline-flex w-full rounded-lg border border-border bg-panel-2 p-0.5">
        {OPTIONS.map((option) => {
          const active = activeMode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => setMode(option.mode)}
              aria-pressed={active}
              title={option.label}
              className={`flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] transition ${
                active
                  ? "bg-panel text-ink shadow-sm ring-1 ring-border"
                  : "text-muted hover:text-ink"
              }`}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
