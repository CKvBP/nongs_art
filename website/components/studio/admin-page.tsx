import { redirect } from "next/navigation";
import { isAdmin, localPreview } from "@/lib/auth";
import { readStudio } from "@/lib/store";
import { AdminStudio } from "./admin";
export async function AdminPage({
  section = "overview",
}: {
  section?: string;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { loginAttempts: _attempts, ...initial } = await readStudio();
  return (
    <AdminStudio
      key={section}
      initial={initial}
      section={section}
      preview={localPreview()}
    />
  );
}
