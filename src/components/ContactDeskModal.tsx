import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Mail, Send, X } from 'lucide-react';
import { EDITORIAL_DESKS, SITE_CONFIG } from '../config';

interface ContactDeskModalProps {
  isOpen: boolean;
  initialDeskEmail?: string;
  onClose: () => void;
}

export function ContactDeskModal({
  isOpen,
  initialDeskEmail,
  onClose,
}: ContactDeskModalProps) {
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

  useEffect(() => {
    if (initialDeskEmail) {
      setSelectedDesk(initialDeskEmail);
    }
  }, [initialDeskEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
        setError(data.error || 'Unable to route message.');
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
      setError('Network error while connecting to Zoho Mail desk.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-[2px] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-desk-modal-title"
      onClick={onClose}
    >
      <div className="min-h-full px-4 py-6 sm:py-10 flex justify-center items-start">
        <div
          className="w-full max-w-3xl bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 sm:px-8 py-5 border-b border-neutral-200 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
                {SITE_CONFIG.domain} · Connected Zoho Mail Desks
              </p>
              <h2
                id="contact-desk-modal-title"
                className="mt-1 font-serif text-2xl font-bold text-neutral-950"
              >
                Editorial &amp; Office Directory
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-500 hover:text-neutral-950 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Close contact directory"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Official Email Desks */}
            <div className="md:col-span-5 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                Select Office
              </p>
              {EDITORIAL_DESKS.map((desk) => {
                const isSelected = desk.email === selectedDesk;
                return (
                  <div
                    key={desk.id}
                    className={`p-3.5 rounded-md border transition-colors ${
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
                      <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                        {desk.role}
                      </p>
                    </button>

                    <div className="mt-2.5 pt-2 border-t border-neutral-200/80 flex items-center gap-3 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleCopy(desk.email)}
                        className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-950 cursor-pointer"
                      >
                        {copiedEmail === desk.email ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-700" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <a
                        href={`mailto:${desk.email}`}
                        className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-950"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Open Mail</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Direct Dispatch Form */}
            <div className="md:col-span-7">
              <div className="pb-3 border-b border-neutral-200 mb-4">
                <p className="text-xs text-neutral-500">Sending directly to</p>
                <p className="text-sm font-semibold text-neutral-950">
                  {activeDeskObj.name}{' '}
                  <span className="font-mono text-xs text-red-800">
                    ({activeDeskObj.email})
                  </span>
                </p>
              </div>

              {sentInfo ? (
                <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-md space-y-3">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 text-emerald-700">
                    <Check className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-neutral-950">
                    Message Dispatched
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Your inquiry has been routed to{' '}
                    <span className="font-mono font-medium text-neutral-900">
                      {sentInfo.deskEmail}
                    </span>
                    .{' '}
                    {sentInfo.sentViaSmtp
                      ? 'Delivered live via Zoho Mail SMTP.'
                      : 'Recorded in the newsroom dispatch queue; you may also send directly via your mail app.'}
                  </p>
                  <div className="flex items-center gap-3 pt-2">
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
                      Open in Zoho / Mail App
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="block text-xs font-medium text-neutral-700 mb-1"
                      >
                        Your Name
                      </label>
                      <input
                        id="contact-name"
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
                        htmlFor="contact-email"
                        className="block text-xs font-medium text-neutral-700 mb-1"
                      >
                        Your Email
                      </label>
                      <input
                        id="contact-email"
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
                      htmlFor="contact-subject"
                      className="block text-xs font-medium text-neutral-700 mb-1"
                    >
                      Subject
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="News tip, press inquiry, or correction..."
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-xs font-medium text-neutral-700 mb-1"
                    >
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your message to the selected NEWS WORLD office..."
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
                        ? 'Dispatching...'
                        : `Send to ${activeDeskObj.email}`}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
