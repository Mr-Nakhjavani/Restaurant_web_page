import type { Metadata } from "next";
import { Checkout } from "@/components/order/checkout";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <>
      <div className="border-b border-sand-200 bg-sand-100">
        <div className="container-page py-10">
          <p className="eyebrow">Order online</p>
          <h1 className="mt-3 text-5xl">Checkout</h1>
        </div>
      </div>
      <Checkout />
    </>
  );
}
