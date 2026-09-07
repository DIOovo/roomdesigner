import { LegalPage } from "@/components/legal-page";
import { publicPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = publicPageMetadata({
  title: "Refund Policy | RoomFacelift",
  description: "RoomFacelift refund rules for digital AI generations, unused credit packs, subscriptions, duplicate charges, and billing errors.",
  path: "/refund",
});

export default function RefundPage() {
  const supportLink = <a className="font-bold text-[var(--accent)] underline" href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>;
  return (
    <LegalPage title="Refund Policy" intro="This policy explains when RoomFacelift purchases may qualify for review or refund. Last updated September 7, 2026.">
      <section><h2>Digital AI generations</h2><p>AI-generated images and videos are digital services that begin processing shortly after you submit a generation. Once the corresponding credit has been used or generation processing has started or completed, the purchase is generally not refundable, except where required by applicable law.</p></section>
      <section><h2>Credit packs</h2><p>You may request a refund for a credit pack within 14 days after purchase if none of its credits have been used. If any credit from the pack has been used for a generation, the credit pack is generally no longer eligible for a refund, except where required by applicable law.</p></section>
      <section><h2>Subscriptions</h2><p>You may cancel Starter or Pro to stop future renewals. After cancellation, access for the already-paid billing period generally continues until the end of that period. We generally do not provide prorated refunds for a current billing period, except where required by applicable law.</p></section>
      <section><h2>Duplicate charges and technical errors</h2><p>Contact {supportLink} if you believe you were charged twice, made an accidental duplicate purchase, experienced a confirmed technical billing error, or had a failed service attempt that incorrectly consumed credits. Include the account email, approximate transaction date, and relevant generation or receipt reference. We will review the records and provide an appropriate correction or refund when confirmed.</p></section>
      <section><h2>Payment processing</h2><p>Payments may be processed by our authorized payment provider or Merchant of Record. Approved refunds are returned through the applicable payment provider and may take additional time to appear depending on the provider or financial institution.</p></section>
      <section><h2>How to request a review</h2><p>Email {supportLink}. Requests may require account or transaction verification. Nothing in this policy limits non-waivable rights available under applicable consumer law.</p></section>
    </LegalPage>
  );
}
