"use client";

import { useState } from "react";
import { ReservationView } from "@/components/reservations/reservation-view";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

export function ManageClient() {
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState<{ ref: string; phone: string } | null>(null);
  return (
    <div className="mt-10 space-y-10">
      <form
        className="grid max-w-2xl gap-4 rounded-2xl bg-white p-6 ring-1 ring-sand-200 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery({ ref: ref.trim().toUpperCase(), phone: phone.trim() });
        }}
      >
        <Field label="Reference" htmlFor="mr"><Input id="mr" required value={ref} onChange={(e) => setRef(e.target.value)} placeholder="RES-123456" /></Field>
        <Field label="Phone number" htmlFor="mp"><Input id="mp" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050 123 4567" /></Field>
        <Button type="submit">Find booking</Button>
      </form>
      {query && <ReservationView key={`${query.ref}-${query.phone}`} reference={query.ref} auth={{ phone: query.phone }} />}
    </div>
  );
}
