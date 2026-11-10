import { BrandBar } from "@/components/site/brand-bar";
import { SiteNav } from "@/components/site/site-nav";

export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="paper-grid min-h-dvh">
      <BrandBar>
        <SiteNav />
      </BrandBar>
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}
