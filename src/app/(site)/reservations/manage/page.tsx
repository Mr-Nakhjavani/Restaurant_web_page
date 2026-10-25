import type { Metadata } from "next";
import { ManageClient } from "./client";

export const metadata: Metadata = { title: "Manage a reservation" };

export default function Page() {
  return (
    <div className="container-page py-12 md:py-16">
      <p className="eyebrow">Reservations</p>
      <h1 className="mt-3 text-5xl">Manage a reservation</h1>
      <p className="mt-4 max-w-xl text-muted">Enter your booking reference (e.g. RES-123456) and the phone number you booked with to view, change or cancel it.</p>
      <ManageClient />
    </div>
  );
}
