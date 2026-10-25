import type { Metadata } from "next";
import { TrackClient } from "./track-client";

export const metadata: Metadata = { title: "Track an order" };

export default function TrackPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <p className="eyebrow">Orders</p>
      <h1 className="mt-3 text-5xl">Track an order</h1>
      <p className="mt-4 max-w-xl text-muted">Enter your order number (e.g. ORD-123456) and the phone number you ordered with.</p>
      <TrackClient />
    </div>
  );
}
