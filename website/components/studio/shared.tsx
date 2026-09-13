"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Menu,
  X,
  MapPin,
  ArrowLeft,
  Check,
  LoaderCircle,
} from "lucide-react";
import { useStudio } from "./provider";
export function Brand({ name = "Nong’s Art Den" }: { name?: string }) {
  return (
    <Link className="brand" href="/" aria-label={`${name} home`}>
      {name === "Nong’s Art Den" ? (
        <>
          Nong’s<span>ART DEN</span>
        </>
      ) : (
        <span className="custom-brand">{name}</span>
      )}
    </Link>
  );
}
export function SiteHeader() {
  const { data } = useStudio();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = [
    ["/classes", "Classes & workshops"],
    ["/commissions", "Custom art"],
    ["/gallery", "The gallery"],
    ["/about", "Meet Nong"],
  ];
  return (
    <>
      <div className="announcement">
        A little more color. A little more joy. Made in {data.settings.location}
        .
      </div>
      <header className="site-header">
        <Brand name={data.settings.name} />
        <nav aria-label="Main navigation">
          {links.map(([url, label]) => (
            <Link
              aria-current={pathname.startsWith(url) ? "page" : undefined}
              key={url}
              href={url}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link className="button dark small header-cta" href="/classes">
          Find your class <ArrowUpRight size={17} />
        </Link>
        <button
          className="mobile-menu icon-button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-navigation"
          aria-label="Mobile navigation"
        >
          {links.map(([url, label]) => (
            <Link key={url} href={url} onClick={() => setOpen(false)}>
              {label}
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
export function SiteFooter() {
  const { data } = useStudio();
  return (
    <footer className="site-footer">
      <div className="wrap footer-row">
        <Brand name={data.settings.name} />
        <p>
          {data.settings.tagline}
          <span className="footer-location">
            <MapPin size={13} />
            {data.settings.location}
          </span>
        </p>
        <div className="footer-links">
          {data.settings.contactEmail && (
            <a href={`mailto:${data.settings.contactEmail}`}>
              Say hello <ArrowUpRight size={15} />
            </a>
          )}
          {data.settings.instagram && (
            <a href={data.settings.instagram} target="_blank" rel="noreferrer">
              Instagram <ArrowUpRight size={15} />
            </a>
          )}
          <Link href="/admin">
            Studio admin <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="back-link" href={href}>
      <ArrowLeft size={15} />
      {children}
    </Link>
  );
}
export function EmptyState({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      className={`studio-dialog ${wide ? "wide" : ""}`}
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <h3>{title}</h3>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SubmitButton({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button className="button dark" type="submit" disabled={busy}>
      {busy ? (
        <>
          <LoaderCircle className="spin" size={17} />
          Saving…
        </>
      ) : (
        children
      )}
    </button>
  );
}
export function FormMessage({ error }: { error: string }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
export function SuccessMessage({
  title,
  reference,
  children,
}: {
  title: string;
  reference: string;
  children: React.ReactNode;
}) {
  return (
    <div className="success-card" role="status">
      <span className="success-icon">
        <Check size={28} />
      </span>
      <p className="eyebrow">A LITTLE SOMETHING TO LOOK FORWARD TO</p>
      <h2>{title}</h2>
      <p>{children}</p>
      <div className="reference">
        Your reference <strong>{reference}</strong>
      </div>
      <Link className="button" href="/classes">
        Explore more classes <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
export async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}
export function Honeypot() {
  return (
    <div className="honeypot" aria-hidden="true">
      <label>
        Leave this empty
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
