import { redirect } from "next/navigation";
import { isAdmin, localPreview } from "@/lib/auth";
import { readStudio } from "@/lib/store";
import { emailReady } from "@/lib/mailer";
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
      initial={{ ...initial, emailConfigured: emailReady() }}
      section={section}
      preview={localPreview()}
    />
  );
}
