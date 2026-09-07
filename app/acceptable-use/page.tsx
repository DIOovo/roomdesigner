import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { publicPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = publicPageMetadata({
  title: "Acceptable Use Policy | RoomFacelift",
  description: "Rules for acceptable use of RoomFacelift's AI-powered room redesign and generation services.",
  path: "/acceptable-use",
});

export default function AcceptableUsePage() {
  const legalLinkClass = "font-bold text-[var(--accent)] underline";
  return (
    <LegalPage title="Acceptable Use Policy" intro="This policy describes the rules for using RoomFacelift's AI-powered room redesign and generation services. Last updated September 7, 2026.">
      <section>
        <h2>Introduction</h2>
        <p>RoomFacelift may be used only for lawful, good-faith room visualization and design purposes. When you use the generation service, you agree to follow this policy together with our <Link className={legalLinkClass} href="/terms">Terms of Service</Link> and <Link className={legalLinkClass} href="/privacy">Privacy Policy</Link>.</p>
      </section>

      <section>
        <h2>Permitted Use</h2>
        <p>You may use RoomFacelift for interior design visualization, home-improvement inspiration, room redesign ideas, and lawful commercial design work where your plan or license permits it. You may use only images you own or have the necessary permission to use.</p>
      </section>

      <section>
        <h2>Prohibited Content and Activities</h2>
        <p>You may not use uploaded images, AI-generated room designs, or any part of the generation service to create, request, upload, distribute, or facilitate:</p>
        <ul className="mt-3 grid list-disc gap-2 pl-6">
          <li>Pornography, sexually explicit content, non-consensual intimate imagery, child sexual abuse material, or sexual or exploitative content involving minors.</li>
          <li>Illegal, exploitative, hateful, abusive, or harassing content.</li>
          <li>Violent or harmful content intended to facilitate real-world injury or wrongdoing.</li>
          <li>Impersonation, deceptive misuse, abusive deepfake-style manipulation of identifiable people, fraud, or scams.</li>
          <li>Intellectual-property infringement, malware, attacks on the service, or other platform abuse.</li>
        </ul>
      </section>

      <section>
        <h2>Image and Content Rights</h2>
        <p>You may upload only images you own or are authorized or licensed to use. You may not upload stolen images, copyrighted material without permission, private images without authorization, or content that infringes another person&apos;s privacy, publicity, or other legal rights. RoomFacelift does not independently verify that you own every uploaded image.</p>
      </section>

      <section>
        <h2>AI Safety and Abuse</h2>
        <p>You may not try to use RoomFacelift&apos;s AI systems to generate unsafe, illegal, abusive, harmful, or otherwise prohibited content. You may not intentionally attempt to defeat content safeguards or craft inputs intended to bypass safety mechanisms.</p>
      </section>

      <section>
        <h2>Circumvention and Automated Abuse</h2>
        <p>You may not bypass usage limits, credit restrictions, security controls, or abuse-prevention measures; exploit free credits; farm accounts; operate abusive bots; scrape private or access-controlled parts of the service without authorization; or interfere with service operation. This restriction does not prohibit ordinary search-engine indexing of publicly accessible pages in accordance with our published crawling rules.</p>
      </section>

      <section>
        <h2>Enforcement</h2>
        <p>Where we reasonably believe this policy has been violated, RoomFacelift may block a generation request, restrict abusive use, suspend access, remove prohibited content where applicable, or terminate access for serious or repeated violations. We may also preserve or disclose information when required by applicable law.</p>
      </section>

      <section>
        <h2>Changes to This Policy</h2>
        <p>We may update this policy as RoomFacelift, applicable requirements, or abuse patterns change. We will revise the last-updated date when changes are published.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>Questions or reports concerning this policy can be sent to <a className={legalLinkClass} href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>.</p>
      </section>
    </LegalPage>
  );
}
