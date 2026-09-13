import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nong’s Art Den | Classes & Custom Art",
  description:
    "Art classes for little artists and grown-ups, custom ornaments, wedding paintings, and original art by Nong.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}
