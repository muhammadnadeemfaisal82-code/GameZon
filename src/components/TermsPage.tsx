import { SITE_CONFIG } from '../config';

interface TermsPageProps {
  onNavigatePolicy: () => void;
  onNavigateContact: () => void;
}

export function TermsPage({
  onNavigatePolicy,
  onNavigateContact,
}: TermsPageProps) {
  return (
    <article className="max-w-3xl mx-auto py-4 sm:py-8">
      <header className="pb-8 border-b border-neutral-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
          Legal Terms · {SITE_CONFIG.domain}
        </p>
        <h1 className="mt-2 font-serif text-3xl sm:text-5xl font-bold leading-[1.12] tracking-tight text-neutral-950 [text-wrap:balance]">
          Terms of Use
        </h1>
        <p className="mt-4 text-sm text-neutral-600 tabular-nums">
          Publisher: NEWS WORLD · CEO &amp; Editor-in-Chief: Muhammad Nadeem Faisal ·
          Effective Date: November 18, 2026
        </p>
      </header>

      <div className="mt-8 space-y-8 text-base text-neutral-800 leading-[1.8]">
        <section>
          <h2 className="font-serif text-xl font-bold text-neutral-950 mb-2">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or reading NEWS WORLD ({SITE_CONFIG.baseUrl}), you agree to
            comply with these Terms of Use, our{' '}
            <button
              type="button"
              onClick={onNavigatePolicy}
              className="text-red-800 hover:underline cursor-pointer"
            >
              Editorial Policy, Disclaimer &amp; Privacy Policy
            </button>
            , and all applicable laws.
          </p>
        </section>

        <section className="pt-6 border-t border-neutral-200">
          <h2 className="font-serif text-xl font-bold text-neutral-950 mb-2">
            2. Intellectual Property &amp; Syndication
          </h2>
          <p>
            All original articles, headlines, editorial commentary, and design elements
            published on {SITE_CONFIG.domain} remain the intellectual property of NEWS
            WORLD and their respective authors unless otherwise noted. Brief quotation
            with clear attribution and a canonical link back to {SITE_CONFIG.baseUrl} is
            welcomed; full-text republication requires prior written permission from{' '}
            <a
              href="mailto:info@newsworld.life"
              className="font-mono text-sm text-red-800 hover:underline"
            >
              info@newsworld.life
            </a>
            .
          </p>
        </section>

        <section className="pt-6 border-t border-neutral-200">
          <h2 className="font-serif text-xl font-bold text-neutral-950 mb-2">
            3. Acceptable Use &amp; Editorial Integrity
          </h2>
          <p>
            Readers and visitors may not misuse our contact desks, RSS feeds, or
            publishing endpoints to transmit spam, unlawful material, hate speech, or
            automated abuse. NEWS WORLD stands firmly against crime, corruption,
            aggression, and injustice.
          </p>
        </section>

        <section className="pt-6 border-t border-neutral-200">
          <h2 className="font-serif text-xl font-bold text-neutral-950 mb-2">
            4. Third-Party Advertising &amp; External Links
          </h2>
          <p>
            NEWS WORLD displays third-party advertisements (including Google AdSense)
            and may link to external reference sources. External sites operate under
            their own terms and privacy notices.
          </p>
        </section>

        <section className="pt-6 border-t border-neutral-200">
          <h2 className="font-serif text-xl font-bold text-neutral-950 mb-2">
            5. Contact &amp; Corrections
          </h2>
          <p>
            For legal notices, takedown requests, or editorial corrections, please write
            to{' '}
            <a
              href={`mailto:${SITE_CONFIG.editorDirectEmail}`}
              className="font-mono text-sm text-red-800 hover:underline"
            >
              {SITE_CONFIG.editorDirectEmail}
            </a>{' '}
            or use our{' '}
            <button
              type="button"
              onClick={onNavigateContact}
              className="text-red-800 hover:underline cursor-pointer"
            >
              Contact Us
            </button>{' '}
            page.
          </p>
        </section>
      </div>
    </article>
  );
}
