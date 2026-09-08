"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CONSENT_EVENT, CONSENT_KEY, type ConsentChoice } from "@/lib/analytics/consent";

export function Analytics() {
  const [consent, setConsent] = useState<ConsentChoice>("unknown");
  const pathname = usePathname();
  const isFirstNavigation = useRef(true);
  const isProd = process.env.NODE_ENV === "production";
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const adsense = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    setConsent(stored === "accepted" || stored === "essential" ? stored : "unknown");
    const update = (event: Event) => setConsent((event as CustomEvent<ConsentChoice>).detail);
    window.addEventListener(CONSENT_EVENT, update);
    return () => window.removeEventListener(CONSENT_EVENT, update);
  }, []);

  useEffect(() => {
    // The initial load page_view is emitted by gtag("config"). Only track
    // subsequent client-side navigations to avoid double counting.
    if (isFirstNavigation.current) {
      isFirstNavigation.current = false;
      return;
    }
    const gtagFn = window.gtag;
    if (typeof gtagFn !== "function") return;
    gtagFn("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return (
    <>
      <CookieConsent choice={consent} onChoice={setConsent} />
      {consent === "accepted" && isProd && ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(ga)},{anonymize_ip:true});`}</Script>
        </>
      ) : null}
      {consent === "accepted" && pixel ? (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixel)});fbq('track','PageView');`}</Script>
      ) : null}
      {consent === "accepted" && adsense ? <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsense)}`} crossOrigin="anonymous" strategy="afterInteractive" /> : null}
    </>
  );
}

function CookieConsent({ choice, onChoice }: { choice: ConsentChoice; onChoice: (choice: ConsentChoice) => void }) {
  if (choice !== "unknown") return null;
  function choose(next: Exclude<ConsentChoice, "unknown">) {
    window.localStorage.setItem(CONSENT_KEY, next);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: next }));
    onChoice(next);
  }
  return (
    <aside aria-label="Cookie choices" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-xl border border-[var(--line)] bg-[color:var(--surface)]/96 p-4 shadow-[var(--shadow)] backdrop-blur-xl sm:p-5">
      <p className="font-bold">Your privacy choices</p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Essential storage keeps the site working. With permission, analytics and advertising help us measure and improve RoomFacelift.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => choose("accepted")} className="focus-ring whitespace-nowrap rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-black text-[var(--on-accent)] hover:bg-[var(--accent-strong)]">Allow analytics</button>
        <button type="button" onClick={() => choose("essential")} className="focus-ring whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-black hover:border-[var(--accent)]">Essentials only</button>
        <a href="/privacy" className="focus-ring rounded-lg px-2 py-2.5 text-sm font-bold text-[var(--accent)] underline">Privacy policy</a>
      </div>
    </aside>
  );
}
