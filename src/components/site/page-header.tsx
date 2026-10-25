import Image from "next/image";
import { SaduBand } from "@/components/ui/ornaments";

export function PageHeader({ eyebrow, title, arabic, intro, image, children }: { eyebrow: string; title: string; arabic?: string; intro?: string; image?: string; children?: React.ReactNode }) {
  return (
    <section className="on-dark relative isolate overflow-hidden bg-date-900 text-sand-100">
      {image && (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-40" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-date-900 via-date-900/85 to-date-900/40" />
        </>
      )}
      <div className="container-page py-16 md:py-24">
        <p className="eyebrow eyebrow-light reveal">{eyebrow}</p>
        <h1 className="reveal mt-5 max-w-3xl text-5xl !text-sand-50 md:text-7xl">{title}</h1>
        {arabic && <p lang="ar" className="font-arabic mt-3 text-2xl text-brass-300 md:text-3xl">{arabic}</p>}
        {intro && <p className="reveal mt-6 max-w-2xl text-lg leading-relaxed text-sand-200">{intro}</p>}
        {children}
      </div>
      <SaduBand tone="brass" className="absolute inset-x-0 bottom-0 opacity-60" />
    </section>
  );
}
