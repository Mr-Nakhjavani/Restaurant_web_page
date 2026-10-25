import type { Metadata } from "next";
import { ReservationConfirmation } from "./client";

export const metadata: Metadata = { title: "Your reservation" };

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return (
    <div className="container-page py-12 md:py-16">
      <ReservationConfirmation reference={decodeURIComponent(reference)} />
    </div>
  );
}
