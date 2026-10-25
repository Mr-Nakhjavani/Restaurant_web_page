import type { Metadata } from "next";
import { PageHeader } from "@/components/site/page-header";
import { FaqBrowser } from "@/components/site/faq-browser";
import { listFaq } from "@/server/services/knowledge-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "FAQ", description: "Answers about reservations, ordering, delivery, catering, allergens, Ramadan, parking and more." };

export default async function FaqPage() {
  const { items, categories } = await listFaq();
  return (
    <>
      <PageHeader eyebrow="Questions · أسئلة" title="Frequently asked" intro="Everything from parking and Ramadan hours to sauces and allergens. Can't find it? Call us on +971 4 555 0142." image="/images/site/dates.jpg" />
      <div className="container-page py-12 md:py-16">
        <FaqBrowser items={items} categories={categories} />
      </div>
    </>
  );
}
