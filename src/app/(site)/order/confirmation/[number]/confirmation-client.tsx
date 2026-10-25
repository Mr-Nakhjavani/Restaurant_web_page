"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderView } from "@/components/order/order-view";
import { rememberOrder, tokenFor } from "@/components/order/recent-orders";
import { Spinner } from "@/components/ui/spinner";

export function ConfirmationClient({ number }: { number: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("t");
    if (fromHash) {
      rememberOrder(number, fromHash);
      history.replaceState(null, "", window.location.pathname);
    }
    setToken(fromHash ?? tokenFor(number));
  }, [number]);
  if (token === undefined) return <Spinner />;
  if (!token) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-4xl">Track order {number}</h1>
        <p className="mt-3 text-muted">For your privacy we need the phone number used to place the order.</p>
        <Link href={`/order/track?number=${encodeURIComponent(number)}`} className="mt-6 inline-block underline">Look up this order</Link>
      </div>
    );
  }
  return (
    <>
      <p className="eyebrow">Thank you · شكراً</p>
      <h1 className="mt-3 mb-10 text-5xl">Your order</h1>
      <OrderView number={number} auth={{ token }} />
    </>
  );
}
