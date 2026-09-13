import { notFound } from "next/navigation";
import { CommissionDetails } from "@/components/studio/commissions";
import { readStudio } from "@/lib/store";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await readStudio()).offerings.some((o) => o.id === id && o.published))
    notFound();
  return <CommissionDetails id={id} />;
}
