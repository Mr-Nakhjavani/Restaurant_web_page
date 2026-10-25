import type { Metadata } from "next";
import { nowInDubai } from "@/domain/time";
import { PageHeader } from "@/components/site/page-header";
import { OrderBuilder } from "@/components/order/order-builder";
import { listMenu } from "@/server/services/menu-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order online", description: "Order Emirati dishes for pickup, delivery in central Dubai, or a dine-in pre-order." };

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const sp = await searchParams;
  const menu = await listMenu(nowInDubai(), { mode: "pickup" });
  return (
    <>
      <PageHeader eyebrow="Order online · اطلب الآن" title="Order ahead" intro="Collect from our counter at Gate 3, have it delivered across central Dubai, or pre-order so it is on the table when you arrive. Pay on collection, on delivery or at the table." image="/images/menu/karak.jpg" />
      <OrderBuilder initialItems={menu.items.filter((i) => !i.bulkOnly)} categories={menu.categories} addSlug={sp.add ?? null} />
    </>
  );
}
