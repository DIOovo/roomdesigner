import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({ title: "Terms of Service | RoomFacelift", description: "RoomFacelift terms for free previews, subscriptions, credits, acceptable use, refunds, and commercial licensing.", path: "/terms" });

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" intro="These terms govern access to RoomFacelift. Last updated September 7, 2026.">
      <section><h2>Plans and credits</h2><p>Free previews do not reset daily. Starter and Pro subscription credits follow the active billing period. One-time credit packs expire one year after purchase. Unused credits are not cash equivalents.</p></section>
      <section><h2>Billing, cancellation, and refunds</h2><p>Purchases and subscriptions are subject to the RoomFacelift <Link className="font-bold text-[var(--accent)] underline" href="/refund">Refund Policy</Link>. Canceling a subscription prevents future renewals; it does not automatically refund the current billing period unless applicable law requires otherwise.</p></section>
      <section><h2>Usage rights</h2><p>Free and Starter outputs are for personal use. Commercial use is available only while eligible under Pro or a separately agreed business plan. You remain responsible for reviewing outputs before use.</p></section>
      <section><h2>Uploaded content and AI services</h2><p>You must have permission to upload each image. Do not upload illegal content, confidential material you are not authorized to process, or images that violate another person&apos;s rights. RoomFacelift is an independent service and sends content needed for a requested generation to third-party AI processing providers.</p></section>
      <section><h2>Acceptable use and AI safety</h2><p>You may not use RoomFacelift to create, upload, request, or distribute illegal, sexually explicit, harmful, abusive, deceptive, or otherwise prohibited content. You must have the necessary rights or permission for images uploaded to the service, and you may not attempt to bypass safety, usage, credit, security, or abuse-prevention controls. RoomFacelift may block or restrict abusive use. Use of the service is also subject to the RoomFacelift <Link className="font-bold text-[var(--accent)] underline" href="/acceptable-use">Acceptable Use Policy</Link>.</p></section>
      <section><h2>Service availability</h2><p>AI output can vary and may contain visual errors. We do not guarantee that a design is structurally feasible, code-compliant, or suitable for construction without professional review.</p></section>
    </LegalPage>
  );
}
