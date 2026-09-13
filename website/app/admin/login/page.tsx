import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { Login } from "@/components/studio/login";
export default async function Page() {
  if (await isAdmin()) redirect("/admin");
  return <Login />;
}
