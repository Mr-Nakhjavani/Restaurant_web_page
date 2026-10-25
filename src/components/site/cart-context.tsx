"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartLine {
  lineId: string;
  itemId: string;
  slug: string;
  name: string;
  image: string;
  quantity: number;
  options: string[];
  optionLabels: string[];
  /** Display estimate only — the server recalculates every price at checkout. */
  unitPriceFils: number;
  notes?: string;
}

export type OrderTypeChoice = "pickup" | "delivery" | "dine_in_preorder";

export interface FulfilmentChoice {
  type: OrderTypeChoice;
  asap: boolean;
  date: string | null;
  time: string | null;
  reservationReference?: string;
}

interface CartState {
  lines: CartLine[];
  fulfilment: FulfilmentChoice;
  count: number;
  estimatedSubtotalFils: number;
  ready: boolean;
  add: (line: Omit<CartLine, "lineId">) => void;
  update: (lineId: string, patch: Partial<CartLine>) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  setFulfilment: (f: Partial<FulfilmentChoice>) => void;
}

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "bayt-al-ghaf.cart.v1";

const defaultFulfilment: FulfilmentChoice = { type: "pickup", asap: true, date: null, time: null };

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [fulfilment, setFulfilmentState] = useState<FulfilmentChoice>(defaultFulfilment);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.lines)) setLines(parsed.lines);
        if (parsed.fulfilment) setFulfilmentState({ ...defaultFulfilment, ...parsed.fulfilment });
      }
    } catch {
      /* storage unavailable: cart works in memory only */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, fulfilment }));
    } catch {
      /* ignore */
    }
  }, [lines, fulfilment, ready]);

  const add = useCallback((line: Omit<CartLine, "lineId">) => {
    setLines((prev) => {
      const key = `${line.itemId}|${[...line.options].sort().join(",")}|${line.notes ?? ""}`;
      const existing = prev.find((l) => `${l.itemId}|${[...l.options].sort().join(",")}|${l.notes ?? ""}` === key);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: Math.min(10, l.quantity + line.quantity) } : l));
      return [...prev, { ...line, lineId: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` }];
    });
  }, []);
  const update = useCallback((lineId: string, patch: Partial<CartLine>) => setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, ...patch } : l))), []);
  const remove = useCallback((lineId: string) => setLines((prev) => prev.filter((l) => l.lineId !== lineId)), []);
  const clear = useCallback(() => setLines([]), []);
  const setFulfilment = useCallback((f: Partial<FulfilmentChoice>) => setFulfilmentState((prev) => ({ ...prev, ...f })), []);

  const value = useMemo<CartState>(
    () => ({
      lines,
      fulfilment,
      ready,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      estimatedSubtotalFils: lines.reduce((n, l) => n + l.unitPriceFils * l.quantity, 0),
      add,
      update,
      remove,
      clear,
      setFulfilment,
    }),
    [lines, fulfilment, ready, add, update, remove, clear, setFulfilment],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
