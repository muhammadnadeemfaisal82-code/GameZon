import { useEffect, useState } from 'react';
import { Bookmark, Check, Share2, X } from 'lucide-react';
import { SITE_CONFIG, type Article } from '../config';
import { EditorialImage } from './EditorialImage';

interface ArticleModalProps {
  article: Article | null;
  allArticles: Article[];
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onSelectArticle: (article: Article) => void;
  onClose: () => void;
}

export function ArticleModal({
  article,
  allArticles,
  isBookmarked,
  onToggleBookmark,
  onSelectArticle,
  onClose,
}: ArticleModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!article) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    // Dynamic NewsArticle JSON-LD & page title for SEO / search indexing
    const prevTitle = document.title;
    document.title = `${article.title} — ${SITE_CONFIG.brandName}`;

    const ldScript = document.createElement('script');
    ldScript.type = 'application/ld+json';
    ldScript.id = 'active-news-article-jsonld';
    ldScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title,
      description: article.deck,
      datePublished: article.isoDate,
      dateModified: article.isoDate,
      articleSection: article.category,
      keywords: article.keywords.join(', '),
      author: {
        '@type': 'Person',
        name: article.author,
      },
      publisher: {
        '@type': 'NewsMediaOrganization',
        name: SITE_CONFIG.brandName,
        url: `${SITE_CONFIG.baseUrl}/`,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${SITE_CONFIG.baseUrl}/article/${encodeURIComponent(article.id)}`,
      },
      ...(article.imageUrl
        ? {
            image: [
              article.imageUrl.startsWith('http')
                ? article.imageUrl
                : `${SITE_CONFIG.baseUrl}${article.imageUrl}`,
            ],
          }
        : {}),
    });
    document.head.appendChild(ldScript);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      document.title = prevTitle;
      const existing = document.getElementById('active-news-article-jsonld');
      if (existing) existing.remove();
    };
  }, [article, onClose]);

  useEffect(() => {
    setCopied(false);
  }, [article?.id]);

  if (!article) return null;

  const isUrduArticle = /[\u0600-\u06FF]/.test(
    `${article.title} ${article.body[0] || ''}`,
  );

  const relatedArticles = allArticles
    .filter((item) => item.id !== article.id)
    .sort((a, b) =>
      a.category === article.category && b.category !== article.category ? -1 : 1,
    )
    .slice(0, 3);

  const canonicalArticleUrl = `${SITE_CONFIG.baseUrl}/article/${encodeURIComponent(
    article.id,
  )}`;

  const handleShare = async () => {
    const shareText = `${article.title} — ${SITE_CONFIG.brandName}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${canonicalArticleUrl}`);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-[2px] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-modal-title"
      onClick={onClose}
    >
      <div className="min-h-full px-4 py-6 sm:py-10 flex justify-center items-start">
        <article
          className="w-full max-w-4xl bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Reader Utility Bar */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-neutral-200 px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-500 min-w-0 truncate">
              <span className="font-semibold text-red-800">{article.category}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{article.location}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums shrink-0">{article.readTime}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onToggleBookmark(article.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                  isBookmarked
                    ? 'bg-neutral-950 text-white border-neutral-950'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                }`}
                aria-pressed={isBookmarked}
              >
                <Bookmark
                  className="w-3.5 h-3.5"
                  fill={isBookmarked ? 'currentColor' : 'none'}
                />
                <span>{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 transition-colors duration-150 cursor-pointer whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Copied Link</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-500 hover:text-neutral-950 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close article"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Editorial Content */}
          <div className="px-6 sm:px-10 py-8 sm:py-12">
            <header
              className="max-w-2xl mx-auto"
              dir={isUrduArticle ? 'rtl' : 'ltr'}
            >
              <h1
                id="article-modal-title"
                className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-bold leading-[1.25] tracking-tight text-neutral-950 [text-wrap:balance]"
              >
                {article.title}
              </h1>

              <p className="mt-4 text-lg text-neutral-600 leading-relaxed">
                {article.deck}
              </p>

              <div className="mt-6 pt-5 border-t border-neutral-200 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                <span className="font-medium text-neutral-900">
                  By {article.author}
                </span>
                <span aria-hidden="true">·</span>
                <span>{article.location}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Published {article.publishedAt}</span>
                {article.keywords.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-neutral-400 truncate">
                      {article.keywords.slice(0, 3).join(', ')}
                    </span>
                  </>
                )}
              </div>
            </header>

            {article.imageUrl && (
              <figure className="max-w-3xl mx-auto mt-8">
                <EditorialImage
                  src={article.imageUrl}
                  alt={article.title}
                  aspectClassName="aspect-[16/9]"
                  className="rounded-md border border-neutral-200"
                />
                {article.imageCaption && (
                  <figcaption
                    dir="auto"
                    className="mt-2.5 text-xs font-serif italic text-neutral-500"
                  >
                    {article.imageCaption}
                  </figcaption>
                )}
              </figure>
            )}

            <div
              dir={isUrduArticle ? 'rtl' : 'ltr'}
              className="max-w-2xl mx-auto mt-8 space-y-6 text-base sm:text-[1.0625rem] text-neutral-800 leading-[1.9]"
            >
              {article.body.map((paragraph, index) => (
                <div key={index}>
                  <p
                    className={
                      !isUrduArticle && index === 0
                        ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none first-letter:text-neutral-950'
                        : undefined
                    }
                  >
                    {paragraph}
                  </p>

                  {index === 1 && article.pullQuote && (
                    <blockquote className="my-8 py-6 border-y border-neutral-200 text-center">
                      <p className="font-serif italic text-xl sm:text-2xl text-neutral-900 leading-snug max-w-xl mx-auto">
                        “{article.pullQuote}”
                      </p>
                    </blockquote>
                  )}
                </div>
              ))}
            </div>

            {/* Related Dispatches */}
            <section
              className="max-w-3xl mx-auto mt-14 pt-8 border-t border-neutral-200"
              aria-label="More from NEWS WORLD"
            >
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-5">
                Continue Reading
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {relatedArticles.map((related) => (
                  <button
                    key={related.id}
                    type="button"
                    onClick={() => onSelectArticle(related)}
                    className="text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-sm"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1.5">
                      <span className="font-medium text-red-800">
                        {related.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{related.readTime}</span>
                    </div>
                    <h3 className="font-serif text-base font-semibold text-neutral-950 group-hover:text-red-800 transition-colors leading-snug">
                      {related.title}
                    </h3>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
