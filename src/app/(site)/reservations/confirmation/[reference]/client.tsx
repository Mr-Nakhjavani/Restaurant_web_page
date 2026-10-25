"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ReservationView } from "@/components/reservations/reservation-view";
import { recentReservations, rememberReservation } from "@/components/reservations/recent-reservations";
import { Spinner } from "@/components/ui/spinner";

export function ReservationConfirmation({ reference }: { reference: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get("t");
    if (t) {
      rememberReservation(reference, t);
      history.replaceState(null, "", window.location.pathname);
    }
    setToken(t ?? recentReservations().find((r) => r.reference === reference)?.token ?? null);
  }, [reference]);
  if (token === undefined) return <Spinner />;
  if (!token) {
    return (
      <p className="text-center">
        For your privacy, <Link href="/reservations/manage" className="underline">look up {reference}</Link> with the phone number you booked with.
      </p>
    );
  }
  return (
    <>
      <p className="eyebrow">Shukran · شكراً</p>
      <h1 className="mt-3 mb-10 text-5xl">Your reservation</h1>
      <ReservationView reference={reference} auth={{ token }} />
    </>
  );
}
