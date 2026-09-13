import { StudioProvider } from "@/components/studio/provider";
import { SiteFooter, SiteHeader } from "@/components/studio/shared";
import { publicStudio } from "@/lib/domain";
import { readStudio } from "@/lib/store";
export const dynamic = "force-dynamic";
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioProvider initial={publicStudio(await readStudio())}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      {children}
      <SiteFooter />
    </StudioProvider>
  );
}
