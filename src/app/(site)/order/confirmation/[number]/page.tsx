import type { Metadata } from "next";
import { ConfirmationClient } from "./confirmation-client";

export const metadata: Metadata = { title: "Your order" };

export default async function OrderConfirmationPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return (
    <div className="container-page py-12 md:py-16">
      <ConfirmationClient number={decodeURIComponent(number)} />
    </div>
  );
}
