import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { CATEGORIES, type Category, type PageRoute } from '../config';

interface HeaderProps {
  currentPage: PageRoute;
  activeCategory: Category | 'All';
  onNavigatePage: (page: PageRoute) => void;
  onSelectCategory: (category: Category | 'All') => void;
  onOpenContactEditor: () => void;
  onOpenSubscribe: () => void;
}

export function Header({
  currentPage,
  activeCategory,
  onNavigatePage,
  onSelectCategory,
  onOpenContactEditor,
  onOpenSubscribe,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handlePageNav = (page: PageRoute) => {
    onNavigatePage(page);
    setMobileMenuOpen(false);
  };

  const handleSectionNav = (category: Category | 'All') => {
    onSelectCategory(category);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Prominent single-line uppercase brand wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handlePageNav('home');
            onSelectCategory('All');
          }}
          className="font-serif text-2xl sm:text-3xl lg:text-[2rem] font-bold uppercase tracking-[0.12em] text-neutral-950 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-sm"
          aria-label="NEWS WORLD Home"
        >
          NEWS WORLD
        </a>

        {/* Zone 2: Clean single-line editorial & compliance navigation */}
        <nav
          className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-neutral-600"
          aria-label="Main navigation"
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handlePageNav('home');
            }}
            aria-current={currentPage === 'home' ? 'page' : undefined}
            className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-sm ${
              currentPage === 'home'
                ? 'text-neutral-950 font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            Front Page
            {currentPage === 'home' && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-red-800"
              />
            )}
          </a>

          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              handlePageNav('about');
            }}
            aria-current={currentPage === 'about' ? 'page' : undefined}
            className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-sm ${
              currentPage === 'about'
                ? 'text-neutral-950 font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            About Us
            {currentPage === 'about' && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-red-800"
              />
            )}
          </a>

          <a
            href="/privacy-policy"
            onClick={(e) => {
              e.preventDefault();
              handlePageNav('privacy-policy');
            }}
            aria-current={currentPage === 'privacy-policy' ? 'page' : undefined}
            className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-sm ${
              currentPage === 'privacy-policy'
                ? 'text-neutral-950 font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            Privacy &amp; Editorial Policy
            {currentPage === 'privacy-policy' && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-red-800"
              />
            )}
          </a>

          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              handlePageNav('contact');
            }}
            aria-current={currentPage === 'contact' ? 'page' : undefined}
            className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-sm ${
              currentPage === 'contact'
                ? 'text-neutral-950 font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            Contact Editor
            {currentPage === 'contact' && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-red-800"
              />
            )}
          </a>
        </nav>

        {/* Zone 3: Single primary action (+ compact mobile menu trigger) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenSubscribe}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Subscribe
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 text-neutral-700 hover:text-neutral-950 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-3 space-y-3">
          <nav className="flex flex-col gap-1" aria-label="Mobile pages">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handlePageNav('home');
              }}
              className={`px-3 py-2.5 text-sm rounded-md transition-colors ${
                currentPage === 'home'
                  ? 'bg-neutral-100 text-neutral-950 font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Front Page
            </a>
            <a
              href="/about"
              onClick={(e) => {
                e.preventDefault();
                handlePageNav('about');
              }}
              className={`px-3 py-2.5 text-sm rounded-md transition-colors ${
                currentPage === 'about'
                  ? 'bg-neutral-100 text-neutral-950 font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              About Us
            </a>
            <a
              href="/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                handlePageNav('privacy-policy');
              }}
              className={`px-3 py-2.5 text-sm rounded-md transition-colors ${
                currentPage === 'privacy-policy'
                  ? 'bg-neutral-100 text-neutral-950 font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Privacy &amp; Editorial Policy
            </a>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                handlePageNav('contact');
              }}
              className={`px-3 py-2.5 text-sm rounded-md transition-colors ${
                currentPage === 'contact'
                  ? 'bg-neutral-100 text-neutral-950 font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Contact Editor
            </a>
          </nav>

          <div className="pt-3 border-t border-neutral-200">
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              News Sections
            </p>
            <div className="flex flex-wrap gap-1.5 px-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleSectionNav(category)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                    currentPage === 'home' && activeCategory === category
                      ? 'bg-neutral-950 text-white font-semibold'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
