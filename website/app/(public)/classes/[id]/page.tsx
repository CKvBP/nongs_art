import { notFound } from "next/navigation";
import { ClassDetails } from "@/components/studio/classes";
import { readStudio } from "@/lib/store";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await readStudio();
  if (
    !data.events.some(
      (e) =>
        e.id === id &&
        e.published &&
        data.programs.some((p) => p.id === e.programId && p.published),
    )
  )
    notFound();
  return <ClassDetails id={id} />;
}
