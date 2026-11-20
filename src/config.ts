export type Category =
  | 'World'
  | 'Editorial'
  | 'Politics'
  | 'Pakistan'
  | 'Business'
  | 'Technology'
  | 'Science'
  | 'Sports'
  | 'Culture';

export type PageRoute = 'home' | 'about' | 'privacy-policy' | 'contact' | 'terms' | 'post';

export interface Article {
  id: string;
  title: string;
  deck: string;
  category: Category;
  author: string;
  authorUid?: string;
  location: string;
  publishedAt: string;
  isoDate: string;
  readTime: string;
  status?: 'published';
  keywords: string[];
  imageUrl?: string;
  imageCaption?: string;
  pullQuote?: string;
  body: string[];
}

export interface EditorialDesk {
  id: string;
  name: string;
  officeLabel: string;
  email: string;
  role: string;
}

export const SITE_CONFIG = {
  brandName: 'NEWS WORLD',
  domain: 'newsworld.life',
  baseUrl: 'https://newsworld.life',
  rssPath: '/rss.xml',
  atomPath: '/feed.xml',
  newsSitemapPath: '/news-sitemap.xml',
  sitemapPath: '/sitemap.xml',
  robotsPath: '/robots.txt',
  adsTxtPath: '/ads.txt',
  publisherName: 'Muhammad Nadeem Faisal',
  adminName: 'Muhammad Nadeem',
  editorDirectEmail: 'oneworldmovement6@gmail.com',
  adsensePublisherId: 'pub-7273606592988187',
  adsenseClientId: 'ca-pub-7273606592988187',
  adsenseCustomerId: '4975775502',
  // Paste your Google AdSense Display/Anchor Ad Unit Slot ID below (e.g. '1234567890')
  adsenseAnchorSlotId: '',
} as const;

export const EDITORIAL_DESKS: EditorialDesk[] = [
  {
    id: 'editor-direct',
    name: 'CEO & Editor-in-Chief',
    officeLabel: 'Muhammad Nadeem Faisal · Direct Desk',
    email: 'oneworldmovement6@gmail.com',
    role: 'Direct reader feedback, corrections, complaints, and privacy inquiries',
  },
  {
    id: 'editor',
    name: 'Editor Office',
    officeLabel: 'Editorial & Submissions',
    email: 'editor@newsworld.life',
    role: 'Newsroom stories, op-ed pitches, and editorial corrections',
  },
  {
    id: 'info',
    name: 'Info Office',
    officeLabel: 'General Information & Press',
    email: 'info@newsworld.life',
    role: 'Syndication requests, RSS licensing, and general press inquiries',
  },
  {
    id: 'contact',
    name: 'Contact Office',
    officeLabel: 'Reader Support',
    email: 'contact@newsworld.life',
    role: 'Reader feedback, newsletter support, and partnership inquiries',
  },
  {
    id: 'admin',
    name: 'Admin Desk',
    officeLabel: 'Muhammad Nadeem · Site Operations',
    email: 'admin@newsworld.life',
    role: 'Domain infrastructure, technical publishing, and security',
  },
  {
    id: 'publisher',
    name: 'Nadeem Faisal',
    officeLabel: 'Executive Office',
    email: 'nadeem.faisal@newsworld.life',
    role: 'Executive editorial oversight and international bureau relations',
  },
];

export const CATEGORIES: Category[] = [
  'World',
  'Editorial',
  'Politics',
  'Pakistan',
  'Business',
  'Technology',
  'Science',
  'Sports',
  'Culture',
];
