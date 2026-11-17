"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Data } from "@/lib/types";
import { createSeed } from "@/lib/seed";
import { todayJst } from "@/lib/accounting";
import { isStoredData } from "@/lib/storage";

const KEY = "rmm:v1";

type Store = {
  data: Data;
  today: string;
  update: (data: Data) => void;
  reset: () => void;
};

const Context = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [today, setToday] = useState("");
  const [warning, setWarning] = useState("");
  useEffect(() => {
    // Mount-only initialization keeps the server and initial client render identical.
    const load = () => {
      setToday(todayJst());
      try {
        const raw = localStorage.getItem(KEY);
        const stored: unknown = raw ? JSON.parse(raw) : createSeed();
        if (!isStoredData(stored)) {
          throw new Error("invalid data");
        }
        setData(stored);
        if (!raw) localStorage.setItem(KEY, JSON.stringify(stored));
      } catch {
        setData(createSeed());
        setWarning("保存データを読み込めませんでした。既定データを表示しています。");
      }
    };
    load();
    const timer = window.setInterval(() => setToday(todayJst()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  function update(next: Data) {
    setData(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setWarning("");
    } catch {
      setWarning("ブラウザに保存できません。この画面の変更は再読込で失われます。");
    }
  }
  if (!data) return <main className="loading">作業台を準備しています…</main>;
  return (
    <Context.Provider value={{ data, today, update, reset: () => update(createSeed()) }}>
      {warning && (
        <p className="notice warning" role="alert">
          {warning}
        </p>
      )}
      {children}
    </Context.Provider>
  );
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider is required");
  return store;
}
