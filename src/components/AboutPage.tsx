import { ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import { EDITORIAL_DESKS, SITE_CONFIG } from '../config';

interface AboutPageProps {
  onNavigateHome: () => void;
  onNavigatePolicy: () => void;
  onOpenSubscribe: () => void;
  onContactEditor: (email?: string) => void;
}

export function AboutPage({
  onNavigateHome,
  onNavigatePolicy,
  onOpenSubscribe,
  onContactEditor,
}: AboutPageProps) {
  return (
    <article className="max-w-3xl mx-auto py-4 sm:py-8">
      <header className="pb-8 border-b border-neutral-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
          About Us · {SITE_CONFIG.domain}
        </p>
        <h1 className="mt-2 font-serif text-3xl sm:text-5xl font-bold leading-[1.12] tracking-tight text-neutral-950 [text-wrap:balance]">
          Independent Journalism Rooted in Truth, Honesty &amp; Justice
        </h1>
        <p className="mt-4 text-base sm:text-lg text-neutral-600 leading-relaxed">
          NEWS WORLD ({SITE_CONFIG.baseUrl}) is an independent editorial and global news
          platform led by CEO &amp; Editor-in-Chief{' '}
          <strong className="font-semibold text-neutral-950">
            Muhammad Nadeem Faisal
          </strong>
          .
        </p>
      </header>

      <div className="mt-8 space-y-10 text-base text-neutral-800 leading-[1.8]">
        {/* Welcome & Appreciation */}
        <section aria-labelledby="about-welcome">
          <h2
            id="about-welcome"
            className="font-serif text-2xl font-bold text-neutral-950 mb-3"
          >
            Welcome &amp; Appreciation
          </h2>
          <p className="first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none first-letter:text-neutral-950">
            We extend our warmest gratitude to every reader visiting NEWS WORLD. Your
            attention, trust, and engagement give purpose to independent journalism. We
            sincerely invite you to subscribe to our editions and continuously support
            principled, independent writing and reporting.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onOpenSubscribe}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
            >
              <span>Subscribe to NEWS WORLD</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs sm:text-sm font-medium text-neutral-700 hover:text-red-800 underline underline-offset-4 transition-colors cursor-pointer"
            >
              Browse Latest Dispatches
            </button>
          </div>
        </section>

        {/* Leadership & Vision */}
        <section
          aria-labelledby="about-leadership"
          className="pt-8 border-t border-neutral-200"
        >
          <h2
            id="about-leadership"
            className="font-serif text-2xl font-bold text-neutral-950 mb-3"
          >
            Leadership &amp; Institutional Vision
          </h2>
          <p>
            Operating under the leadership of CEO &amp; Editor-in-Chief{' '}
            <strong className="font-semibold text-neutral-950">
              Muhammad Nadeem Faisal
            </strong>
            , NEWS WORLD serves as a dedicated platform for international reporting,
            civic reflection, and analytical commentary. Our editorial desk is structured
            to deliver clear, responsible journalism across world affairs, business,
            technology, science, and culture.
          </p>
        </section>

        {/* Commitment to Truth & Peace */}
        <section
          aria-labelledby="about-mission"
          className="pt-8 border-t border-neutral-200"
        >
          <h2
            id="about-mission"
            className="font-serif text-2xl font-bold text-neutral-950 mb-3"
          >
            Commitment to Truth, Justice &amp; Global Peace
          </h2>
          <p>
            Our core mission is to promote public awareness founded on truth, honesty,
            and justice—<em className="font-serif text-neutral-950">“Haq, Sidq, aur Insaf.”</em>{' '}
            We maintain a firm, unwavering stance against all forms of oppression,
            tyranny, crime, global and international corruption, injustice, aggression,
            and war.
          </p>
          <p className="mt-4">
            Every report and analytical essay published on NEWS WORLD strives
            wholeheartedly to encourage constructive dialogue, human dignity, and
            lasting global peace.
          </p>
        </section>

        {/* Authentic & Verified Content */}
        <section
          aria-labelledby="about-verification"
          className="pt-8 border-t border-neutral-200"
        >
          <h2
            id="about-verification"
            className="font-serif text-2xl font-bold text-neutral-950 mb-3"
          >
            Authentic &amp; Verified Content
          </h2>
          <p>
            We reaffirm our editorial commitment to publishing verified information and
            authentic analytical writings. Sources, datelines, and factual claims are
            reviewed carefully before publication, and any verified correction is
            addressed promptly and transparently.
          </p>
          <p className="mt-3 text-sm text-neutral-600">
            For full details on our editorial standards, institutional stance, and data
            privacy practices, please review our{' '}
            <button
              type="button"
              onClick={onNavigatePolicy}
              className="font-medium text-red-800 hover:text-red-950 underline underline-offset-4 cursor-pointer"
            >
              Editorial Policy, Disclaimer &amp; Privacy Policy
            </button>
            .
          </p>
        </section>

        {/* Reader Guidance & Direct Contact */}
        <section
          aria-labelledby="about-contact"
          className="pt-8 border-t border-neutral-200"
        >
          <h2
            id="about-contact"
            className="font-serif text-2xl font-bold text-neutral-950 mb-3"
          >
            Reader Guidance &amp; Direct Editorial Contact
          </h2>
          <p>
            Our readers are essential partners in upholding accuracy and integrity. You
            are warmly invited to guide, correct, or contact the Editor directly whenever
            you wish to share constructive feedback, submit news leads, or report
            concerns.
          </p>

          <div className="mt-6 p-6 bg-neutral-50 border border-neutral-200 rounded-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
                  Direct Editor-in-Chief Correspondence
                </p>
                <p className="mt-1 font-serif text-lg font-semibold text-neutral-950">
                  Muhammad Nadeem Faisal
                </p>
                <a
                  href={`mailto:${SITE_CONFIG.editorDirectEmail}`}
                  className="text-sm font-mono text-neutral-800 hover:text-red-800 underline underline-offset-4"
                >
                  {SITE_CONFIG.editorDirectEmail}
                </a>
              </div>

              <button
                type="button"
                onClick={() => onContactEditor(SITE_CONFIG.editorDirectEmail)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer shrink-0"
              >
                <Mail className="w-4 h-4" />
                <span>Contact Editor</span>
              </button>
            </div>

            <div className="pt-4 border-t border-neutral-200">
              <p className="text-xs font-semibold text-neutral-700 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-red-800" />
                <span>Official {SITE_CONFIG.domain} Bureaus &amp; Desks</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-600">
                {EDITORIAL_DESKS.filter((d) => d.id !== 'editor-direct').map(
                  (desk) => (
                    <button
                      key={desk.id}
                      type="button"
                      onClick={() => onContactEditor(desk.email)}
                      className="text-left hover:text-neutral-950 transition-colors cursor-pointer"
                    >
                      <span className="font-medium text-neutral-900">
                        {desk.name}:
                      </span>{' '}
                      <span className="font-mono text-red-800">{desk.email}</span>
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
