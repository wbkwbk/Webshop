import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: "donmartins",
    template: "%s · donmartins",
  },
  description:
    "Please register to pre-order the AFM Saucer MOD. Production starts once we reach 100 reservations. No payment is required upfront.",
};

export const instant = false;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <div className="h-1 bg-primary" />
        <SiteHeader />
        <main id="content" className="min-w-0 flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
