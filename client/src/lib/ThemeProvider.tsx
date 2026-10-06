import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ThemeMode } from "@shared/schema";

// Theme preference is persisted server-side (via /api/app-settings), never in
// localStorage/sessionStorage -- this app avoids browser storage entirely so
// it keeps working the same way inside a sandboxed preview iframe. "system"
// follows the device's OS-level light/dark setting; "light"/"dark" pin it.

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  isSaving: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data } = useQuery<{ onboarded: boolean; theme: ThemeMode }>({
    queryKey: ["/api/app-settings"],
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const theme: ThemeMode = data?.theme ?? "system";
  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const mutation = useMutation({
    mutationFn: async (next: ThemeMode) => {
      await apiRequest("POST", "/api/app-settings/theme", { theme: next });
    },
    onMutate: async (next: ThemeMode) => {
      await queryClient.cancelQueries({ queryKey: ["/api/app-settings"] });
      queryClient.setQueryData<{ onboarded: boolean; theme: ThemeMode } | undefined>(
        ["/api/app-settings"],
        (prev) => (prev ? { ...prev, theme: next } : prev)
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
    },
  });

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next: ThemeMode) => mutation.mutate(next),
      isSaving: mutation.isPending,
    }),
    [theme, resolvedTheme, mutation.isPending]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
