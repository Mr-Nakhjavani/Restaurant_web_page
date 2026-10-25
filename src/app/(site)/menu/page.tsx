import type { Metadata } from "next";
import { nowInDubai } from "@/domain/time";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { PageHeader } from "@/components/site/page-header";
import { listMenu } from "@/server/services/menu-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Menu", description: "The full Bayt Al Ghaf menu with prices in AED, ingredients, allergens and live availability." };

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ view?: string; category?: string }> }) {
  const sp = await searchParams;
  const result = await listMenu(nowInDubai(), {});
  return (
    <>
      <PageHeader
        eyebrow="Menu · قائمة الطعام"
        title="The menu"
        intro="Prices in AED include 5% VAT. Allergens listed are ingredients of the standard recipe; our single kitchen handles all major allergens, so traces are always possible."
        image="/images/site/spices.jpg"
      />
      <MenuBrowser initialItems={result.items} categories={result.categories} initialView={sp.view === "specials" ? "specials" : "all"} initialCategory={sp.category} kitchenStatement={result.kitchenAllergenStatement} />
    </>
  );
}
