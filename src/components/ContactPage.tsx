import { useState, type FormEvent } from 'react';
import { Check, Copy, Mail, Send } from 'lucide-react';
import { EDITORIAL_DESKS, SITE_CONFIG } from '../config';

interface ContactPageProps {
  initialDeskEmail?: string;
  onNavigateAbout: () => void;
  onNavigatePolicy: () => void;
}

export function ContactPage({
  initialDeskEmail,
  onNavigateAbout,
  onNavigatePolicy,
}: ContactPageProps) {
  const [selectedDesk, setSelectedDesk] = useState(
    initialDeskEmail || EDITORIAL_DESKS[0].email,
  );
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sentInfo, setSentInfo] = useState<{
    deskEmail: string;
    sentViaSmtp: boolean;
  } | null>(null);

  const activeDeskObj =
    EDITORIAL_DESKS.find((d) => d.email === selectedDesk) || EDITORIAL_DESKS[0];

  const handleCopy = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      window.setTimeout(() => setCopiedEmail(null), 1800);
    } catch {
      setCopiedEmail(email);
      window.setTimeout(() => setCopiedEmail(null), 1800);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSentInfo(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDesk: selectedDesk,
          senderName,
          senderEmail,
          subject,
          message,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        sentViaSmtp?: boolean;
      };
      if (!response.ok) {
        setError(data.error || 'Unable to send message.');
        setSubmitting(false);
        return;
      }

      setSentInfo({
        deskEmail: selectedDesk,
        sentViaSmtp: Boolean(data.sentViaSmtp),
      });
      setSenderName('');
      setSenderEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setError('Network error while connecting to NEWS WORLD desk.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="max-w-4xl mx-auto py-4 sm:py-8">
      <header className="pb-8 border-b border-neutral-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
          Contact Us · {SITE_CONFIG.domain}
        </p>
        <h1 className="mt-2 font-serif text-3xl sm:text-5xl font-bold leading-[1.12] tracking-tight text-neutral-950 [text-wrap:balance]">
          Contact the Editor &amp; Editorial Offices
        </h1>
        <p className="mt-4 text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl">
          Readers are warmly invited to reach out to CEO &amp; Editor-in-Chief{' '}
          <strong className="font-semibold text-neutral-950">
            Muhammad Nadeem Faisal
          </strong>{' '}
          at{' '}
          <a
            href={`mailto:${SITE_CONFIG.editorDirectEmail}`}
            className="font-mono text-sm text-red-800 hover:underline"
          >
            {SITE_CONFIG.editorDirectEmail}
          </a>{' '}
          or select any official {SITE_CONFIG.domain} desk below for feedback,
          corrections, press inquiries, or privacy correspondence.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">
        {/* Official Desks Directory */}
        <div className="md:col-span-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950 mb-3">
            Select Editorial Office
          </h2>
          {EDITORIAL_DESKS.map((desk) => {
            const isSelected = desk.email === selectedDesk;
            return (
              <div
                key={desk.id}
                className={`p-4 rounded-md border transition-colors ${
                  isSelected
                    ? 'border-neutral-950 bg-neutral-50'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDesk(desk.email);
                    setSentInfo(null);
                  }}
                  className="w-full text-left cursor-pointer"
                >
                  <p className="text-xs font-semibold text-neutral-950">
                    {desk.name}
                  </p>
                  <p className="text-xs font-mono text-red-800 mt-0.5 truncate">
                    {desk.email}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1.5 leading-snug">
                    {desk.role}
                  </p>
                </button>

                <div className="mt-3 pt-2.5 border-t border-neutral-200/80 flex items-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopy(desk.email)}
                    className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-950 cursor-pointer"
                  >
                    {copiedEmail === desk.email ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`mailto:${desk.email}`}
                    className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-950"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open Mail</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Form */}
        <div className="md:col-span-7">
          <div className="p-6 sm:p-8 border border-neutral-200 rounded-lg bg-white">
            <div className="pb-4 border-b border-neutral-200 mb-5">
              <p className="text-xs text-neutral-500">Direct Correspondence To</p>
              <p className="text-base font-semibold text-neutral-950 mt-0.5">
                {activeDeskObj.name}{' '}
                <span className="font-mono text-xs text-red-800">
                  ({activeDeskObj.email})
                </span>
              </p>
            </div>

            {sentInfo ? (
              <div className="py-4 space-y-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-700">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-neutral-950">
                  Message Recorded &amp; Dispatched
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Your inquiry has been routed to{' '}
                  <span className="font-mono font-medium text-neutral-900">
                    {sentInfo.deskEmail}
                  </span>
                  .{' '}
                  {sentInfo.sentViaSmtp
                    ? 'Delivered live via Zoho Mail SMTP.'
                    : 'Saved in the newsroom inbox queue; you may also write directly via your mail application.'}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSentInfo(null)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>
                  <a
                    href={`mailto:${sentInfo.deskEmail}`}
                    className="px-4 py-2 text-xs font-medium text-neutral-700 border border-neutral-300 hover:border-neutral-500 rounded-md transition-colors"
                  >
                    Email Directly
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="page-contact-name"
                      className="block text-xs font-medium text-neutral-700 mb-1"
                    >
                      Your Name
                    </label>
                    <input
                      id="page-contact-name"
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="page-contact-email"
                      className="block text-xs font-medium text-neutral-700 mb-1"
                    >
                      Your Email
                    </label>
                    <input
                      id="page-contact-email"
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="page-contact-subject"
                    className="block text-xs font-medium text-neutral-700 mb-1"
                  >
                    Subject
                  </label>
                  <input
                    id="page-contact-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Editorial guidance, correction, complaint, or inquiry..."
                    className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="page-contact-message"
                    className="block text-xs font-medium text-neutral-700 mb-1"
                  >
                    Message
                  </label>
                  <textarea
                    id="page-contact-message"
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message to NEWS WORLD..."
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950 leading-relaxed"
                    required
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-700" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submitting
                      ? 'Sending...'
                      : `Send to ${activeDeskObj.email}`}
                  </span>
                </button>
              </form>
            )}
          </div>

          <p className="mt-4 text-xs text-neutral-500 leading-relaxed">
            Learn more on our{' '}
            <button
              type="button"
              onClick={onNavigateAbout}
              className="text-red-800 hover:underline cursor-pointer"
            >
              About Us
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={onNavigatePolicy}
              className="text-red-800 hover:underline cursor-pointer"
            >
              Editorial Policy &amp; Privacy Policy
            </button>{' '}
            pages.
          </p>
        </div>
      </div>
    </article>
  );
}
