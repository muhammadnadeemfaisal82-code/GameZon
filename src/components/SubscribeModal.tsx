import { useEffect, useState, type FormEvent } from 'react';
import { Check, X } from 'lucide-react';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
}

export function SubscribeModal({ isOpen, onClose, onSubscribed }: SubscribeModalProps) {
  const [email, setEmail] = useState('');
  const [cadence, setCadence] = useState<'daily' | 'weekly'>('daily');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sentViaSmtp, setSentViaSmtp] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, cadence }),
      });
      const data = (await response.json()) as {
        error?: string;
        sentViaSmtp?: boolean;
      };
      if (!response.ok) {
        setError(data.error || 'Unable to register subscription.');
        setSubmitting(false);
        return;
      }
      setSentViaSmtp(Boolean(data.sentViaSmtp));
      setSubmitted(true);
      onSubscribed?.();
    } catch {
      setError('Network error while connecting to newsworld.life.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setSentViaSmtp(false);
    setEmail('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-modal-title"
      onClick={handleResetAndClose}
    >
      <div
        className="w-full max-w-md bg-white border border-neutral-200 rounded-lg shadow-xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
              NEWS WORLD · newsworld.life
            </p>
            <h2
              id="subscribe-modal-title"
              className="mt-1 font-serif text-2xl font-bold text-neutral-950"
            >
              Stay Informed Without the Noise
            </h2>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-950 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close subscription dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="mt-6 py-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 mb-3">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-neutral-950">
              Subscription Confirmed
            </h3>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
              Your {cadence === 'daily' ? 'Daily Morning' : 'Weekly Digest'} edition of{' '}
              <span className="font-semibold text-neutral-900">NEWS WORLD</span> is
              registered for <span className="font-medium text-neutral-900">{email}</span>.
              {sentViaSmtp
                ? ' A welcome confirmation has been sent from our Zoho Mail desk.'
                : ' Managed by contact@newsworld.life.'}
            </p>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="mt-6 w-full py-2.5 px-4 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
            >
              Return to Front Page
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Receive our editors’ curated summary of global reporting across world
              affairs, markets, technology, science, and culture.
            </p>

            <div>
              <span className="block text-xs font-medium text-neutral-700 mb-2">
                Edition Frequency
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setCadence('daily')}
                  className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors cursor-pointer whitespace-nowrap ${
                    cadence === 'daily'
                      ? 'bg-white text-neutral-950 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  Daily Morning
                </button>
                <button
                  type="button"
                  onClick={() => setCadence('weekly')}
                  className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors cursor-pointer whitespace-nowrap ${
                    cadence === 'weekly'
                      ? 'bg-white text-neutral-950 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  Weekly Digest
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="subscribe-email"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="subscribe-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="reader@example.com"
                className="w-full px-3.5 py-2.5 text-sm text-neutral-950 bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent"
                required
              />
              {error && (
                <p className="mt-1.5 text-xs text-red-700" role="alert">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
            >
              {submitting ? 'Registering...' : 'Join NEWS WORLD'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
