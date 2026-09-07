import { LegalPage } from "@/components/legal-page";
import { publicPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = publicPageMetadata({
  title: "Privacy Policy | RoomFacelift",
  description: "How RoomFacelift handles room photos, generated media, account information, cookies, service providers, and privacy requests.",
  path: "/privacy",
});

const supportLink = <a className="font-bold text-[var(--accent)] underline" href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>;

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" intro="This policy explains how RoomFacelift processes information when you use our AI room-design service. Last updated September 7, 2026.">
      <section>
        <h2>Information we process</h2>
        <p>We process room photos you upload, generated frames and videos, selected room and style settings, generation history, and credit usage. If you create an account, we process account identifiers such as your email address and authentication records. We may also process support messages, transaction records, and technical information such as IP address, browser or device information, timestamps, and security logs.</p>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>We use information to provide and save requested generations, authenticate users, administer credits and subscriptions, process billing, respond to support, secure the service, prevent fraud and abuse, diagnose failures, and improve reliability. Depending on the context, we process information to perform our contract with you, comply with law, pursue legitimate interests such as security and service operation, or based on your consent.</p>
      </section>

      <section>
        <h2>AI processing and user content</h2>
        <p>Your uploaded room image and the generated frames needed for your request are sent to third-party AI processing providers. RoomFacelift is an independent service that uses third-party AI technology; those providers do not operate or endorse RoomFacelift. Do not upload images you do not have permission to use or confidential material you are not authorized to process.</p>
      </section>

      <section>
        <h2>Storage and retention</h2>
        <p>Generation inputs and results are stored in private storage and may be retained while needed to provide generation history and saved-design features, unless deleted earlier or retention is required for security, fraud prevention, dispute resolution, or legal obligations. Account, credit, subscription, transaction, and generation records may likewise be retained while the account or service relationship remains active and afterward where reasonably necessary for those purposes.</p>
        <p className="mt-3">The current product does not promise a fixed automatic deletion period for saved generation history. Temporary input and text files created by the watermark processor are removed after processing, and temporary watermarked output copies are automatically removed after the processor&apos;s configured short-lived retention period. The final protected result is persisted separately in private storage.</p>
        <p className="mt-3">You may request deletion by contacting {supportLink}. We may need to verify the request, and legal or operational exceptions may apply.</p>
      </section>

      <section>
        <h2>Third-Party Service Providers</h2>
        <ul className="grid list-disc gap-3 pl-6">
          <li><strong className="text-[var(--ink)]">Supabase</strong> provides authentication, database services, and private file storage and processes account, generation, entitlement, and stored-media records.</li>
          <li><strong className="text-[var(--ink)]">Cloudflare</strong> provides application hosting, content delivery, networking, and security services and may process request, device, and network information.</li>
          <li><strong className="text-[var(--ink)]">fal.ai and AI model providers, including MiniMax</strong>, process uploaded and generated images, prompts, and generation parameters needed to create requested images and videos.</li>
          <li><strong className="text-[var(--ink)]">Google</strong> provides optional Google sign-in. If you choose it, Google and Supabase process authentication identifiers needed to complete sign-in.</li>
          <li><strong className="text-[var(--ink)]">Our authorized payment provider or Merchant of Record</strong> processes transactions. Stripe is currently integrated where checkout is enabled. Payment providers process payment and billing details; RoomFacelift does not store full card numbers.</li>
          <li><strong className="text-[var(--ink)]">Google Analytics, Google AdSense, and Meta Pixel</strong> may process usage, device, cookie, and advertising information only when the relevant integration is configured and you allow optional analytics and advertising technologies.</li>
        </ul>
      </section>

      <section>
        <h2>Cookies and Similar Technologies</h2>
        <p>Essential cookies are used for Supabase authentication sessions, signed anonymous identity, free-preview enforcement, security, and anti-abuse controls. These are needed for account and generation features. RoomFacelift also stores your analytics-consent choice in browser local storage so the site can remember whether optional scripts may load.</p>
        <p className="mt-3">When configured, Google Analytics, Google AdSense, and Meta Pixel load only after you select “Allow analytics.” Those providers may then use cookies or similar identifiers for measurement and advertising. Selecting “Essentials only” prevents these optional scripts from loading. You can clear the RoomFacelift consent value in browser storage to choose again, and browser controls may also be used to remove cookies.</p>
      </section>

      <section>
        <h2>Your Privacy Rights</h2>
        <p>Depending on where you live, you may have rights to request access to, correction of, or deletion of personal information, and to receive portable data where applicable. You may also have rights to restrict or object to certain processing and to withdraw consent where processing relies on consent. These rights can be subject to verification, exceptions, and limitations under applicable law.</p>
        <p className="mt-3">California residents may have applicable rights to know or access collected personal information, correct inaccuracies, request deletion, opt out of sale or sharing where applicable, and receive non-discriminatory treatment for exercising their rights. RoomFacelift does not sell personal information. Optional analytics and advertising scripts remain disabled when you select “Essentials only.” Submit a privacy request to {supportLink}.</p>
      </section>

      <section>
        <h2>International Data Transfers</h2>
        <p>RoomFacelift and its service providers may process information in countries other than the country where you live. Where legally required, appropriate safeguards are used for international transfers.</p>
      </section>

      <section>
        <h2>Children&apos;s Privacy</h2>
        <p>RoomFacelift is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe a child under 13 provided personal information, contact {supportLink} so we can review the request.</p>
      </section>

      <section>
        <h2>Security and policy updates</h2>
        <p>We use technical and organizational safeguards intended to protect information, but no online service can guarantee absolute security. We may update this policy as the product or legal requirements change and will revise the date above when we do.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>For privacy questions or requests, email {supportLink}.</p>
      </section>
    </LegalPage>
  );
}
