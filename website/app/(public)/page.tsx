"use client";
import { useStudio } from "@/components/studio/provider";
import { HomeContent } from "@/components/studio/home-content";
export default function Home() {
  const { data } = useStudio();
  return <HomeContent data={data} />;
}
