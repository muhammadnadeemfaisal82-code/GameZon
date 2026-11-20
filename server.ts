import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import JSZip from 'jszip';
import { GoogleGenAI, Type } from '@google/genai';
import {
  CATEGORIES,
  EDITORIAL_DESKS,
  SITE_CONFIG,
  type Article,
  type Category,
} from './src/config.ts';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sanitizeSlug(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return cleaned.length >= 3 ? cleaned : `news-world-${Date.now().toString(36)}`;
}

interface SubscriberRecord {
  email: string;
  cadence: 'daily' | 'weekly';
  subscribedAt: string;
}

interface DeskMessageRecord {
  id: string;
  targetDesk: string;
  deskName: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  sentViaSmtp: boolean;
  createdAt: string;
}

interface NewsroomStore {
  articles: Article[];
  subscribers: SubscriberRecord[];
  messages: DeskMessageRecord[];
}

const PORT = Number(process.env.PORT) || 3000;
const SITE_URL = (process.env.SITE_URL || SITE_CONFIG.baseUrl).replace(/\/+$/, '');
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'newsroom.json');

function ensureStore(): NewsroomStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: NewsroomStore = {
      articles: [],
      subscribers: [],
      messages: [],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<NewsroomStore>;
    return {
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
      subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return {
      articles: [],
      subscribers: [],
      messages: [],
    };
  }
}

function saveStore(store: NewsroomStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 64);
  return `${base || 'article'}-${Date.now().toString(36)}`;
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.ZOHO_SMTP_USER && process.env.ZOHO_SMTP_PASS);
}

async function sendZohoEmail(options: {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  if (!isSmtpConfigured()) {
    return false;
  }
  const host = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com';
  const port = Number(process.env.ZOHO_SMTP_PORT) || 465;
  const user = process.env.ZOHO_SMTP_USER as string;
  const pass = process.env.ZOHO_SMTP_PASS as string;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"NEWS WORLD" <${user}>`,
    to: options.to,
    replyTo: options.replyTo,
    subject: options.subject,
    text: options.text,
  });
  return true;
}

function buildRssXml(articles: Article[]): string {
  const lastBuildDate = new Date().toUTCString();
  const itemsXml = articles
    .map((article) => {
      const link = `${SITE_URL}/article/${encodeURIComponent(article.id)}`;
      const pubDate = new Date(article.isoDate || Date.now()).toUTCString();
      const imageTag = article.imageUrl
        ? `<media:content url="${escapeXml(
            article.imageUrl.startsWith('http')
              ? article.imageUrl
              : `${SITE_URL}${article.imageUrl}`,
          )}" medium="image" />`
        : '';
      const keywordsTag = article.keywords
        .map((kw) => `<category>${escapeXml(kw)}</category>`)
        .join('');

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <dc:creator>${escapeXml(article.author)}</dc:creator>
      <category>${escapeXml(article.category)}</category>
      ${keywordsTag}
      <description>${escapeXml(article.deck)}</description>
      ${imageTag}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>NEWS WORLD — International Broadsheet</title>
    <link>${escapeXml(SITE_URL)}/</link>
    <atom:link href="${escapeXml(SITE_URL)}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Independent international reporting across world affairs, business, technology, science, and culture.</description>
    <language>en-us</language>
    <managingEditor>editor@newsworld.life (Editor Office)</managingEditor>
    <webMaster>admin@newsworld.life (Muhammad Nadeem)</webMaster>
    <copyright>Copyright ${new Date().getFullYear()} NEWS WORLD (${escapeXml(SITE_CONFIG.domain)})</copyright>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <ttl>15</ttl>
${itemsXml}
  </channel>
</rss>`;
}

function buildNewsSitemapXml(articles: Article[]): string {
  const urlsXml = articles
    .map((article) => {
      const loc = `${SITE_URL}/article/${encodeURIComponent(article.id)}`;
      const keywords = article.keywords.join(', ');
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>NEWS WORLD</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(article.isoDate)}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
      <news:keywords>${escapeXml(keywords)}</news:keywords>
    </news:news>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlsXml}
</urlset>`;
}

function buildSitemapXml(articles: Article[]): string {
  const staticRoutes = [
    `${SITE_URL}/`,
    `${SITE_URL}/about`,
    `${SITE_URL}/privacy-policy`,
    `${SITE_URL}/contact`,
    `${SITE_URL}/terms`,
    ...CATEGORIES.map((c) => `${SITE_URL}/?section=${encodeURIComponent(c)}`),
  ];
  const staticXml = staticRoutes
    .map(
      (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>`,
    )
    .join('\n');

  const articleXml = articles
    .map(
      (article) => `  <url>
    <loc>${escapeXml(`${SITE_URL}/article/${encodeURIComponent(article.id)}`)}</loc>
    <lastmod>${escapeXml(article.isoDate)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${articleXml}
</urlset>`;
}

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function persistUploadedImage(articleId: string, rawImageUrl?: string): string | undefined {
  const trimmed = rawImageUrl?.trim();
  if (!trimmed) return undefined;
  const match = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/i.exec(
    trimmed,
  );
  if (!match) {
    return trimmed;
  }
  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const filename = `${articleId}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  ensureStore();
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Google AdSense Authorized Digital Sellers
  app.get('/ads.txt', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(
      `google.com, ${SITE_CONFIG.adsensePublisherId}, DIRECT, f08c47fec0942fa0\n`,
    );
  });

  // Worldwide Crawler & Syndication Routes
  app.get(['/rss.xml', '/feed.xml'], (_req, res) => {
    const store = ensureStore();
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buildRssXml(store.articles));
  });

  app.get('/news-sitemap.xml', (_req, res) => {
    const store = ensureStore();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buildNewsSitemapXml(store.articles));
  });

  app.get('/sitemap.xml', (_req, res) => {
    const store = ensureStore();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buildSitemapXml(store.articles));
  });

  app.get('/robots.txt', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(
      [
        'User-agent: Mediapartners-Google',
        'Allow: /',
        '',
        'User-agent: Googlebot',
        'Allow: /',
        '',
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        `Sitemap: ${SITE_URL}/news-sitemap.xml`,
      ].join('\n'),
    );
  });

  // Newsroom & Publishing API (local JSON persistence, zero Firebase)
  app.get('/api/newsroom/status', (_req, res) => {
    const store = ensureStore();
    res.json({
      brandName: SITE_CONFIG.brandName,
      domain: SITE_CONFIG.domain,
      siteUrl: SITE_URL,
      publishedCount: store.articles.length,
      subscriberCount: store.subscribers.length,
      dispatchCount: store.messages.length,
      smtpConfigured: isSmtpConfigured(),
      desks: EDITORIAL_DESKS,
      feeds: {
        rss: `${SITE_URL}/rss.xml`,
        atom: `${SITE_URL}/feed.xml`,
        newsSitemap: `${SITE_URL}/news-sitemap.xml`,
        sitemap: `${SITE_URL}/sitemap.xml`,
        robots: `${SITE_URL}/robots.txt`,
      },
    });
  });

  // Download clean project source ZIP (excludes node_modules, dist, .git, secrets, and temp screenshots)
  app.get('/api/download-source', async (_req, res) => {
    try {
      const zip = new JSZip();
      const rootDir = process.cwd();

      const rootFiles = [
        '.env.example',
        '.gitignore',
        'eslint.config.mjs',
        'firebase-applet-config.json',
        'firebase-blueprint.json',
        'firestore.rules',
        'index.html',
        'metadata.json',
        'package.json',
        'server.ts',
        'tsconfig.json',
        'vite.config.ts',
      ];

      for (const fileName of rootFiles) {
        const fullPath = path.join(rootDir, fileName);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          zip.file(fileName, fs.readFileSync(fullPath));
        }
      }

      const adsTxtPath = path.join(rootDir, 'public', 'ads.txt');
      if (fs.existsSync(adsTxtPath)) {
        zip.file('public/ads.txt', fs.readFileSync(adsTxtPath));
      }

      const addDirectory = (dirPath: string, zipPrefix: string) => {
        if (!fs.existsSync(dirPath)) return;
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === '.git' ||
            entry.name === 'aistudio'
          ) {
            continue;
          }
          const fullEntry = path.join(dirPath, entry.name);
          const zipEntryPath = `${zipPrefix}/${entry.name}`;
          if (entry.isDirectory()) {
            addDirectory(fullEntry, zipEntryPath);
          } else if (entry.isFile()) {
            zip.file(zipEntryPath, fs.readFileSync(fullEntry));
          }
        }
      };

      addDirectory(path.join(rootDir, 'src'), 'src');
      if (fs.existsSync(STORE_PATH)) {
        zip.file('data/newsroom.json', fs.readFileSync(STORE_PATH));
      }
      addDirectory(UPLOADS_DIR, 'data/uploads');

      const buffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="newsworld-life-source.zip"',
      );
      res.setHeader('Content-Length', String(buffer.length));
      res.send(buffer);
    } catch {
      res.status(500).json({ error: 'Unable to package project source files.' });
    }
  });

  // Gemini AI Auto-Fill Metadata from Full Article (Server-Side)
  app.post('/api/ai/autofill-article', async (req, res) => {
    const body = req.body as { articleText?: string };
    const articleText = (body.articleText || '').trim();

    if (articleText.length < 30) {
      res.status(400).json({
        error: 'Please paste your full article text (at least 30 characters) first.',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(500).json({
        error: 'Gemini API key is not configured in server secrets.',
      });
      return;
    }

    const hasUrdu = /[\u0600-\u06FF]/.test(articleText);

    try {
      const requestConfig = {
        contents: `Analyze the following news article/editorial and generate ONLY metadata for publication on NEWS WORLD (${SITE_CONFIG.domain}).\n\nArticle text:\n${articleText.slice(0, 24000)}`,
        config: {
          systemInstruction: [
            'You are the Senior Managing Desk Editor at NEWS WORLD (newsworld.life), led by CEO & Editor-in-Chief Muhammad Nadeem Faisal.',
            'Read the full article text carefully whether written in Urdu or English.',
            'NEVER rewrite, alter, or return the article body itself — only produce accurate metadata from the submitted text.',
            'If the article is written in Urdu (contains Urdu script), detect language as "ur" and write the Headline, 2-sentence Summary, Location, Pull Quote, and Social Media Caption in natural, dignified journalistic Urdu; if written in English, detect language as "en" and write them in English.',
            'The URL slug MUST ALWAYS be clean English lowercase kebab-case ASCII words (e.g., "pakistan-economic-reform-outlook"), even when the article is in Urdu.',
            'Choose the single best Category strictly from: Editorial, World, Politics, Pakistan, Business, Technology, Science, Sports, Culture.',
            'Keep the Summary/Excerpt strictly to 2 concise journalistic sentences (under 550 characters).',
            'Provide 4 to 7 relevant SEO tags/keywords.',
            'For socialCaption, write an engaging 2-3 sentence social media post suitable for Facebook, X, and WhatsApp (matching the article language), WITHOUT adding any URL (the platform appends the live link automatically).',
            'For socialHashtags, provide 3 to 5 relevant hashtags starting with #.',
          ].join(' '),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              language: {
                type: Type.STRING,
                description: 'Detected article language: "ur" for Urdu or "en" for English.',
              },
              title: {
                type: Type.STRING,
                description: 'Strong journalistic headline in the article language.',
              },
              deck: {
                type: Type.STRING,
                description: 'Concise 2-sentence summary/excerpt in the article language.',
              },
              category: {
                type: Type.STRING,
                description: 'Best section from Editorial, World, Politics, Pakistan, Business, Technology, Science, Sports, Culture.',
              },
              location: {
                type: Type.STRING,
                description: 'Dateline city or desk (e.g. Islamabad, London, Global Desk).',
              },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 to 7 SEO tags/keywords.',
              },
              slug: {
                type: Type.STRING,
                description: 'Clean SEO-friendly English lowercase kebab-case URL slug.',
              },
              pullQuote: {
                type: Type.STRING,
                description: 'One impactful quote or key takeaway sentence from the article.',
              },
              socialCaption: {
                type: Type.STRING,
                description: 'Engaging social media caption without URL.',
              },
              socialHashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 hashtags starting with #.',
              },
            },
            required: [
              'language',
              'title',
              'deck',
              'category',
              'location',
              'keywords',
              'slug',
              'socialCaption',
              'socialHashtags',
            ],
          },
        },
      };

      const candidateModels = [
        'gemini-4-hydrogen',
        'gemini-4-hydrogen',
        'gemini-3.1-flash-lite',
      ];
      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null =
        null;
      let lastError: unknown;

      for (let i = 0; i < candidateModels.length; i++) {
        try {
          response = await ai.models.generateContent({
            model: candidateModels[i],
            ...requestConfig,
          });
          break;
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          const isTransient =
            msg.includes('503') ||
            msg.includes('UNAVAILABLE') ||
            msg.includes('429');
          if (!isTransient || i === candidateModels.length - 1) {
            throw err;
          }
          await new Promise((r) => setTimeout(r, 900 * (i + 1)));
        }
      }

      if (!response) {
        throw lastError || new Error('Empty Gemini response.');
      }

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText) as {
        language?: string;
        title?: string;
        deck?: string;
        category?: string;
        location?: string;
        keywords?: string[];
        slug?: string;
        pullQuote?: string;
        socialCaption?: string;
        socialHashtags?: string[];
      };

      const isUrdu =
        parsed.language === 'ur' || (hasUrdu && parsed.language !== 'en');

      const matchedCategory =
        CATEGORIES.find(
          (cat) => cat.toLowerCase() === (parsed.category || '').trim().toLowerCase(),
        ) || 'Editorial';

      const cleanSlug = sanitizeSlug(parsed.slug || '');
      const cleanAuthor = isUrdu
        ? 'محمد ندیم فیصل (سی ای او و ایڈیٹر انچیف، نیوز ورلڈ)'
        : 'Muhammad Nadeem Faisal (CEO & Editor-in-Chief, NEWS WORLD)';

      const cleanKeywords = Array.isArray(parsed.keywords)
        ? parsed.keywords
            .map((k) => String(k).trim().slice(0, 60))
            .filter(Boolean)
            .slice(0, 8)
        : [matchedCategory.toLowerCase()];

      const cleanHashtags = Array.isArray(parsed.socialHashtags)
        ? parsed.socialHashtags
            .map((h) => {
              const t = String(h).trim().replace(/\s+/g, '');
              return t.startsWith('#') ? t : `#${t}`;
            })
            .filter((h) => h.length > 1)
            .slice(0, 5)
        : ['#NewsWorld', `#${matchedCategory}`];

      res.json({
        language: isUrdu ? 'ur' : 'en',
        title: String(parsed.title || '').trim().slice(0, 240),
        deck: String(parsed.deck || '').trim().slice(0, 600),
        category: matchedCategory,
        location: String(parsed.location || (isUrdu ? 'اسلام آباد' : 'Global Desk'))
          .trim()
          .slice(0, 120),
        author: cleanAuthor,
        keywords: cleanKeywords,
        slug: cleanSlug,
        pullQuote: String(parsed.pullQuote || '').trim().slice(0, 600),
        socialCaption: String(parsed.socialCaption || '').trim(),
        socialHashtags: cleanHashtags,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({
        error: msg || 'Gemini AI could not process the article right now.',
      });
    }
  });

  app.get('/api/articles', (_req, res) => {
    const store = ensureStore();
    res.json({
      domain: SITE_CONFIG.domain,
      siteUrl: SITE_URL,
      articles: store.articles,
    });
  });

  app.post('/api/articles', (req, res) => {
    const body = req.body as {
      id?: string;
      slug?: string;
      title?: string;
      deck?: string;
      category?: Category;
      author?: string;
      location?: string;
      keywords?: string;
      content?: string;
      body?: string;
      pullQuote?: string;
      imageUrl?: string;
      imageCaption?: string;
    };

    const title = body.title?.trim() || '';
    const deck = body.deck?.trim() || '';
    const category = CATEGORIES.includes(body.category as Category)
      ? (body.category as Category)
      : 'World';
    const author = body.author?.trim() || 'Nadeem Faisal';
    const location = body.location?.trim() || 'Newsroom Desk';
    const rawParagraphs = (body.content || body.body || '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (title.length < 4 || deck.length < 6 || rawParagraphs.length === 0) {
      res.status(400).json({
        error: 'Headline, summary deck, and article body are required.',
      });
      return;
    }

    const keywords = (body.keywords || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const wordsCount = rawParagraphs.join(' ').split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(wordsCount / 180));
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const requestedSlug = (body.id || body.slug || '').trim();
    const articleId = requestedSlug ? sanitizeSlug(requestedSlug) : slugify(title);
    const resolvedImageUrl = persistUploadedImage(articleId, body.imageUrl);

    const newArticle: Article = {
      id: articleId,
      title,
      deck,
      category,
      author,
      location,
      publishedAt: formattedDate,
      isoDate: now.toISOString(),
      readTime: `${minutes} min read`,
      keywords: keywords.length > 0 ? keywords : [category.toLowerCase()],
      imageUrl: resolvedImageUrl,
      imageCaption: body.imageCaption?.trim() || undefined,
      pullQuote: body.pullQuote?.trim() || undefined,
      body: rawParagraphs,
    };

    const store = ensureStore();
    store.articles = [newArticle, ...store.articles];
    saveStore(store);

    res.status(201).json({
      article: newArticle,
      rssUrl: `${SITE_URL}/rss.xml`,
      newsSitemapUrl: `${SITE_URL}/news-sitemap.xml`,
    });
  });

  app.delete('/api/articles/:id', (req, res) => {
    const store = ensureStore();
    const target = store.articles.find((a) => a.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Article not found.' });
      return;
    }
    if (target.imageUrl && target.imageUrl.startsWith('/uploads/')) {
      const filename = path.basename(target.imageUrl);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // Ignore file cleanup errors
        }
      }
    }
    store.articles = store.articles.filter((a) => a.id !== req.params.id);
    saveStore(store);
    res.json({ deletedId: req.params.id, remaining: store.articles.length });
  });

  // Zoho Mail Subscriber Registration
  app.post('/api/subscribe', async (req, res) => {
    const { email, cadence } = req.body as {
      email?: string;
      cadence?: 'daily' | 'weekly';
    };
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const store = ensureStore();
    const validCadence = cadence === 'weekly' ? 'weekly' : 'daily';
    const existingIndex = store.subscribers.findIndex((s) => s.email === trimmed);
    const record: SubscriberRecord = {
      email: trimmed,
      cadence: validCadence,
      subscribedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      store.subscribers[existingIndex] = record;
    } else {
      store.subscribers.push(record);
    }
    saveStore(store);

    let sentViaSmtp = false;
    try {
      sentViaSmtp = await sendZohoEmail({
        to: trimmed,
        replyTo: 'contact@newsworld.life',
        subject: 'Welcome to NEWS WORLD — International Edition',
        text: `Thank you for subscribing to NEWS WORLD (${SITE_URL}).\n\nEdition Preference: ${
          validCadence === 'daily' ? 'Daily Morning' : 'Weekly Digest'
        }\nEditorial Inquiries: editor@newsworld.life\nReader Support: contact@newsworld.life`,
      });
    } catch {
      sentViaSmtp = false;
    }

    res.status(201).json({
      subscriber: record,
      sentViaSmtp,
      managedBy: 'contact@newsworld.life',
    });
  });

  // Zoho Mail Editorial & Contact Desk Dispatch
  app.post('/api/contact', async (req, res) => {
    const { targetDesk, senderName, senderEmail, subject, message } = req.body as {
      targetDesk?: string;
      senderName?: string;
      senderEmail?: string;
      subject?: string;
      message?: string;
    };

    const desk = EDITORIAL_DESKS.find((d) => d.email === targetDesk);
    if (!desk) {
      res.status(400).json({ error: 'Select a valid @newsworld.life desk.' });
      return;
    }
    const cleanName = (senderName || '').trim();
    const cleanEmail = (senderEmail || '').trim();
    const cleanSubject = (subject || '').trim();
    const cleanMessage = (message || '').trim();

    if (!cleanName || !cleanEmail.includes('@') || !cleanSubject || cleanMessage.length < 5) {
      res.status(400).json({
        error: 'Name, valid sender email, subject, and message are required.',
      });
      return;
    }

    let sentViaSmtp = false;
    try {
      sentViaSmtp = await sendZohoEmail({
        to: desk.email,
        replyTo: cleanEmail,
        subject: `[NEWS WORLD Desk: ${desk.name}] ${cleanSubject}`,
        text: `Sender: ${cleanName} <${cleanEmail}>\nTarget Desk: ${desk.email}\nDomain: ${SITE_URL}\n\n${cleanMessage}`,
      });
    } catch {
      sentViaSmtp = false;
    }

    const store = ensureStore();
    const record: DeskMessageRecord = {
      id: `msg-${Date.now().toString(36)}`,
      targetDesk: desk.email,
      deskName: desk.name,
      senderName: cleanName,
      senderEmail: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      sentViaSmtp,
      createdAt: new Date().toISOString(),
    };
    store.messages = [record, ...store.messages.slice(0, 49)];
    saveStore(store);

    res.status(201).json({
      record,
      sentViaSmtp,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEWS WORLD server running at http://0.0.0.0:${PORT} (${SITE_URL})`);
  });
}

createApp();
