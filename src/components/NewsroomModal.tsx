import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  ImagePlus,
  LogIn,
  LogOut,
  Rss,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  SITE_CONFIG,
  type Article,
  type Category,
} from '../config';
import {
  AUTHORIZED_EDITOR_EMAILS,
  FIREBASE_PROJECT_ID,
  formatReadableFirestoreError,
} from '../firebase';
import { downloadProjectZip } from '../utils/downloadSource';
import { compressImageFile } from '../utils/imageUpload';

interface NewsroomStatus {
  brandName: string;
  domain: string;
  siteUrl: string;
  publishedCount: number;
  subscriberCount: number;
  dispatchCount: number;
  smtpConfigured: boolean;
  feeds: {
    rss: string;
    atom: string;
    newsSitemap: string;
    sitemap: string;
    robots: string;
  };
}

interface NewsroomModalProps {
  isOpen: boolean;
  initialTab?: 'publish' | 'syndication';
  articles: Article[];
  authUser: User | null;
  isEditorAuthorized: boolean;
  onSignInEditor: () => Promise<void>;
  onSignOutEditor: () => Promise<void>;
  onClose: () => void;
  onPublishArticle: (payload: {
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
}

export function NewsroomModal({
  isOpen,
  initialTab = 'publish',
  articles,
  authUser,
  isEditorAuthorized,
  onSignInEditor,
  onSignOutEditor,
  onClose,
  onPublishArticle,
  onDeleteArticle,
}: NewsroomModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'publish' | 'syndication'>(initialTab);
  const [status, setStatus] = useState<NewsroomStatus | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  // Publish form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('World');
  const [author, setAuthor] = useState('Muhammad Nadeem Faisal');
  const [location, setLocation] = useState('Islamabad');
  const [deck, setDeck] = useState('');
  const [keywords, setKeywords] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [pullQuote, setPullQuote] = useState('');
  const [content, setContent] = useState('');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const refreshStatus = async () => {
    try {
      const response = await fetch('/api/newsroom/status');
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = (await response.json()) as NewsroomStatus;
        setStatus(data);
      }
    } catch {
      // Ignore transient errors on static hosts
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void refreshStatus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  const handlePublish = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!authUser || !isEditorAuthorized) {
      setError('Please sign in with an authorized NEWS WORLD editor Google account.');
      return;
    }

    const cleanTitle = title.trim();
    const cleanDeck = deck.trim();
    const cleanBody = content.trim();

    if (cleanTitle.length < 4 || cleanDeck.length < 6 || cleanBody.length < 10) {
      setError('Headline, summary deck, and article text are required.');
      return;
    }

    setSubmitting(true);
    try {
      await onPublishArticle({
        title: cleanTitle,
        category,
        author: author.trim() || 'Muhammad Nadeem Faisal',
        location: location.trim() || 'Global Desk',
        deck: cleanDeck,
        keywords,
        imageUrl: imageUrl.trim(),
        imageCaption: imageCaption.trim(),
        pullQuote: pullQuote.trim(),
        content: cleanBody,
      });

      setTitle('');
      setDeck('');
      setKeywords('');
      setImageUrl('');
      setImageCaption('');
      setPullQuote('');
      setContent('');
      setSuccessMessage(
        `Published live to Cloud Firestore (${FIREBASE_PROJECT_ID}).`,
      );
      await refreshStatus();
    } catch (err) {
      setError(formatReadableFirestoreError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      await onDeleteArticle(id);
      await refreshStatus();
    } catch (err) {
      setError(formatReadableFirestoreError(err));
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl(null), 1800);
    } catch {
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl(null), 1800);
    }
  };

  const feedRows = [
    {
      label: 'RSS 2.0 Global Feed',
      path: '/rss.xml',
      canonical: status?.feeds.rss || `${SITE_CONFIG.baseUrl}/rss.xml`,
    },
    {
      label: 'Atom / Feed Alias',
      path: '/feed.xml',
      canonical: status?.feeds.atom || `${SITE_CONFIG.baseUrl}/feed.xml`,
    },
    {
      label: 'Google News Sitemap',
      path: '/news-sitemap.xml',
      canonical:
        status?.feeds.newsSitemap || `${SITE_CONFIG.baseUrl}/news-sitemap.xml`,
    },
    {
      label: 'Standard XML Sitemap',
      path: '/sitemap.xml',
      canonical: status?.feeds.sitemap || `${SITE_CONFIG.baseUrl}/sitemap.xml`,
    },
    {
      label: 'Search Crawler Robots',
      path: '/robots.txt',
      canonical: status?.feeds.robots || `${SITE_CONFIG.baseUrl}/robots.txt`,
    },
    {
      label: 'Google AdSense ads.txt',
      path: '/ads.txt',
      canonical: `${SITE_CONFIG.baseUrl}/ads.txt`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-[2px] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsroom-modal-title"
      onClick={onClose}
    >
      <div className="min-h-full px-4 py-6 sm:py-10 flex justify-center items-start">
        <div
          className="w-full max-w-3xl bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-neutral-200 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
                {SITE_CONFIG.domain} · Cloud Firestore ({FIREBASE_PROJECT_ID})
              </p>
              <h2
                id="newsroom-modal-title"
                className="mt-1 font-serif text-2xl font-bold text-neutral-950"
              >
                NEWS WORLD Editorial Desk
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-500 hover:text-neutral-950 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Close newsroom desk"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Tab Bar */}
          <div className="px-6 sm:px-8 pt-4 border-b border-neutral-200 bg-neutral-50/70">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('publish')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'publish'
                    ? 'border-red-800 text-neutral-950'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Write &amp; Publish Story
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('syndication')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'syndication'
                    ? 'border-red-800 text-neutral-950'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                RSS, Sitemaps &amp; Download ZIP
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === 'publish' ? (
              <div className="space-y-6">
                {/* Editor Auth Bar */}
                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-md flex flex-wrap items-center justify-between gap-3">
                  {!authUser ? (
                    <>
                      <p className="text-xs text-neutral-700">
                        Sign in with{' '}
                        <span className="font-medium">
                          {AUTHORIZED_EDITOR_EMAILS.join(' or ')}
                        </span>{' '}
                        to publish to Cloud Firestore.
                      </p>
                      <button
                        type="button"
                        disabled={authBusy}
                        onClick={async () => {
                          setAuthBusy(true);
                          setError('');
                          try {
                            await onSignInEditor();
                          } catch (err) {
                            setError(formatReadableFirestoreError(err));
                          } finally {
                            setAuthBusy(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{authBusy ? 'Signing in...' : 'Sign in with Google'}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-xs">
                        <ShieldCheck
                          className={`w-4 h-4 ${
                            isEditorAuthorized ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        />
                        <span className="font-medium text-neutral-900">
                          {authUser.email}
                          {!isEditorAuthorized && ' (Unauthorized)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={authBusy}
                        onClick={async () => {
                          setAuthBusy(true);
                          try {
                            await onSignOutEditor();
                          } finally {
                            setAuthBusy(false);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-700 bg-white border border-neutral-300 rounded-md cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Sign out</span>
                      </button>
                    </>
                  )}
                </div>

                <form onSubmit={handlePublish} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="pub-title"
                        className="block text-xs font-medium text-neutral-700 mb-1"
                      >
                        Headline
                      </label>
                      <input
                        id="pub-title"
                        type="text"
                        maxLength={240}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter your headline..."
                        className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pub-category"
                        className="block text-xs font-medium text-neutral-700 mb-1"
                      >
                        Section
                      </label>
                      <select
                        id="pub-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Category)}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-neutral-950"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="pub-author"
                        className="block text-xs font-medium text-neutral-700 mb-1"
                      >
                        Author / Correspondent
                      </label>
                      <input
                        id="pub-author"
                        type="text"
                        maxLength={120}
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pub-location"
                        className="block text-xs font-medium text-neutral-700 mb-1"
                      >
                        Dateline / City
                      </label>
                      <input
                        id="pub-location"
                        type="text"
                        maxLength={120}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City or bureau..."
                        className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="pub-deck"
                      className="block text-xs font-medium text-neutral-700 mb-1"
                    >
                      Summary Deck
                    </label>
                    <input
                      id="pub-deck"
                      type="text"
                      maxLength={600}
                      value={deck}
                      onChange={(e) => setDeck(e.target.value)}
                      placeholder="Short summary for front page, RSS, and Google News..."
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                      required
                    />
                  </div>

                  {/* Direct Photo Upload + Image URL */}
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-900">
                        Photo (Direct Upload or URL)
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                          id="modal-photo-file"
                        />
                        <label
                          htmlFor="modal-photo-file"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md cursor-pointer"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>
                            {processingPhoto ? 'Optimizing...' : 'Upload Photo'}
                          </span>
                        </label>
                        {imageUrl && (
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="px-2.5 py-1.5 text-xs text-neutral-700 bg-white border border-neutral-300 rounded-md cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {imageUrl && (
                      <div className="border border-neutral-200 rounded-md overflow-hidden bg-white max-w-xs">
                        <img
                          src={imageUrl}
                          alt="Selected preview"
                          className="w-full aspect-[16/9] object-cover"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="pub-image-url"
                          className="block text-xs font-medium text-neutral-700 mb-1"
                        >
                          Image URL (optional)
                        </label>
                        <input
                          id="pub-image-url"
                          type="url"
                          value={imageUrl.startsWith('data:') ? '' : imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://newsworld.life/..."
                          className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="pub-image-caption"
                          className="block text-xs font-medium text-neutral-700 mb-1"
                        >
                          Photo Caption (optional)
                        </label>
                        <input
                          id="pub-image-caption"
                          type="text"
                          maxLength={300}
                          value={imageCaption}
                          onChange={(e) => setImageCaption(e.target.value)}
                          placeholder="Photo credit or description..."
                          className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="pub-keywords"
                        className="block text-xs font-medium text-neutral-700 mb-1"
                      >
                        News Tags / Keywords (comma separated)
                      </label>
                      <input
                        id="pub-keywords"
                        type="text"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="world news, economy, policy"
                        className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pub-quote"
                        className="block text-xs font-medium text-neutral-700 mb-1"
                      >
                        Pull Quote (optional)
                      </label>
                      <input
                        id="pub-quote"
                        type="text"
                        maxLength={600}
                        value={pullQuote}
                        onChange={(e) => setPullQuote(e.target.value)}
                        placeholder="Highlighted quote inside article..."
                        className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="pub-body"
                      className="block text-xs font-medium text-neutral-700 mb-1"
                    >
                      Article Text (separate paragraphs with a new line)
                    </label>
                    <textarea
                      id="pub-body"
                      rows={6}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your article or news report here..."
                      className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-950 leading-relaxed"
                      required
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-700" role="alert">
                      {error}
                    </p>
                  )}
                  {successMessage && (
                    <p className="text-xs text-emerald-700 font-medium" role="status">
                      {successMessage}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <span className="text-xs text-neutral-500">
                      Publishes live to{' '}
                      <strong className="text-neutral-800">{FIREBASE_PROJECT_ID}</strong>
                    </span>
                    <button
                      type="submit"
                      disabled={submitting || processingPhoto || !isEditorAuthorized}
                      className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {submitting ? 'Publishing...' : 'Publish Live Now'}
                    </button>
                  </div>
                </form>

                {articles.length > 0 && (
                  <div className="pt-6 border-t border-neutral-200">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-950 mb-3">
                      Cloud Published Stories ({articles.length})
                    </h3>
                    <div className="divide-y divide-neutral-200 border-y border-neutral-200">
                      {articles.map((item) => (
                        <div
                          key={item.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-serif font-semibold text-neutral-950 truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {item.category} · {item.location} · {item.author}
                            </p>
                          </div>
                          {isEditorAuthorized && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md">
                    <p className="text-xs text-neutral-500">Primary Domain</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-950 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-red-800 shrink-0" />
                      <span className="truncate">
                        {status?.domain || 'newsworld.life'}
                      </span>
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md">
                    <p className="text-xs text-neutral-500">Cloud Stories</p>
                    <p className="mt-1 text-lg font-bold text-neutral-950 tabular-nums">
                      {articles.length}
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md">
                    <p className="text-xs text-neutral-500">Firestore Project</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-950 truncate">
                      {FIREBASE_PROJECT_ID}
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md">
                    <p className="text-xs text-neutral-500">Zoho SMTP Relay</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-950">
                      {status?.smtpConfigured
                        ? 'Live SMTP Active'
                        : 'Desk Routing Ready'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-950 mb-3 flex items-center gap-2">
                    <Rss className="w-3.5 h-3.5 text-red-800" />
                    <span>Live Syndication &amp; Search Crawler Endpoints</span>
                  </h3>
                  <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-md">
                    {feedRows.map((row) => (
                      <div
                        key={row.path}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-semibold text-neutral-950">
                            {row.label}
                          </p>
                          <p className="text-xs text-neutral-500 font-mono">
                            {row.canonical}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(row.canonical)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:border-neutral-400 rounded-md transition-colors cursor-pointer"
                          >
                            {copiedUrl === row.canonical ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy URL</span>
                              </>
                            )}
                          </button>
                          <a
                            href={row.path}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-950 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-950">
                      Full Project Source Package
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      Download complete source code, Firebase Firestore rules, SEO tags, and{' '}
                      <span className="font-mono">ads.txt</span> as a ZIP archive.
                    </p>
                    {downloadError && (
                      <p className="mt-1 text-xs text-red-700" role="alert">
                        {downloadError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={downloadingZip}
                      onClick={async () => {
                        setDownloadError('');
                        setDownloadingZip(true);
                        try {
                          await downloadProjectZip();
                        } catch {
                          setDownloadError('Download failed. Try Direct Link.');
                        } finally {
                          setDownloadingZip(false);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {downloadingZip ? 'Preparing ZIP...' : 'Download Source (.zip)'}
                      </span>
                    </button>
                    <a
                      href="/api/download-source"
                      download="newsworld-life-source.zip"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 hover:border-neutral-500 rounded-md transition-colors whitespace-nowrap"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Direct Link</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
