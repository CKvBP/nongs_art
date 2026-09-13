import { Classes } from "@/components/studio/classes";
export const metadata = { title: "Classes & Workshops | Nong’s Art Den" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  return (
    <Classes
      initialType={
        ["children", "adult", "workshop"].includes(type ?? "") ? type : "all"
      }
    />
  );
}
