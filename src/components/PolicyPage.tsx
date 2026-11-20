import { Mail, ShieldCheck } from 'lucide-react';
import { SITE_CONFIG } from '../config';

interface PolicyPageProps {
  onNavigateAbout: () => void;
  onContactEditor: (email?: string) => void;
}

export function PolicyPage({
  onNavigateAbout,
  onContactEditor,
}: PolicyPageProps) {
  return (
    <article className="max-w-3xl mx-auto py-4 sm:py-8">
      <header className="pb-8 border-b border-neutral-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
          Governance &amp; Compliance · {SITE_CONFIG.domain}
        </p>
        <h1 className="mt-2 font-serif text-3xl sm:text-5xl font-bold leading-[1.12] tracking-tight text-neutral-950 [text-wrap:balance]">
          Editorial Policy, Disclaimer &amp; Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-neutral-600 tabular-nums">
          Publisher: NEWS WORLD · CEO &amp; Editor-in-Chief: Muhammad Nadeem Faisal ·
          Effective Date: November 18, 2026
        </p>
      </header>

      <div className="mt-8 space-y-12 text-base text-neutral-800 leading-[1.8]">
        {/* SECTION A: EDITORIAL POLICY & DISCLAIMER */}
        <section aria-labelledby="section-editorial-policy">
          <div className="pb-3 border-b border-neutral-950 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-red-800">
              Section A
            </p>
            <h2
              id="section-editorial-policy"
              className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-neutral-950"
            >
              Editorial Policy &amp; Disclaimer
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-950 mb-1.5">
                1. Institutional Perspective
              </h3>
              <p>
                NEWS WORLD ({SITE_CONFIG.baseUrl}) operates under the editorial policies
                and guiding principles of a specific political and ideological
                background. Our coverage, editorial commentary, and analytical framing
                reflect this institutional perspective while remaining dedicated to public
                awareness.
              </p>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-950 mb-1.5">
                2. Advance Apology &amp; Respect
              </h3>
              <p>
                We deeply value human dignity and respectful civic discourse. If any
                individual, community, or group feels hurt or offended by our specific
                institutional policy, editorial analysis, or perspective, we offer our
                sincere advance apology. Our intention is always constructive public
                awareness and peaceful dialogue—never personal harm or malice.
              </p>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-950 mb-1.5">
                3. Reality of News &amp; Events
              </h3>
              <p>
                Due to the evolving and complex nature of global and regional events, news
                reports and analytical articles published on NEWS WORLD may sometimes
                differ from individual expectations or interpretations. While we strive to
                verify every fact before publication, we warmly invite readers to submit
                complaints, factual corrections, or constructive guidance directly to the
                Editor at{' '}
                <a
                  href={`mailto:${SITE_CONFIG.editorDirectEmail}`}
                  className="font-mono text-sm text-red-800 hover:text-red-950 underline underline-offset-4"
                >
                  {SITE_CONFIG.editorDirectEmail}
                </a>{' '}
                or through our Contact Editor desk.
              </p>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-950 mb-1.5">
                4. Zero Tolerance for Crime, Injustice &amp; Aggression
              </h3>
              <p>
                NEWS WORLD reiterates its unequivocal editorial stance against all forms
                of oppression, crime, global and international corruption, injustice,
                aggression, and war. We do not endorse or promote unlawful violence,
                hateful incitement, or corrupt practices anywhere in the world, and our
                publication remains dedicated to truth, honesty, justice, and global
                peace.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION B: GOOGLE ADSENSE PRIVACY POLICY */}
        <section
          aria-labelledby="section-privacy-policy"
          className="pt-8 border-t border-neutral-200"
        >
          <div className="pb-3 border-b border-neutral-950 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-red-800">
              Section B
            </p>
            <h2
              id="section-privacy-policy"
              className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-neutral-950"
            >
              Privacy Policy &amp; Google AdSense Disclosure
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-950 mb-1.5">
                1. Information We Collect, Server Logs &amp; Cookies
              </h3>
              <p>
                Like most standard news publications, NEWS WORLD ({SITE_CONFIG.domain})
                collects basic, non-personally-identifying technical information through
                standard web server log files—such as internet protocol (IP) addresses,
                browser type, Internet Service Provider (ISP), referring/exit pages, and
                date/time stamps—to maintain platform security, prevent abuse, and
                understand aggregate readership trends.
              </p>
              <p className="mt-3">
                We also use essential browser storage and cookies to remember your saved
                reading list and preferences, and anonymized analytics to improve reading
                performance across desktop and mobile devices. If you voluntarily submit
                your email address to subscribe to our newsletter or contact our editorial
                desks, that information is used strictly to fulfill your request.
              </p>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-950 mb-1.5">
                2. Google AdSense, DoubleClick Cookie &amp; Third-Party Vendors
              </h3>
              <p>
                NEWS WORLD participates in advertising programs, including{' '}
                <strong className="font-semibold text-neutral-950">Google AdSense</strong>
                , to support independent journalism. In accordance with Google AdSense
                program policies, please note the following disclosures:
              </p>
              <ul className="mt-3 space-y-2.5 list-disc pl-6 text-neutral-700">
                <li>
                  Third-party vendors, including Google, use cookies (such as the
                  DoubleClick / AdSense cookie) to serve ads based on a user’s prior
                  visits to{' '}
                  <span className="font-medium text-neutral-950">
                    {SITE_CONFIG.domain}
                  </span>{' '}
                  or other websites on the Internet.
                </li>
                <li>
                  Google’s use of advertising cookies enables it and its partners to serve
                  advertisements to our visitors based on their visit to NEWS WORLD and/or
                  other sites across the web.
                </li>
                <li>
                  Users may opt out of personalized advertising at any time by visiting{' '}
                  <a
                    href="https://www.google.com/settings/ads"
                    target="_blank"
                    rel="noreferrer"
                    className="text-red-800 hover:text-red-950 underline underline-offset-4"
                  >
                    Google Ads Settings
                  </a>
                  . Alternatively, visitors can opt out of a third-party vendor’s use of
                  cookies for personalized advertising by visiting{' '}
                  <a
                    href="https://www.aboutads.info/choices/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-red-800 hover:text-red-950 underline underline-offset-4"
                  >
                    www.aboutads.info/choices
                  </a>
                  .
                </li>
              </ul>
              <p className="mt-3">
                You may also disable cookies directly through your individual web browser
                settings. NEWS WORLD has no direct access to or control over cookies that
                may be placed by third-party advertising networks.
              </p>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-950 mb-1.5">
                3. Children’s Information &amp; Reader Consent
              </h3>
              <p>
                NEWS WORLD does not knowingly collect any personally identifiable
                information from children under the age of 13. By using{' '}
                <span className="font-medium text-neutral-950">
                  {SITE_CONFIG.domain}
                </span>
                , you hereby consent to our Privacy Policy and agree to our Editorial
                Policy and Disclaimer.
              </p>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-950 mb-1.5">
                4. Reader Rights &amp; Contact Information
              </h3>
              <p>
                If you have questions regarding this Privacy Policy, wish to request the
                deletion of email correspondence, or need to submit a complaint or
                editorial correction, please reach out directly to our Editor-in-Chief or
                official newsroom desks:
              </p>

              <div className="mt-5 p-6 bg-neutral-50 border border-neutral-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-red-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Privacy &amp; Editorial Correspondence</span>
                  </p>
                  <p className="text-sm font-semibold text-neutral-950">
                    CEO &amp; Editor-in-Chief: Muhammad Nadeem Faisal
                  </p>
                  <p className="text-xs text-neutral-600">
                    Direct Email:{' '}
                    <a
                      href={`mailto:${SITE_CONFIG.editorDirectEmail}`}
                      className="font-mono text-red-800 hover:underline"
                    >
                      {SITE_CONFIG.editorDirectEmail}
                    </a>{' '}
                    · Newsroom:{' '}
                    <a
                      href="mailto:editor@newsworld.life"
                      className="font-mono text-neutral-800 hover:underline"
                    >
                      editor@newsworld.life
                    </a>
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => onContactEditor(SITE_CONFIG.editorDirectEmail)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Contact Editor</span>
                  </button>
                </div>
              </div>

              <p className="mt-4 text-xs text-neutral-500">
                Learn more about our leadership and editorial mission on our{' '}
                <button
                  type="button"
                  onClick={onNavigateAbout}
                  className="text-red-800 hover:text-red-950 underline underline-offset-4 cursor-pointer"
                >
                  About Us
                </button>{' '}
                page.
              </p>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
