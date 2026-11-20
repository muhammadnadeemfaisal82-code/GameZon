import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowRight,
  Bookmark,
  Download,
  Mail,
  PenSquare,
  Rss,
  Search,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  EDITORIAL_DESKS,
  SITE_CONFIG,
  type Article,
  type Category,
  type PageRoute,
} from './config';
import {
  auth,
  db,
  handleFirestoreError,
  isBootstrappedEditor,
  OperationType,
  signInEditorWithGoogle,
  signOutEditor,
} from './firebase';
import { downloadProjectZip } from './utils/downloadSource';
import { Header } from './components/Header';
import { EditorialImage } from './components/EditorialImage';
import { ArticleModal } from './components/ArticleModal';
import { SubscribeModal } from './components/SubscribeModal';
import { NewsroomModal } from './components/NewsroomModal';
import { ContactDeskModal } from './components/ContactDeskModal';
import { AboutPage } from './components/AboutPage';
import { PolicyPage } from './components/PolicyPage';
import { ContactPage } from './components/ContactPage';
import { TermsPage } from './components/TermsPage';
import { DirectPostPage } from './components/DirectPostPage';
import { StickyAnchorAd } from './components/StickyAnchorAd';

const STORAGE_KEY = 'news_world_saved_articles_v1';

function resolveRouteFromLocation(): PageRoute {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase();
  if (path === '/about' || hash === '#about') return 'about';
  if (path === '/privacy-policy' || hash === '#privacy-policy') {
    return 'privacy-policy';
  }
  if (path === '/contact' || hash === '#contact') return 'contact';
  if (path === '/terms' || hash === '#terms') return 'terms';
  if (path === '/post' || hash === '#post') return 'post';
  return 'home';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageRoute>(() =>
    resolveRouteFromLocation(),
  );
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isEditorAuthorized, setIsEditorAuthorized] = useState(false);
  const [firestoreFatalError, setFirestoreFatalError] = useState<Error | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [newsroomTab, setNewsroomTab] = useState<'publish' | 'syndication'>(
    'publish',
  );
  const [newsroomOpen, setNewsroomOpen] = useState(false);
  const [contactDeskEmail, setContactDeskEmail] = useState<string | undefined>(
    undefined,
  );
  const [contactOpen, setContactOpen] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  if (firestoreFatalError) {
    throw firestoreFatalError;
  }

  // Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (!user) {
        setIsEditorAuthorized(false);
        setAuthReady(true);
        return;
      }

      if (isBootstrappedEditor(user)) {
        setIsEditorAuthorized(true);
        setAuthReady(true);
        return;
      }

      if (user.emailVerified) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', user.uid));
          setIsEditorAuthorized(adminSnap.exists());
        } catch {
          setIsEditorAuthorized(false);
        }
      } else {
        setIsEditorAuthorized(false);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Sync browser history / hash navigation
  useEffect(() => {
    const handlePopOrHash = () => {
      setCurrentPage(resolveRouteFromLocation());
      const pathMatch = /^\/article\/([^/]+)/i.exec(window.location.pathname);
      if (pathMatch) {
        const slugId = decodeURIComponent(pathMatch[1]);
        const matched = articles.find((item) => item.id === slugId);
        if (matched) {
          setSelectedArticle(matched);
        }
      } else {
        setSelectedArticle(null);
      }
    };
    window.addEventListener('popstate', handlePopOrHash);
    window.addEventListener('hashchange', handlePopOrHash);
    return () => {
      window.removeEventListener('popstate', handlePopOrHash);
      window.removeEventListener('hashchange', handlePopOrHash);
    };
  }, [articles]);

  // Update document title dynamically per page route
  useEffect(() => {
    if (selectedArticle) return;
    if (currentPage === 'about') {
      document.title = `About Us — ${SITE_CONFIG.brandName} | ${SITE_CONFIG.domain}`;
    } else if (currentPage === 'privacy-policy') {
      document.title = `Editorial Policy & Privacy Policy — ${SITE_CONFIG.brandName} | ${SITE_CONFIG.domain}`;
    } else if (currentPage === 'contact') {
      document.title = `Contact Us — ${SITE_CONFIG.brandName} | ${SITE_CONFIG.domain}`;
    } else if (currentPage === 'terms') {
      document.title = `Terms of Use — ${SITE_CONFIG.brandName} | ${SITE_CONFIG.domain}`;
    } else if (currentPage === 'post') {
      document.title = `Direct Post — ${SITE_CONFIG.brandName} | ${SITE_CONFIG.domain}`;
    } else {
      document.title = `${SITE_CONFIG.brandName} — International Broadsheet | ${SITE_CONFIG.domain}`;
    }
  }, [currentPage, selectedArticle]);

  // Real-time Cloud Firestore listener for published articles across all devices
  useEffect(() => {
    if (!authReady) return;

    const params = new URLSearchParams(window.location.search);
    const sectionParam = params.get('section');
    const queryArticleParam = params.get('article');
    const pathMatch = /^\/article\/([^/]+)/i.exec(window.location.pathname);
    const articleParam =
      (pathMatch ? decodeURIComponent(pathMatch[1]) : null) || queryArticleParam;

    if (sectionParam && CATEGORIES.includes(sectionParam as Category)) {
      setActiveCategory(sectionParam as Category);
    }

    const articlesQuery = query(
      collection(db, 'articles'),
      where('status', '==', 'published'),
    );

    const unsubscribe = onSnapshot(
      articlesQuery,
      (snapshot) => {
        const cloudArticles: Article[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: typeof data.id === 'string' ? data.id : docSnap.id,
            title: String(data.title || ''),
            deck: String(data.deck || ''),
            category: CATEGORIES.includes(data.category as Category)
              ? (data.category as Category)
              : 'World',
            author: String(data.author || 'Muhammad Nadeem Faisal'),
            authorUid:
              typeof data.authorUid === 'string' ? data.authorUid : undefined,
            location: String(data.location || 'Global Desk'),
            publishedAt: String(data.publishedAt || ''),
            isoDate: String(data.isoDate || ''),
            readTime: String(data.readTime || '1 min read'),
            status: 'published',
            keywords: Array.isArray(data.keywords)
              ? (data.keywords.filter((k) => typeof k === 'string') as string[])
              : ['world'],
            imageUrl:
              typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
            imageCaption:
              typeof data.imageCaption === 'string'
                ? data.imageCaption
                : undefined,
            pullQuote:
              typeof data.pullQuote === 'string' ? data.pullQuote : undefined,
            body: Array.isArray(data.body)
              ? (data.body.filter((p) => typeof p === 'string') as string[])
              : [],
          };
        });

        cloudArticles.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
        setArticles(cloudArticles);
        setLoading(false);

        if (articleParam) {
          const matched = cloudArticles.find((item) => item.id === articleParam);
          if (matched) {
            setSelectedArticle(matched);
          }
        }
      },
      (error) => {
        setLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'articles');
        } catch (wrapped) {
          setFirestoreFatalError(
            wrapped instanceof Error ? wrapped : new Error(String(wrapped)),
          );
        }
      },
    );

    return () => unsubscribe();
  }, [authReady]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds));
    } catch {
      // Ignore storage errors
    }
  }, [savedIds]);

  const navigateToPage = (page: PageRoute) => {
    const targetPath =
      page === 'about'
        ? '/about'
        : page === 'privacy-policy'
          ? '/privacy-policy'
          : page === 'contact'
            ? '/contact'
            : page === 'terms'
              ? '/terms'
              : page === 'post'
                ? '/post'
                : '/';
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState({}, '', targetPath);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openArticle = (article: Article) => {
    setSelectedArticle(article);
    const articlePath = `/article/${encodeURIComponent(article.id)}`;
    if (window.location.pathname !== articlePath) {
      window.history.pushState({}, '', articlePath);
    }
  };

  const closeArticle = () => {
    setSelectedArticle(null);
    if (window.location.pathname.startsWith('/article/')) {
      const targetPath = currentPage === 'post' ? '/post' : '/';
      window.history.pushState({}, '', targetPath);
    }
  };

  const publishArticleHandler = async (payload: {
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
  }): Promise<{ article: Article; syncedToServer: boolean }> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Please sign in with Google before publishing.');
    }

    // Clamp & sanitize all fields strictly to match firebase-blueprint.json schema
    const cleanTitle = payload.title.trim().slice(0, 240);
    const cleanDeck = payload.deck.trim().slice(0, 600);
    const cleanAuthor = (
      payload.author.trim() || 'Muhammad Nadeem Faisal'
    ).slice(0, 120);
    const cleanLocation = (payload.location.trim() || 'Global Desk').slice(
      0,
      120,
    );
    const paragraphs = payload.content
      .split(/\n+/)
      .map((line) => line.trim().slice(0, 20000))
      .filter(Boolean)
      .slice(0, 120);

    if (cleanTitle.length < 4 || cleanDeck.length < 6 || paragraphs.length === 0) {
      throw new Error('Headline, summary deck, and article body are required.');
    }

    const wordsCount = paragraphs.join(' ').split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(wordsCount / 180));
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const isoDate = now.toISOString();
    const readTime = `${minutes} min read`;

    const keywordsList = payload.keywords
      .split(',')
      .map((k) => k.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 12);
    const safeKeywords =
      keywordsList.length > 0
        ? keywordsList
        : [payload.category.toLowerCase()];

    const cleanRequestedSlug = (payload.slug || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    const slugBase = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);

    let candidateId =
      cleanRequestedSlug.length >= 3
        ? cleanRequestedSlug
        : `${slugBase || 'article'}-${Date.now().toString(36)}`;

    if (articles.some((existing) => existing.id === candidateId)) {
      candidateId = `${candidateId.slice(0, 110)}-${Date.now().toString(36).slice(-4)}`;
    }

    const articleId = candidateId
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 128);

    const cleanImageUrl = payload.imageUrl.trim();
    const cleanImageCaption = payload.imageCaption.trim().slice(0, 300);
    const cleanPullQuote = payload.pullQuote.trim().slice(0, 600);

    if (cleanImageUrl.length > 700000) {
      throw new Error(
        'Selected photo exceeds Cloud Firestore document size limit. Please choose a smaller image.',
      );
    }

    const firestoreDoc: Record<string, unknown> = {
      id: articleId,
      title: cleanTitle,
      deck: cleanDeck,
      category: payload.category,
      author: cleanAuthor,
      authorUid: currentUser.uid,
      location: cleanLocation,
      publishedAt: formattedDate,
      isoDate,
      readTime,
      status: 'published',
      keywords: safeKeywords,
      body: paragraphs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (cleanImageUrl) firestoreDoc.imageUrl = cleanImageUrl;
    if (cleanImageCaption) firestoreDoc.imageCaption = cleanImageCaption;
    if (cleanPullQuote) firestoreDoc.pullQuote = cleanPullQuote;

    try {
      await setDoc(doc(db, 'articles', articleId), firestoreDoc);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `articles/${articleId}`);
    }

    const publishedArticle: Article = {
      id: articleId,
      title: cleanTitle,
      deck: cleanDeck,
      category: payload.category,
      author: cleanAuthor,
      authorUid: currentUser.uid,
      location: cleanLocation,
      publishedAt: formattedDate,
      isoDate,
      readTime,
      status: 'published',
      keywords: safeKeywords,
      imageUrl: cleanImageUrl || undefined,
      imageCaption: cleanImageCaption || undefined,
      pullQuote: cleanPullQuote || undefined,
      body: paragraphs,
    };

    // Best-effort non-blocking mirror to local Express RSS/Sitemap if available
    void fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, id: articleId }),
    }).catch(() => undefined);

    return { article: publishedArticle, syncedToServer: true };
  };

  const deleteArticleHandler = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'articles', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `articles/${id}`);
    }

    void fetch(`/api/articles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => undefined);
  };

  const toggleBookmark = (id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectCategory = (category: Category | 'All') => {
    if (currentPage !== 'home') {
      navigateToPage('home');
    }
    setActiveCategory(category);
    setShowSavedOnly(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openNewsroom = (tab: 'publish' | 'syndication' = 'publish') => {
    setNewsroomTab(tab);
    setNewsroomOpen(true);
  };

  const openContactForDesk = (email?: string) => {
    setContactDeskEmail(email || SITE_CONFIG.editorDirectEmail);
    setContactOpen(true);
  };

  const isFilteredView =
    activeCategory !== 'All' || searchQuery.trim().length > 0 || showSavedOnly;

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return articles.filter((article) => {
      if (showSavedOnly && !savedIds.includes(article.id)) {
        return false;
      }
      if (activeCategory !== 'All' && article.category !== activeCategory) {
        return false;
      }
      if (query) {
        const haystack =
          `${article.title} ${article.deck} ${article.category} ${article.location} ${article.author} ${article.keywords.join(' ')}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [articles, activeCategory, searchQuery, showSavedOnly, savedIds]);

  const leadArticle = articles[0] ?? null;
  const sidebarDispatches = articles.slice(1, 5);
  const featureArticles = articles.slice(1, 4);
  const archiveDispatches = articles.slice(4);

  const resetFilters = () => {
    setActiveCategory('All');
    setSearchQuery('');
    setShowSavedOnly(false);
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-950">
      <Header
        currentPage={currentPage}
        activeCategory={activeCategory}
        onNavigatePage={navigateToPage}
        onSelectCategory={handleSelectCategory}
        onOpenContactEditor={() =>
          openContactForDesk(SITE_CONFIG.editorDirectEmail)
        }
        onOpenSubscribe={() => setSubscribeOpen(true)}
      />

      {/* Edition Date, News Sections & Utility Strip */}
      <div className="border-b border-neutral-200 bg-neutral-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-neutral-600 tabular-nums">
            <span className="font-medium text-neutral-900">{todayFormatted}</span>
            <span aria-hidden="true">·</span>
            <span>{SITE_CONFIG.domain}</span>
            <span aria-hidden="true">·</span>
            <a
              href="/rss.xml"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-neutral-700 hover:text-red-800 transition-colors"
            >
              <Rss className="w-3 h-3 text-red-800" />
              <span>RSS</span>
            </a>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigateToPage('post')}
              className={`inline-flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                currentPage === 'post'
                  ? 'text-red-800 underline underline-offset-4'
                  : 'text-neutral-900 hover:text-red-800'
              }`}
            >
              <PenSquare className="w-3 h-3" />
              <span>Direct Post</span>
            </button>
            <span aria-hidden="true">·</span>
            <div className="hidden sm:inline-flex items-center gap-2.5">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleSelectCategory(category)}
                  className={`transition-colors cursor-pointer whitespace-nowrap ${
                    currentPage === 'home' && activeCategory === category
                      ? 'font-semibold text-red-800 underline underline-offset-4'
                      : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            {currentPage === 'home' && isFilteredView && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-medium text-red-800 hover:text-red-950 underline underline-offset-4 cursor-pointer"
                >
                  Return to Front Page
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-60">
              <Search
                className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  if (currentPage !== 'home') navigateToPage('home');
                  setSearchQuery(e.target.value);
                }}
                placeholder="Search headlines..."
                aria-label="Search headlines"
                className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-md text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (currentPage !== 'home') navigateToPage('home');
                setShowSavedOnly((prev) => !prev);
              }}
              aria-pressed={currentPage === 'home' && showSavedOnly}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                currentPage === 'home' && showSavedOnly
                  ? 'bg-neutral-950 text-white border-neutral-950'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <Bookmark
                className="w-3.5 h-3.5"
                fill={currentPage === 'home' && showSavedOnly ? 'currentColor' : 'none'}
              />
              <span className="tabular-nums">Saved ({savedIds.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Broadsheet Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {currentPage === 'about' ? (
          <AboutPage
            onNavigateHome={() => navigateToPage('home')}
            onNavigatePolicy={() => navigateToPage('privacy-policy')}
            onOpenSubscribe={() => setSubscribeOpen(true)}
            onContactEditor={openContactForDesk}
          />
        ) : currentPage === 'privacy-policy' ? (
          <PolicyPage
            onNavigateAbout={() => navigateToPage('about')}
            onContactEditor={openContactForDesk}
          />
        ) : currentPage === 'contact' ? (
          <ContactPage
            initialDeskEmail={contactDeskEmail}
            onNavigateAbout={() => navigateToPage('about')}
            onNavigatePolicy={() => navigateToPage('privacy-policy')}
          />
        ) : currentPage === 'terms' ? (
          <TermsPage
            onNavigatePolicy={() => navigateToPage('privacy-policy')}
            onNavigateContact={() => navigateToPage('contact')}
          />
        ) : currentPage === 'post' ? (
          <DirectPostPage
            articles={articles}
            authUser={authUser}
            authReady={authReady}
            isEditorAuthorized={isEditorAuthorized}
            onSignInEditor={async () => {
              await signInEditorWithGoogle();
            }}
            onSignOutEditor={signOutEditor}
            onBackHome={() => navigateToPage('home')}
            onOpenSyndication={() => openNewsroom('syndication')}
            onPublishArticle={publishArticleHandler}
            onDeleteArticle={deleteArticleHandler}
            onPreviewArticle={(article) => openArticle(article)}
          />
        ) : loading ? (
          <div className="py-20 text-center text-sm text-neutral-500">
            Loading edition from {SITE_CONFIG.domain}...
          </div>
        ) : articles.length === 0 ? (
          <section
            className="py-16 sm:py-24 max-w-2xl mx-auto text-center"
            aria-label="Empty newsroom edition"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
              {SITE_CONFIG.domain} · Editorial Edition Ready
            </p>
            <h1 className="mt-3 font-serif text-3xl sm:text-5xl font-bold tracking-tight text-neutral-950 [text-wrap:balance]">
              Ready for Your Own Reporting
            </h1>
            <p className="mt-4 text-base sm:text-lg text-neutral-600 leading-relaxed">
              Write and post your own news reports with photos directly under CEO
              &amp; Editor-in-Chief Muhammad Nadeem Faisal — every published story
              appears immediately on the front page and updates RSS and Google News
              Sitemaps.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigateToPage('post')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
              >
                <PenSquare className="w-4 h-4" />
                <span>Write &amp; Post Directly</span>
              </button>

              <button
                type="button"
                onClick={() => openNewsroom('syndication')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-neutral-800 bg-white border border-neutral-300 hover:border-neutral-500 rounded-md transition-colors cursor-pointer"
              >
                <Rss className="w-4 h-4 text-red-800" />
                <span>RSS, Sitemap &amp; Download ZIP</span>
              </button>
            </div>
          </section>
        ) : isFilteredView ? (
          <section aria-label="Filtered news stories">
            <div className="pb-5 border-b border-neutral-200 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
                  {showSavedOnly
                    ? 'Reading List'
                    : activeCategory === 'All'
                      ? 'Search Results'
                      : `${activeCategory} Desk`}
                </p>
                <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-bold text-neutral-950">
                  {showSavedOnly
                    ? 'Saved Articles'
                    : activeCategory === 'All'
                      ? `Results for “${searchQuery.trim()}”`
                      : `${activeCategory} News`}
                </h1>
              </div>
              <p className="text-xs text-neutral-500 tabular-nums">
                {filteredArticles.length}{' '}
                {filteredArticles.length === 1 ? 'story' : 'stories'}
              </p>
            </div>

            {filteredArticles.length === 0 ? (
              <div className="py-16 text-center max-w-md mx-auto">
                <h2 className="font-serif text-xl font-semibold text-neutral-950">
                  {showSavedOnly
                    ? 'No saved articles yet'
                    : 'No matching stories found'}
                </h2>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  {showSavedOnly
                    ? 'Click the bookmark icon on any report to save it here for later reading.'
                    : 'Try another keyword, return to the front page, or publish a new story in this section.'}
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
                  >
                    Browse Front Page
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToPage('post')}
                    className="px-4 py-2 text-xs font-medium text-neutral-800 border border-neutral-300 hover:border-neutral-500 rounded-md transition-colors cursor-pointer"
                  >
                    Direct Post
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
                {filteredArticles.map((article) => {
                  const isSaved = savedIds.includes(article.id);
                  return (
                    <article
                      key={article.id}
                      className="group flex flex-col justify-between pb-6 border-b border-neutral-200"
                    >
                      <div>
                        {article.imageUrl && (
                          <button
                            type="button"
                            onClick={() => openArticle(article)}
                            className="block w-full text-left mb-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-md"
                          >
                            <EditorialImage
                              src={article.imageUrl}
                              alt={article.title}
                              aspectClassName="aspect-[4/3]"
                              className="rounded-md"
                            />
                          </button>
                        )}
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                          <span className="font-semibold text-red-800">
                            {article.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{article.location}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{article.publishedAt}</span>
                        </div>
                        <h2
                          dir="auto"
                          className="font-serif text-xl font-bold text-neutral-950 leading-snug [text-wrap:balance]"
                        >
                          <button
                            type="button"
                            onClick={() => openArticle(article)}
                            className="w-full text-start hover:text-red-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
                          >
                            {article.title}
                          </button>
                        </h2>
                        <p
                          dir="auto"
                          className="mt-2.5 text-sm text-neutral-600 leading-relaxed line-clamp-3"
                        >
                          {article.deck}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 flex items-center justify-between text-xs text-neutral-500">
                        <span className="tabular-nums">
                          By {article.author} · {article.readTime}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleBookmark(article.id)}
                          aria-label={
                            isSaved
                              ? `Remove ${article.title} from saved`
                              : `Save ${article.title}`
                          }
                          className="p-1.5 text-neutral-500 hover:text-neutral-950 rounded-md transition-colors cursor-pointer"
                        >
                          <Bookmark
                            className="w-4 h-4"
                            fill={isSaved ? 'currentColor' : 'none'}
                          />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-12 sm:space-y-16">
            {/* Tier 1: Lead Story + Dispatches Sidebar */}
            {leadArticle && (
              <section
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch"
                aria-label="Top Story"
              >
                <article className="lg:col-span-8 group flex flex-col justify-between">
                  <div>
                    {leadArticle.imageUrl && (
                      <button
                        type="button"
                        onClick={() => openArticle(leadArticle)}
                        className="block w-full text-left mb-5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-md"
                      >
                        <EditorialImage
                          src={leadArticle.imageUrl}
                          alt={leadArticle.title}
                          aspectClassName="aspect-[16/9]"
                          className="rounded-md"
                        />
                      </button>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="font-semibold text-red-800 uppercase tracking-wider">
                        Lead Report · {leadArticle.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{leadArticle.location}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{leadArticle.publishedAt}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{leadArticle.readTime}</span>
                    </div>

                    <h1
                      dir="auto"
                      className="mt-2.5 font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.12] tracking-tight text-neutral-950 [text-wrap:balance]"
                    >
                      <button
                        type="button"
                        onClick={() => openArticle(leadArticle)}
                        className="w-full text-start hover:text-red-800 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:underline"
                      >
                        {leadArticle.title}
                      </button>
                    </h1>

                    <p
                      dir="auto"
                      className="mt-3.5 text-base sm:text-lg text-neutral-600 leading-relaxed max-w-3xl"
                    >
                      {leadArticle.deck}
                    </p>

                    {!leadArticle.imageUrl && leadArticle.body[0] && (
                      <p
                        dir="auto"
                        className="mt-4 text-sm sm:text-base text-neutral-700 leading-relaxed max-w-3xl line-clamp-4"
                      >
                        {leadArticle.body[0]}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-200 flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-neutral-700">
                      By {leadArticle.author}
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleBookmark(leadArticle.id)}
                        aria-label={
                          savedIds.includes(leadArticle.id)
                            ? 'Remove lead story from saved'
                            : 'Save lead story'
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition-colors cursor-pointer"
                      >
                        <Bookmark
                          className="w-4 h-4"
                          fill={
                            savedIds.includes(leadArticle.id)
                              ? 'currentColor'
                              : 'none'
                          }
                        />
                        <span>
                          {savedIds.includes(leadArticle.id) ? 'Saved' : 'Save'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openArticle(leadArticle)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-950 hover:text-red-800 transition-colors cursor-pointer"
                      >
                        <span>Read Full Report</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>

                <aside
                  className="lg:col-span-4 lg:border-l lg:border-neutral-200 lg:pl-8 flex flex-col justify-between"
                  aria-label="Latest Dispatches"
                >
                  <div>
                    <div className="pb-3 border-b border-neutral-950 flex items-baseline justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950">
                        Latest Dispatches
                      </h2>
                      <button
                        type="button"
                        onClick={() => navigateToPage('post')}
                        className="text-xs font-medium text-red-800 hover:text-red-950 cursor-pointer"
                      >
                        + Direct Post
                      </button>
                    </div>

                    {sidebarDispatches.length === 0 ? (
                      <div className="py-6 text-xs text-neutral-500 leading-relaxed">
                        Additional stories you publish will appear here automatically
                        and syndicate via <span className="font-mono">/rss.xml</span>.
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-200">
                        {sidebarDispatches.map((story) => (
                          <article key={story.id} className="py-4 first:pt-4 last:pb-2">
                            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5">
                              <span className="font-semibold text-red-800">
                                {story.category}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{story.location}</span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{story.publishedAt}</span>
                            </div>
                            <h3
                              dir="auto"
                              className="font-serif text-lg font-semibold text-neutral-950 leading-snug"
                            >
                              <button
                                type="button"
                                onClick={() => openArticle(story)}
                                className="w-full text-start hover:text-red-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
                              >
                                {story.title}
                              </button>
                            </h3>
                            <p
                              dir="auto"
                              className="mt-1.5 text-xs sm:text-sm text-neutral-600 leading-relaxed line-clamp-2"
                            >
                              {story.deck}
                            </p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 p-5 bg-neutral-50 border border-neutral-200 rounded-md">
                    <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
                      Morning Briefing
                    </p>
                    <p className="mt-1.5 font-serif text-base font-semibold text-neutral-950">
                      Get the essential global edition in your inbox.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubscribeOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-950 hover:text-red-800 transition-colors cursor-pointer"
                    >
                      <span>Subscribe to NEWS WORLD</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </aside>
              </section>
            )}

            {/* Tier 2: Featured Reports */}
            {featureArticles.length > 0 && (
              <section
                className="pt-10 border-t border-neutral-200"
                aria-label="Featured Reports"
              >
                <div className="flex items-baseline justify-between mb-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950">
                    Featured Reports
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {featureArticles.map((article) => {
                    const isSaved = savedIds.includes(article.id);
                    return (
                      <article
                        key={article.id}
                        className="group flex flex-col justify-between"
                      >
                        <div>
                          {article.imageUrl && (
                            <button
                              type="button"
                              onClick={() => openArticle(article)}
                              className="block w-full text-left mb-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-md"
                            >
                              <EditorialImage
                                src={article.imageUrl}
                                alt={article.title}
                                aspectClassName="aspect-[4/3]"
                                className="rounded-md"
                              />
                            </button>
                          )}

                          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                            <span className="font-semibold text-red-800">
                              {article.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{article.location}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{article.readTime}</span>
                          </div>

                          <h3
                            dir="auto"
                            className="font-serif text-xl font-bold text-neutral-950 leading-snug [text-wrap:balance]"
                          >
                            <button
                              type="button"
                              onClick={() => openArticle(article)}
                              className="w-full text-start hover:text-red-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
                            >
                              {article.title}
                            </button>
                          </h3>

                          <p
                            dir="auto"
                            className="mt-2 text-sm text-neutral-600 leading-relaxed"
                          >
                            {article.deck}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                          <span>By {article.author}</span>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(article.id)}
                            aria-label={
                              isSaved
                                ? `Remove ${article.title} from saved`
                                : `Save ${article.title}`
                            }
                            className="p-1 text-neutral-500 hover:text-neutral-950 transition-colors cursor-pointer"
                          >
                            <Bookmark
                              className="w-4 h-4"
                              fill={isSaved ? 'currentColor' : 'none'}
                            />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Tier 3: Additional Archive Dispatches */}
            {archiveDispatches.length > 0 && (
              <section
                className="pt-10 border-t border-neutral-200"
                aria-label="More Reports"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-950">
                    More Reports
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-600">
                    {CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleSelectCategory(category)}
                        className="hover:text-neutral-950 hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 divide-y divide-neutral-200 border-y border-neutral-200">
                  {archiveDispatches.map((article) => {
                    const isSaved = savedIds.includes(article.id);
                    return (
                      <article
                        key={article.id}
                        className="py-5 flex items-start justify-between gap-5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5">
                            <span className="font-semibold text-red-800">
                              {article.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{article.location}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{article.publishedAt}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{article.readTime}</span>
                          </div>
                          <h3
                            dir="auto"
                            className="font-serif text-lg font-bold text-neutral-950 leading-snug"
                          >
                            <button
                              type="button"
                              onClick={() => openArticle(article)}
                              className="w-full text-start hover:text-red-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
                            >
                              {article.title}
                            </button>
                          </h3>
                          <p
                            dir="auto"
                            className="mt-1.5 text-sm text-neutral-600 leading-relaxed line-clamp-2"
                          >
                            {article.deck}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-3 shrink-0">
                          {article.imageUrl && (
                            <button
                              type="button"
                              onClick={() => openArticle(article)}
                              className="w-24 sm:w-28 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-md"
                              aria-label={`Read ${article.title}`}
                            >
                              <EditorialImage
                                src={article.imageUrl}
                                alt={article.title}
                                aspectClassName="aspect-[4/3]"
                                className="rounded-md"
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleBookmark(article.id)}
                            aria-label={
                              isSaved
                                ? `Remove ${article.title} from saved`
                                : `Save ${article.title}`
                            }
                            className="p-1.5 text-neutral-400 hover:text-neutral-950 transition-colors cursor-pointer"
                          >
                            <Bookmark
                              className="w-4 h-4"
                              fill={isSaved ? 'currentColor' : 'none'}
                            />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Editorial Broadsheet Footer with Compliance Pages & Connected Email Desks */}
      <footer className="border-t border-neutral-200 bg-neutral-50 mt-12 pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-neutral-200">
            <div className="md:col-span-5">
              <span className="font-serif text-xl font-bold uppercase tracking-[0.12em] text-neutral-950">
                NEWS WORLD
              </span>
              <p className="mt-2 text-xs text-neutral-600 max-w-md leading-relaxed">
                Published on{' '}
                <span className="font-semibold text-neutral-900">
                  newsworld.life
                </span>{' '}
                under CEO &amp; Editor-in-Chief Muhammad Nadeem Faisal — promoting
                public awareness based on truth, honesty, justice, and global peace.
              </p>

              {/* Dedicated Governance & Compliance Links */}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-neutral-900">
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToPage('about');
                  }}
                  className="hover:text-red-800 underline underline-offset-4 transition-colors"
                >
                  About Us
                </a>
                <a
                  href="/privacy-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToPage('privacy-policy');
                  }}
                  className="hover:text-red-800 underline underline-offset-4 transition-colors"
                >
                  Privacy &amp; Editorial Policy
                </a>
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToPage('terms');
                  }}
                  className="hover:text-red-800 underline underline-offset-4 transition-colors"
                >
                  Terms of Use
                </a>
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToPage('contact');
                  }}
                  className="inline-flex items-center gap-1 hover:text-red-800 underline underline-offset-4 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact Editor</span>
                </a>
              </div>

              {/* Syndication & Publishing Links */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-neutral-600">
                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-red-800 transition-colors"
                >
                  <Rss className="w-3.5 h-3.5 text-red-800" />
                  <span>RSS Feed</span>
                </a>
                <a
                  href="/news-sitemap.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-red-800 transition-colors"
                >
                  News Sitemap
                </a>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-red-800 transition-colors"
                >
                  XML Sitemap
                </a>
                <a
                  href="/ads.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-red-800 transition-colors"
                >
                  ads.txt
                </a>
                <button
                  type="button"
                  onClick={() => navigateToPage('post')}
                  className="hover:text-red-800 transition-colors cursor-pointer"
                >
                  Direct Post
                </button>
                <button
                  type="button"
                  disabled={downloadingZip}
                  onClick={async () => {
                    setDownloadingZip(true);
                    try {
                      await downloadProjectZip();
                    } finally {
                      setDownloadingZip(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-neutral-900 hover:text-red-800 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {downloadingZip ? 'Preparing ZIP...' : 'Download Source (.zip)'}
                  </span>
                </button>
              </div>
            </div>

            <div className="md:col-span-7">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-950 mb-3">
                Editorial &amp; Office Directory
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {EDITORIAL_DESKS.map((desk) => (
                  <button
                    key={desk.id}
                    type="button"
                    onClick={() => openContactForDesk(desk.email)}
                    className="text-left p-3 bg-white border border-neutral-200 hover:border-neutral-400 rounded-md transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-neutral-950">
                      {desk.name}
                    </p>
                    <p className="text-[11px] font-mono text-red-800 truncate mt-0.5">
                      {desk.email}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-neutral-600">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToPage('home');
                  handleSelectCategory('All');
                }}
                className="hover:text-neutral-950 transition-colors"
              >
                Front Page
              </a>
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToPage('about');
                }}
                className="hover:text-neutral-950 transition-colors"
              >
                About Us
              </a>
              <a
                href="/privacy-policy"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToPage('privacy-policy');
                }}
                className="hover:text-neutral-950 transition-colors"
              >
                Privacy &amp; Editorial Policy
              </a>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleSelectCategory(category)}
                  className="hover:text-neutral-950 transition-colors cursor-pointer"
                >
                  {category}
                </button>
              ))}
            </div>

            <p className="text-xs text-neutral-500 tabular-nums">
              © 2026 NEWS WORLD · newsworld.life
            </p>
          </div>
        </div>
      </footer>

      <ArticleModal
        article={selectedArticle}
        allArticles={articles}
        isBookmarked={
          selectedArticle ? savedIds.includes(selectedArticle.id) : false
        }
        onToggleBookmark={toggleBookmark}
        onSelectArticle={(article) => openArticle(article)}
        onClose={closeArticle}
      />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />

      <NewsroomModal
        isOpen={newsroomOpen}
        initialTab={newsroomTab}
        articles={articles}
        authUser={authUser}
        isEditorAuthorized={isEditorAuthorized}
        onSignInEditor={async () => {
          await signInEditorWithGoogle();
        }}
        onSignOutEditor={signOutEditor}
        onClose={() => setNewsroomOpen(false)}
        onPublishArticle={publishArticleHandler}
        onDeleteArticle={deleteArticleHandler}
      />

      <ContactDeskModal
        isOpen={contactOpen}
        initialDeskEmail={contactDeskEmail}
        onClose={() => setContactOpen(false)}
      />

      <StickyAnchorAd />
    </div>
  );
}
