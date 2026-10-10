import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Analytics } from "@/components/analytics";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default:
      "Free AI Room Design Generator (No Login) - Before After Video",
    template: "%s | RoomFacelift",
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />

        {children}

        <SiteFooter />

        <Analytics />

        {/* Plausible Analytics */}
        <Script
          src="https://analytics.blurb.cam/js/pa-X-cpMOi0xcIwaBs6i3yFO.js"
          strategy="afterInteractive"
        />

        <Script id="plausible-init" strategy="afterInteractive">
          {`
            window.plausible = window.plausible || function() {
              (plausible.q = plausible.q || []).push(arguments);
            };
            plausible.init = plausible.init || function(i) {
              plausible.o = i || {};
            };
            plausible.init();
          `}
        </Script>
      </body>
    </html>
  );
}