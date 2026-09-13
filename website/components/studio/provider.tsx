"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { PublicStudio } from "@/lib/model";
const Context = createContext<{
  data: PublicStudio;
  refresh: () => Promise<void>;
} | null>(null);
export function StudioProvider({
  initial,
  children,
}: {
  initial: PublicStudio;
  children: React.ReactNode;
}) {
  const [data, setData] = useState(initial);
  const pathname = usePathname();
  const refresh = useCallback(async () => {
    const response = await fetch("/api/studio", { cache: "no-store" });
    if (response.ok) setData(await response.json());
  }, []);
  useEffect(() => {
    const update = () => {
      void refresh().catch(() => {});
    };
    update();
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, [refresh, pathname]);
  return (
    <Context.Provider value={{ data, refresh }}>{children}</Context.Provider>
  );
}
export function useStudio() {
  const context = useContext(Context);
  if (!context) throw new Error("StudioProvider is missing.");
  return context;
}
