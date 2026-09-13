"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="not-found">
      <p className="eyebrow">ONE LITTLE MOMENT</p>
      <h1>
        The studio needs
        <br />
        <em>a moment.</em>
      </h1>
      <p>We couldn’t load this page. Please try again shortly.</p>
      <button className="button dark" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
