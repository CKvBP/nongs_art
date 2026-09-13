import { notFound } from "next/navigation";
import { AdminPage } from "@/components/studio/admin-page";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "calendar",
      "programs",
      "registrations",
      "inquiries",
      "homepage",
      "gallery",
      "offerings",
      "settings",
    ].includes(section)
  )
    notFound();
  return <AdminPage section={section} />;
}
