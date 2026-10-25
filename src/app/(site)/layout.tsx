import { CartProvider } from "@/components/site/cart-context";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { loadRestaurantContext } from "@/server/repositories/catalog-repo";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const rc = await loadRestaurantContext();
  return (
    <CartProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-date-900 focus:px-4 focus:py-2 focus:text-sand-50">
        Skip to content
      </a>
      {rc.settings.announcement && (
        <div className="bg-brass-500 px-4 py-2 text-center text-sm font-medium text-date-900">{rc.settings.announcement}</div>
      )}
      <SiteHeader phone={rc.profile.contact.phone} />
      <main id="main">{children}</main>
      <SiteFooter rc={rc} />
    </CartProvider>
  );
}
