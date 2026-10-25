import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Divider, SectionHeading } from "@/components/ui/ornaments";
import { PageHeader } from "@/components/site/page-header";

export const metadata: Metadata = { title: "Our story", description: "The story, cuisine and hospitality of Bayt Al Ghaf — a fictional Emirati restaurant on Dubai Creek." };

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="Our story · قصتنا" title="A house named for a tree" intro="Bayt Al Ghaf began with a family majlis in Al Bastakiya and a ghaf tree in the courtyard, where neighbours gathered for gahwa, dates and long conversations." image="/images/site/ghaf-tree.jpg" />
      <section className="container-page grid items-center gap-14 py-24 lg:grid-cols-2">
        <div className="prose-bayt max-w-xl text-[1.05rem] leading-relaxed text-muted">
          <SectionHeading eyebrow="The kitchen" title="Cooking the way Emirati homes cook" />
          <p className="mt-8">
            Chef Hessa grew up a few streets from the creek, in a house where machboos was cooked every Friday and harees simmered all night before Eid. Bayt Al Ghaf brings that kitchen to Al Seef: the same unhurried methods, the same respect for rice, lamb, dates and loomi, served in a coral-stone dining room that looks out over the abras.
          </p>
          <p>
            We grind our own bezar each week, stretch regag on the iron plate in front of guests and bake chebab to order. Our seafood comes from licensed Gulf suppliers; hammour is bought only outside the seasonal fishing ban. All our meat is halal, and the restaurant is alcohol-free.
          </p>
          <p>
            Alongside the classics we cook a few contemporary dishes with local produce — camel kofta with our walnut-and-pepper house sauce, a camel burger glazed with Sauce No. 7, and ice cream churned from UAE camel milk and dates.
          </p>
        </div>
        <div className="arch relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden bg-sand-200 shadow-[var(--shadow-lift)]">
          <Image src="/images/site/al-fahidi.jpg" alt="Wind towers in the Al Fahidi Historical Neighbourhood" fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
        </div>
      </section>
      <section className="bg-sand-100 py-24">
        <div className="container-page">
          <Divider label="Hospitality" className="mx-auto max-w-xl" />
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              ["Welcome", "الترحيب", "Every table is welcomed with gahwa from the dallah and Khalas dates. Coffee is poured from right to left; a gentle shake of the finjan says you have had enough."],
              ["Generosity", "الكرم", "Emirati meals are shared. Our platters and machboos are portioned generously, and family-style serving is always offered."],
              ["Respect", "الاحترام", "We are a family restaurant: alcohol-free, smoke-free and modest. Children are welcome, and the majlis rooms give families privacy."],
            ].map(([t, ar, d]) => (
              <div key={t} className="rounded-3xl bg-sand-50 p-8 ring-1 ring-sand-200">
                <h3 className="text-3xl">{t}</h3>
                <p lang="ar" className="font-arabic mt-1 text-xl text-brass-700">{ar}</p>
                <p className="mt-4 text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container-page grid items-center gap-14 py-24 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-sand-200">
          <Image src="/images/site/dhow.jpg" alt="A wooden dhow on Dubai Creek" fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
        </div>
        <div>
          <SectionHeading eyebrow="The setting" title="On the creek where Dubai began" intro="Al Seef runs along the Bur Dubai bank of the creek, between the wind towers of Al Fahidi and the abra stations that have carried people across the water for generations. Our terrace looks onto the dhows and abras; inside, the window tables face the same view." />
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/reservations">Reserve a table</ButtonLink>
            <ButtonLink href="/contact" variant="outline">How to find us</ButtonLink>
          </div>
          <p className="mt-10 rounded-2xl bg-sand-100 p-5 text-sm text-muted">
            <strong className="font-medium text-date-800">Please note:</strong> Bayt Al Ghaf, Chef Hessa and the story above are fictional. This website is a realistic test environment for an AI voice assistant; no real restaurant operates at this address.
          </p>
        </div>
      </section>
    </>
  );
}
