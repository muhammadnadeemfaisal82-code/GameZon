import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { SITE_CONFIG } from '../config';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export function StickyAnchorAd() {
  const [dismissed, setDismissed] = useState(false);
  const pushedRef = useRef(false);

  const clientId = SITE_CONFIG.adsenseClientId.trim();
  const slotId = SITE_CONFIG.adsenseAnchorSlotId.trim();
  const isSlotConfigured =
    Boolean(clientId) &&
    Boolean(slotId) &&
    !clientId.includes('XXXX') &&
    !slotId.includes('XXXX');

  useEffect(() => {
    if (dismissed || !isSlotConfigured || pushedRef.current) return;
    pushedRef.current = true;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Ignore AdSense initialization errors in local/preview environments
    }
  }, [dismissed, isSlotConfigured]);

  if (dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Advertisement"
      className="fixed bottom-0 left-0 right-0 z-40 h-[58px] md:h-[90px] bg-white/95 backdrop-blur-sm border-t border-neutral-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
    >
      <div className="relative max-w-5xl mx-auto h-full px-3 sm:px-6 flex flex-col justify-center">
        {/* Subtle Advertisement label & top-right dismiss button (Better Ads Standards) */}
        <span className="absolute top-1 left-3 sm:left-6 text-[9px] font-medium uppercase tracking-[0.12em] text-neutral-400 leading-none select-none pointer-events-none">
          Advertisement
        </span>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Close advertisement"
          title="Close advertisement"
          className="absolute top-1 right-2 sm:right-3 z-10 inline-flex items-center justify-center w-6 h-6 rounded-full text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* AdSense <ins class="adsbygoogle"> container */}
        <div className="w-full max-w-[728px] mx-auto pt-3 pb-1 px-7 flex items-center justify-center">
          <div
            className={`relative w-full h-[40px] md:h-[68px] flex items-center justify-center overflow-hidden rounded ${
              isSlotConfigured
                ? ''
                : 'border border-dashed border-neutral-300 bg-neutral-50/90'
            }`}
          >
            <ins
              className="adsbygoogle block w-full h-full text-center"
              data-ad-client={clientId || undefined}
              data-ad-slot={isSlotConfigured ? slotId : undefined}
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
            {!isSlotConfigured && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 px-3 text-center pointer-events-none">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                  AdSense Sticky Anchor
                </span>
                <span
                  className="hidden sm:inline text-neutral-300"
                  aria-hidden="true"
                >
                  ·
                </span>
                <span className="hidden sm:inline text-[11px] text-neutral-500 font-mono truncate">
                  {clientId || 'ca-pub-XXXXXXXX'} · Paste adsenseAnchorSlotId in src/config.ts
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
