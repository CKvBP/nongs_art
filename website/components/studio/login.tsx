"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { BackLink, Brand, FormMessage, postJson, SubmitButton } from "./shared";
export function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await postJson("/api/auth", {
        username: form.get("username"),
        password: form.get("password"),
      });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-art">
        <img src="/art/floral.webp" alt="Nong’s floral acrylic painting" />
        <span className="handwritten">
          A little space
          <br />
          for your creative world.
        </span>
      </div>
      <div className="login-content">
        <Brand />
        <div className="login-form">
          <p className="eyebrow">
            <LockKeyhole size={14} />
            THE STUDIO
          </p>
          <h1>
            Welcome back,
            <br />
            <em>artist.</em>
          </h1>
          <p>A little place to keep your creative world in order.</p>
          <form className="studio-form" onSubmit={submit}>
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                required
                maxLength={100}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={300}
              />
            </label>
            <FormMessage error={error} />
            <SubmitButton busy={busy}>
              Step into the studio <ArrowRight size={17} />
            </SubmitButton>
          </form>
          <BackLink href="/">Back to the website</BackLink>
        </div>
      </div>
    </main>
  );
}
