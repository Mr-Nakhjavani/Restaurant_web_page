import type { Metadata } from "next";
import Link from "next/link";
import { BookingFlow } from "@/components/reservations/booking-flow";
import { PageHeader } from "@/components/site/page-header";

export const metadata: Metadata = { title: "Reservations", description: "Book a table at Bayt Al Ghaf, Al Seef — indoors, by the creek window, on the terrace or in a private majlis." };

export default function ReservationsPage() {
  return (
    <>
      <PageHeader eyebrow="Reservations · الحجوزات" title="Reserve a table" intro="Tables for 1 to 20 guests, up to 60 days ahead. Groups larger than 12 are confirmed by our team. Breakfast tables from 08:00; last seating 90 minutes before closing." image="/images/site/majlis.jpg">
        <p className="mt-6 text-sm text-sand-200">Already booked? <Link href="/reservations/manage" className="underline">Change or cancel a reservation</Link>.</p>
      </PageHeader>
      <div className="container-page py-12 md:py-16">
        <BookingFlow />
      </div>
    </>
  );
}
