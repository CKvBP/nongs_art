import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">A LITTLE OFF THE BEATEN PATH</p>
      <h1>
        This page has
        <br />
        <em>wandered off.</em>
      </h1>
      <p>Let’s get you back to something lovely.</p>
      <Link className="button dark" href="/">
        Back to the studio
      </Link>
    </main>
  );
}
