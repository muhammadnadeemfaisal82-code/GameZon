import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ImagePlus,
  LogIn,
  LogOut,
  Rss,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { CATEGORIES, SITE_CONFIG, type Article, type Category } from '../config';
import {
  AUTHORIZED_EDITOR_EMAILS,
  FIREBASE_PROJECT_ID,
  formatReadableFirestoreError,
} from '../firebase';
import { downloadProjectZip } from '../utils/downloadSource';
import { compressImageFile } from '../utils/imageUpload';

interface AutoFillResponse {
  language?: 'ur' | 'en';
  title?: string;
  deck?: string;
  category?: Category;
  location?: string;
  author?: string;
  keywords?: string[];
  slug?: string;
  pullQuote?: string;
  socialCaption?: string;
  socialHashtags?: string[];
  error?: string;
}

interface DirectPostPageProps {
  articles: Article[];
  authUser: User | null;
  authReady: boolean;
  isEditorAuthorized: boolean;
  onSignInEditor: () => Promise<void>;
  onSignOutEditor: () => Promise<void>;
  onBackHome: () => void;
  onOpenSyndication: () => void;
  onPublishArticle: (payload: {
    slug?: string;
    title: string;
    category: Category;
    author: string;
    location: string;
    deck: string;
    keywords: string;
    imageUrl: string;
    imageCaption: string;
    pullQuote: string;
    content: string;
  }) => Promise<{ article: Article; syncedToServer: boolean }>;
  onDeleteArticle: (id: string) => Promise<void>;
  onPreviewArticle: (article: Article) => void;
}

function normalizeSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function DirectPostPage({
  articles,
  authUser,
  authReady,
  isEditorAuthorized,
  onSignInEditor,
  onSignOutEditor,
  onBackHome,
  onOpenSyndication,
  onPublishArticle,
  onDeleteArticle,
  onPreviewArticle,
}: DirectPostPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<Category>('Editorial');
  const [author, setAuthor] = useState(
    'Muhammad Nadeem Faisal (CEO & Editor-in-Chief, NEWS WORLD)',
  );
  const [location, setLocation] = useState('Islamabad');
  const [deck, setDeck] = useState('');
  const [keywords, setKeywords] = useState('');
  const [pullQuote, setPullQuote] = useState('');

  const [socialCaption, setSocialCaption] = useState('');
  const [socialHashtags, setSocialHashtags] = useState<string[]>([]);
  const [publishedShareRecord, setPublishedShareRecord] = useState<{
    article: Article;
    caption: string;
    hashtags: string[];
  } | null>(null);
  const [copiedSocial, setCopiedSocial] = useState(false);

  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillMessage, setAutoFillMessage] = useState('');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handlePhotoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setProcessingPhoto(true);
    try {
      const compressed = await compressImageFile(file);
      setImageUrl(compressed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to process selected photo.',
      );
    } finally {
      setProcessingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSignIn = async () => {
    setError('');
    setAuthBusy(true);
    try {
      await onSignInEditor();
    } catch (err) {
      setError(formatReadableFirestoreError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setError('');
    setAuthBusy(true);
    try {
      await onSignOutEditor();
    } catch (err) {
      setError(formatReadableFirestoreError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAutoFill = async () => {
    setError('');
    setAutoFillMessage('');
    const cleanBody = content.trim();

    if (cleanBody.length < 30) {
      setError(
        'Please paste your full article text (at least 30 characters) before running Auto-Fill.',
      );
      return;
    }

    setAutoFilling(true);
    try {
      const response = await fetch('/api/ai/autofill-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleText: cleanBody }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          'AI Auto-Fill server endpoint is unavailable on this host.',
        );
      }

      const data = (await response.json()) as AutoFillResponse;
      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to generate metadata from the article.',
        );
      }

      if (data.title) setTitle(data.title);
      if (data.deck) setDeck(data.deck);
      if (data.category && CATEGORIES.includes(data.category)) {
        setCategory(data.category);
      }
      if (data.location) setLocation(data.location);
      if (data.author) setAuthor(data.author);
      if (Array.isArray(data.keywords) && data.keywords.length > 0) {
        setKeywords(data.keywords.join(', '));
      }
      if (data.slug) setSlug(normalizeSlugInput(data.slug));
      if (typeof data.pullQuote === 'string') setPullQuote(data.pullQuote);
      if (data.socialCaption) setSocialCaption(data.socialCaption);
      if (Array.isArray(data.socialHashtags)) {
        setSocialHashtags(data.socialHashtags);
      }

      setAutoFillMessage(
        'Metadata, URL slug, and Social Media Share Box generated without changing your original article text.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to auto-fill details from article.',
      );
    } finally {
      setAutoFilling(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setStatusMessage('');

    if (!authUser || !isEditorAuthorized) {
      setError(
        'Please sign in with an authorized NEWS WORLD editor Google account before publishing.',
      );
      return;
    }

    const cleanTitle = title.trim();
    const cleanDeck = deck.trim();
    const cleanBody = content.trim();
    const cleanSlug = normalizeSlugInput(slug).replace(/^-|-$/g, '');

    if (cleanBody.length < 10) {
      setError('Please paste or write your full article text.');
      return;
    }
    if (cleanTitle.length < 4 || cleanTitle.length > 240) {
      setError(
        'Headline must be 4–240 characters (click "Auto-Fill Details from Article" to generate automatically).',
      );
      return;
    }
    if (cleanDeck.length < 6 || cleanDeck.length > 600) {
      setError(
        'Summary/Excerpt must be 6–600 characters (click "Auto-Fill Details from Article" to generate automatically).',
      );
      return;
    }
    if (imageUrl.trim().length > 700000) {
      setError(
        'Photo payload is too large for Cloud Firestore. Please choose a smaller photo or Image URL.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await onPublishArticle({
        slug: cleanSlug || undefined,
        title: cleanTitle,
        category,
        author:
          author.trim() ||
          'Muhammad Nadeem Faisal (CEO & Editor-in-Chief, NEWS WORLD)',
        location: location.trim() || 'Global Desk',
        deck: cleanDeck,
        keywords,
        imageUrl: imageUrl.trim(),
        imageCaption: imageCaption.trim(),
        pullQuote: pullQuote.trim(),
        content: cleanBody,
      });

      const finalCaption =
        socialCaption.trim() ||
        `${result.article.title}\n\n${result.article.deck}`;
      const finalHashtags =
        socialHashtags.length > 0
          ? socialHashtags
          : [
              '#NewsWorld',
              `#${result.article.category.replace(/\s+/g, '')}`,
              ...result.article.keywords
                .slice(0, 3)
                .map((k) => `#${k.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '')}`)
                .filter((tag) => tag.length > 1),
            ];

      setPublishedShareRecord({
        article: result.article,
        caption: finalCaption,
        hashtags: finalHashtags,
      });
      setCopiedSocial(false);

      setContent('');
      setImageUrl('');
      setImageCaption('');
      setTitle('');
      setSlug('');
      setDeck('');
      setKeywords('');
      setPullQuote('');
      setSocialCaption('');
      setSocialHashtags([]);
      setAutoFillMessage('');

      setStatusMessage(
        `Published live to Cloud Firestore (${FIREBASE_PROJECT_ID}) at ${SITE_CONFIG.baseUrl}/article/${result.article.id}`,
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(formatReadableFirestoreError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setDeletingId(id);
    try {
      await onDeleteArticle(id);
    } catch (err) {
      setError(formatReadableFirestoreError(err));
    } finally {
      setDeletingId(null);
    }
  };

  // Build ready-to-copy social share box text (for published article or current draft preview)
  const shareBoxText = useMemo(() => {
    if (publishedShareRecord) {
      const liveUrl = `${SITE_CONFIG.baseUrl}/article/${publishedShareRecord.article.id}`;
      const tags = publishedShareRecord.hashtags.join(' ');
      return `${publishedShareRecord.caption}\n\n${tags ? `${tags}\n\n` : ''}Read full report on NEWS WORLD:\n${liveUrl}`;
    }
    if (socialCaption.trim() || title.trim()) {
      const cleanSlug =
        normalizeSlugInput(slug).replace(/^-|-$/g, '') || 'your-article-slug';
      const previewUrl = `${SITE_CONFIG.baseUrl}/article/${cleanSlug}`;
      const tags = socialHashtags.join(' ');
      const caption =
        socialCaption.trim() || `${title.trim()}\n\n${deck.trim()}`;
      return `${caption}\n\n${tags ? `${tags}\n\n` : ''}Read full report on NEWS WORLD:\n${previewUrl}`;
    }
    return '';
  }, [publishedShareRecord, socialCaption, socialHashtags, title, deck, slug]);

  const handleCopyShareBox = async () => {
    if (!shareBoxText) return;
    try {
      await navigator.clipboard.writeText(shareBoxText);
      setCopiedSocial(true);
      window.setTimeout(() => setCopiedSocial(false), 2200);
    } catch {
      setCopiedSocial(true);
      window.setTimeout(() => setCopiedSocial(false), 2200);
    }
  };

  const previewSlug = normalizeSlugInput(slug).replace(/^-|-$/g, '');

  return (
    <section className="max-w-3xl mx-auto py-2 sm:py-6" aria-label="Direct Post">
      <div className="pb-6 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
            {SITE_CONFIG.domain} · Cloud Firestore Publishing
          </p>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-bold text-neutral-950">
            Write &amp; Post Article
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={downloadingZip}
            onClick={async () => {
              setError('');
              setDownloadingZip(true);
              try {
                await downloadProjectZip();
              } catch {
                setError('ZIP download failed. Try the direct link in RSS & Feeds.');
              } finally {
                setDownloadingZip(false);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadingZip ? 'Preparing ZIP...' : 'Download ZIP'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSyndication}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:border-neutral-400 rounded-md transition-colors cursor-pointer"
          >
            <Rss className="w-3.5 h-3.5 text-red-800" />
            <span>RSS &amp; Feeds</span>
          </button>

          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Front Page</span>
          </button>
        </div>
      </div>

      {/* Editor Google Sign-In Status */}
      <div className="mt-6 p-4 bg-neutral-50 border border-neutral-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {!authReady ? (
          <p className="text-xs text-neutral-600">
            Checking editor authentication...
          </p>
        ) : !authUser ? (
          <>
            <div>
              <p className="text-xs font-semibold text-neutral-950">
                Editor Sign-In Required for Cloud Publishing
              </p>
              <p className="text-xs text-neutral-600 mt-0.5">
                Sign in with your authorized Google account (
                {AUTHORIZED_EDITOR_EMAILS.join(' or ')}) to save articles and
                photos to Firebase Firestore.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={authBusy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{authBusy ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          </>
        ) : !isEditorAuthorized ? (
          <>
            <div>
              <p className="text-xs font-semibold text-red-800">
                Signed in as {authUser.email} (Not Authorized to Publish)
              </p>
              <p className="text-xs text-neutral-600 mt-0.5">
                Please switch to {AUTHORIZED_EDITOR_EMAILS.join(' or ')} to
                publish or delete reports.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authBusy}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-900 bg-white border border-neutral-300 hover:border-neutral-500 rounded-md cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Account</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-neutral-950">
                  Verified Editor: {authUser.email}
                </p>
                <p className="text-xs text-neutral-500">
                  Connected to Firebase Cloud Firestore ({FIREBASE_PROJECT_ID})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authBusy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:border-neutral-500 rounded-md cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </>
        )}
      </div>

      {statusMessage && (
        <div
          className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          role="status"
        >
          <div className="flex items-center gap-2 text-sm text-emerald-900 font-medium">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={onBackHome}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer self-start sm:self-auto"
          >
            View on Front Page
          </button>
        </div>
      )}

      {/* Ready-to-Copy Social Media Share Box */}
      {shareBoxText && (
        <div
          className="mt-6 p-5 bg-neutral-50 border border-neutral-300 rounded-md space-y-3"
          aria-label="Social Media Share Box"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-red-800" />
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950">
                  Social Media Share Box
                </h2>
                <p className="text-xs text-neutral-500">
                  {publishedShareRecord
                    ? 'Published live — ready to share on Facebook, X, and WhatsApp.'
                    : 'Share preview — updates with final live link after publishing.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyShareBox}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
            >
              {copiedSocial ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Share Post</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy for Facebook, X &amp; WhatsApp</span>
                </>
              )}
            </button>
          </div>

          <pre
            dir="auto"
            className="p-3.5 bg-white border border-neutral-200 rounded-md text-xs sm:text-sm text-neutral-800 whitespace-pre-wrap font-sans leading-relaxed"
          >
            {shareBoxText}
          </pre>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
        {/* Step 1: Full Article Body (Urdu or English) + Photo Upload */}
        <div className="p-5 bg-white border border-neutral-200 rounded-md space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="direct-body"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-950"
              >
                1. Full Article Body (Urdu or English)
              </label>
              <span className="text-[11px] text-neutral-500">
                Your exact words stay untouched
              </span>
            </div>
            <textarea
              id="direct-body"
              rows={11}
              dir="auto"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (publishedShareRecord) setPublishedShareRecord(null);
              }}
              placeholder="Paste or write your complete Urdu or English article here, then click 'Auto-Fill Details from Article' below..."
              className="w-full px-3.5 py-3 text-sm sm:text-base border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950 leading-relaxed"
              required
            />
          </div>

          {/* Direct Photo Upload + Optional Image URL */}
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-neutral-950">
                  Article Photo (Direct Upload or Image URL)
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Upload from your phone/computer or paste an image link. Saved directly in Cloud Firestore.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="direct-photo-file"
                />
                <label
                  htmlFor="direct-photo-file"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>
                    {processingPhoto ? 'Optimizing...' : 'Upload Photo'}
                  </span>
                </label>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:border-neutral-500 rounded-md cursor-pointer"
                    aria-label="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {imageUrl && (
              <div className="border border-neutral-200 rounded-md overflow-hidden bg-white max-w-md">
                <img
                  src={imageUrl}
                  alt="Article preview"
                  className="w-full aspect-[16/9] object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="direct-image-url"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Image URL (optional)
                </label>
                <input
                  id="direct-image-url"
                  type="url"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://newsworld.life/..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                />
              </div>
              <div>
                <label
                  htmlFor="direct-image-caption"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Photo Caption (optional)
                </label>
                <input
                  id="direct-image-caption"
                  type="text"
                  dir="auto"
                  maxLength={300}
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Photo credit or description..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Gemini AI Auto-Fill Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-neutral-600">
              Automatically extract Headline, 2-sentence Summary, Category, SEO
              Keywords, English URL Slug, Byline &amp; Social Caption.
            </p>
            <button
              type="button"
              onClick={handleAutoFill}
              disabled={autoFilling}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-red-800 hover:bg-red-900 disabled:opacity-60 rounded-md transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {autoFilling
                  ? 'Analyzing Article...'
                  : 'Auto-Fill Details from Article'}
              </span>
            </button>
          </div>

          {autoFillMessage && (
            <p
              className="text-xs text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-md"
              role="status"
            >
              {autoFillMessage}
            </p>
          )}
        </div>

        {/* Step 3: Auto-Filled & Editable Editorial Metadata */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950">
            2. Generated Article Details &amp; SEO Metadata
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="direct-title"
                className="block text-xs font-semibold text-neutral-800 mb-1.5"
              >
                Headline
              </label>
              <input
                id="direct-title"
                type="text"
                dir="auto"
                maxLength={240}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-generated journalistic headline..."
                className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                required
              />
            </div>

            <div>
              <label
                htmlFor="direct-category"
                className="block text-xs font-semibold text-neutral-800 mb-1.5"
              >
                Category
              </label>
              <select
                id="direct-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-neutral-950"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="direct-slug"
              className="block text-xs font-semibold text-neutral-800 mb-1.5"
            >
              SEO URL Slug (English URL for Urdu &amp; English Articles)
            </label>
            <input
              id="direct-slug"
              type="text"
              dir="ltr"
              maxLength={80}
              value={slug}
              onChange={(e) => setSlug(normalizeSlugInput(e.target.value))}
              placeholder="e.g. pakistan-economic-policy-outlook"
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
            />
            <p className="mt-1 text-xs font-mono text-neutral-500 break-all">
              Live URL: {SITE_CONFIG.baseUrl}/article/{previewSlug || '<auto-generated-slug>'}
            </p>
          </div>

          <div>
            <label
              htmlFor="direct-deck"
              className="block text-xs font-semibold text-neutral-800 mb-1.5"
            >
              Summary / Excerpt (2 Sentences)
            </label>
            <textarea
              id="direct-deck"
              rows={2}
              dir="auto"
              maxLength={600}
              value={deck}
              onChange={(e) => setDeck(e.target.value)}
              placeholder="Auto-generated 2-sentence summary for front page, RSS, and social cards..."
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950 leading-relaxed"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="direct-author"
                className="block text-xs font-semibold text-neutral-800 mb-1.5"
              >
                Author / Byline
              </label>
              <input
                id="direct-author"
                type="text"
                dir="auto"
                maxLength={120}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
              />
            </div>
            <div>
              <label
                htmlFor="direct-location"
                className="block text-xs font-semibold text-neutral-800 mb-1.5"
              >
                Dateline / City
              </label>
              <input
                id="direct-location"
                type="text"
                dir="auto"
                maxLength={120}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Islamabad, London, Geneva..."
                className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="direct-keywords"
                className="block text-xs font-semibold text-neutral-800 mb-1.5"
              >
                SEO Tags / Keywords (comma separated)
              </label>
              <input
                id="direct-keywords"
                type="text"
                dir="auto"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="world news, diplomacy, peace"
                className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
              />
            </div>
            <div>
              <label
                htmlFor="direct-quote"
                className="block text-xs font-semibold text-neutral-800 mb-1.5"
              >
                Pull Quote (optional)
              </label>
              <input
                id="direct-quote"
                type="text"
                dir="auto"
                maxLength={600}
                value={pullQuote}
                onChange={(e) => setPullQuote(e.target.value)}
                placeholder="Highlighted quote inside article..."
                className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs sm:text-sm text-red-700 font-medium" role="alert">
            {error}
          </p>
        )}

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-neutral-200">
          <span className="text-xs text-neutral-500">
            Saves to Cloud Firestore (<strong className="text-neutral-900">{FIREBASE_PROJECT_ID}</strong>) for all browsers &amp; devices
          </span>

          <button
            type="submit"
            disabled={submitting || processingPhoto || autoFilling || !isEditorAuthorized}
            className="px-6 py-3 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
          >
            {submitting ? 'Publishing to Cloud...' : 'Publish Live Now'}
          </button>
        </div>
      </form>

      {/* Manage Published Posts */}
      {articles.length > 0 && (
        <div className="mt-12 pt-8 border-t border-neutral-200">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950 mb-4">
            Cloud Published Posts ({articles.length})
          </h2>
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {articles.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <button
                  type="button"
                  onClick={() => onPreviewArticle(item)}
                  className="text-left min-w-0 flex-1 cursor-pointer group"
                >
                  <p
                    dir="auto"
                    className="text-sm font-serif font-semibold text-neutral-950 group-hover:text-red-800 truncate"
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {item.category} · /article/{item.id} · {item.author}
                  </p>
                </button>
                {isEditorAuthorized && (
                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deletingId === item.id ? 'Removing...' : 'Delete'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
