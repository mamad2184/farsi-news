import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpLeft,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Clock3,
  ExternalLink,
  Moon,
  Newspaper,
  Radio,
  RefreshCw,
  Search,
  Share2,
  Sun,
  X,
} from 'lucide-react'
import { API_BASE_URL, requestNews } from './api'
import './App.css'

const SAVED_ARTICLES_KEY = 'farsinews:saved-articles'
const NEWS_CACHE_KEY = 'farsinews:latest-news'
const THEME_STORAGE_KEY = 'farsinews:theme'
const NEWS_PAGE_SIZE = 10
const ISSUE_DATE = new Date()

const ARTICLE_DATE_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Tehran',
})

const ARTICLE_INDEX_FORMATTER = new Intl.NumberFormat('fa-IR', {
  minimumIntegerDigits: 2,
})

const UPDATE_TIME_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tehran',
})

function readNewsCache() {
  try {
    const cached = JSON.parse(
      localStorage.getItem(NEWS_CACHE_KEY) || 'null',
    )

    if (!cached || !Array.isArray(cached.articles)) {
      return {
        articles: [],
        updatedAt: null,
        totalCount: 0,
        nextPage: 2,
      }
    }

    const cachedArticles = cached.articles
      .filter(
        (article) =>
          article &&
          article.id != null &&
          article.title &&
          article.url,
      )
      .slice(0, NEWS_PAGE_SIZE)

    const totalCount = Number.isInteger(cached.totalCount)
      ? cached.totalCount
      : cachedArticles.length

    return {
      articles: cachedArticles,
      updatedAt: cached.updatedAt || null,
      totalCount,
      nextPage:
        Number.isInteger(cached.nextPage)
          ? cached.nextPage
          : cachedArticles.length >= totalCount
            ? null
            : 2,
    }
  } catch {
    return {
      articles: [],
      updatedAt: null,
      totalCount: 0,
      nextPage: 2,
    }
  }
}

function storeNewsCache(
  articles,
  totalCount,
  nextPage,
) {
  const updatedAt = new Date().toISOString()

  try {
    localStorage.setItem(
      NEWS_CACHE_KEY,
      JSON.stringify({
        articles: articles.slice(0, NEWS_PAGE_SIZE),
        totalCount,
        nextPage,
        updatedAt,
      }),
    )
  } catch {
    // Keep the feed usable if browser storage is unavailable.
  }

  return updatedAt
}

function formatUpdateTime(value) {
  if (!value) return 'هنوز دریافت نشده'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'زمان نامشخص'
    : UPDATE_TIME_FORMATTER.format(date)
}

function readSavedArticles() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SAVED_ARTICLES_KEY) || '[]',
    )

    return Array.isArray(saved)
      ? saved.filter(
          (article) =>
            article &&
            article.id != null &&
            article.title &&
            article.url,
        )
      : []
  } catch {
    return []
  }
}

function readTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}

function formatDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'زمان نامشخص'
  }

  return ARTICLE_DATE_FORMATTER.format(date)
}

function ArticleImage({ article, featured = false }) {
  return (
    <div
      className={`story-image${
        featured ? ' story-image-featured' : ''
      }`}
    >
      {article.image ? (
        <img
          src={article.image}
          alt=""
          loading={featured ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={featured ? 'high' : 'auto'}
          onError={(event) =>
            event.currentTarget.remove()
          }
        />
      ) : null}

      <span className="image-caption" aria-hidden="true">
        <Newspaper size={20} strokeWidth={1.5} />
        <span>روایت روز</span>
      </span>

      {featured ? (
        <span className="image-index">۰۱ / امروز</span>
      ) : null}
    </div>
  )
}

function StoryMeta({
  article,
  isSaved,
  onToggleSaved,
}) {
  return (
    <div className="story-meta">
      <span className="story-source">
        {article.source || 'خبرگزاری'}
      </span>

      <span className="story-time">
        <Clock3 size={14} aria-hidden="true" />

        <time dateTime={article.published_at}>
          {formatDate(article.published_at)}
        </time>
      </span>

      <button
        className={`save-story${
          isSaved ? ' save-story-active' : ''
        }`}
        type="button"
        onClick={() => onToggleSaved(article)}
        aria-label={
          isSaved
            ? `حذف از نشان‌شده‌ها: ${article.title}`
            : `ذخیره خبر: ${article.title}`
        }
        aria-pressed={isSaved}
        title={
          isSaved
            ? 'حذف از نشان‌شده‌ها'
            : 'ذخیره برای بعد'
        }
      >
        {isSaved ? (
          <BookmarkCheck size={18} />
        ) : (
          <Bookmark size={18} />
        )}
      </button>
    </div>
  )
}

function StoryCard({
  article,
  featured = false,
  isSaved,
  onToggleSaved,
  onOpen,
}) {
  return (
    <article
      className={
        featured ? 'lead-story' : 'story-card'
      }
    >
      <a
        className="story-image-link"
        href={article.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`خواندن خبر: ${article.title}`}
      >
        <ArticleImage
          article={article}
          featured={featured}
        />
      </a>

      <div className="story-content">
        <StoryMeta
          article={article}
          isSaved={isSaved}
          onToggleSaved={onToggleSaved}
        />

        <h3>
          <button
            className="story-title"
            type="button"
            onClick={() => onOpen(article)}
          >
            {article.title}
          </button>
        </h3>

        {article.description ? (
          <p className="story-description">
            {article.description}
          </p>
        ) : null}

        <a
          className="story-read-link"
          href={article.url}
          target="_blank"
          rel="noreferrer"
        >
          متن کامل در منبع خبر
          <ArrowUpLeft
            size={17}
            aria-hidden="true"
          />
        </a>
      </div>
    </article>
  )
}

function App() {
  const [initialNews] = useState(readNewsCache)

  const [articles, setArticles] = useState(
    initialNews.articles,
  )

  const [totalCount, setTotalCount] = useState(
    initialNews.totalCount,
  )

  const [nextPage, setNextPage] = useState(
    initialNews.nextPage,
  )

  const [savedArticles, setSavedArticles] =
    useState(readSavedArticles)

  const [lastUpdated, setLastUpdated] = useState(
    initialNews.updatedAt,
  )

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] =
    useState(false)

  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] =
    useState('')

  const [query, setQuery] = useState('')
  const [selectedSource, setSelectedSource] =
    useState('همه')

  const [activeView, setActiveView] =
    useState('latest')

  const [selectedArticle, setSelectedArticle] =
    useState(null)

  const [shareStatus, setShareStatus] = useState('')
  const [theme, setTheme] = useState(readTheme)

  const previousFocusRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        theme === 'dark'
          ? '#141d1d'
          : '#f4f2ec',
      )

    try {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        theme,
      )
    } catch {
      // Ignore storage errors.
    }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(
        SAVED_ARTICLES_KEY,
        JSON.stringify(savedArticles),
      )
    } catch {
      // Ignore storage errors.
    }
  }, [savedArticles])

  useEffect(() => {
    const controller = new AbortController()

    requestNews({
      page: 1,
      pageSize: NEWS_PAGE_SIZE,
      signal: controller.signal,
    })
      .then((data) => {
        const firstPageArticles =
          data.articles.slice(0, NEWS_PAGE_SIZE)

        const resolvedNextPage =
          Number.isInteger(data.nextPage)
            ? data.nextPage
            : firstPageArticles.length <
                data.totalCount
              ? 2
              : null

        setArticles(firstPageArticles)
        setTotalCount(data.totalCount)
        setNextPage(resolvedNextPage)

        setLastUpdated(
          storeNewsCache(
            firstPageArticles,
            data.totalCount,
            resolvedNextPage,
          ),
        )

        setError('')
      })
      .catch((requestError) => {
        if (
          requestError.name !== 'AbortError'
        ) {
          setError(
            'دریافت خبرها انجام نشد. اتصال به سرور خبر را بررسی کنید.',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selectedArticle) return undefined

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    function handleReaderKeys(event) {
      if (event.key === 'Escape') {
        setSelectedArticle(null)
        return
      }

      if (event.key !== 'Tab') return

      const focusable = [
        ...document.querySelectorAll(
          '.reader-dialog a[href], .reader-dialog button:not(:disabled)',
        ),
      ]

      const first = focusable[0]
      const last = focusable.at(-1)

      if (!first || !last) return

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener(
      'keydown',
      handleReaderKeys,
    )

    return () => {
      document.body.style.overflow =
        previousOverflow

      document.removeEventListener(
        'keydown',
        handleReaderKeys,
      )

      previousFocusRef.current?.focus()
    }
  }, [selectedArticle])

  async function refreshNews() {
    setIsLoading(true)
    setError('')
    setLoadMoreError('')

    try {
      const data = await requestNews({
        page: 1,
        pageSize: NEWS_PAGE_SIZE,
      })

      const firstPageArticles =
        data.articles.slice(0, NEWS_PAGE_SIZE)

      const resolvedNextPage =
        Number.isInteger(data.nextPage)
          ? data.nextPage
          : firstPageArticles.length <
              data.totalCount
            ? 2
            : null

      setArticles(firstPageArticles)
      setTotalCount(data.totalCount)
      setNextPage(resolvedNextPage)

      setLastUpdated(
        storeNewsCache(
          firstPageArticles,
          data.totalCount,
          resolvedNextPage,
        ),
      )
    } catch {
      setError(
        'به‌روزرسانی خبرها ناموفق بود. کمی بعد دوباره تلاش کنید.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function loadMoreArticles() {
    if (
      isLoadingMore ||
      nextPage === null ||
      !Number.isInteger(nextPage) ||
      articles.length >= totalCount
    ) {
      return
    }

    setIsLoadingMore(true)
    setLoadMoreError('')

    try {
      const data = await requestNews({
        page: nextPage,
        pageSize: NEWS_PAGE_SIZE,
      })

      const knownIds = new Set(
        articles.map((article) =>
          String(article.id),
        ),
      )

      const additionalArticles =
        data.articles.filter(
          (article) =>
            !knownIds.has(String(article.id)),
        )

      const mergedArticles = [
        ...articles,
        ...additionalArticles,
      ]

      const resolvedNextPage =
        Number.isInteger(data.nextPage)
          ? data.nextPage
          : mergedArticles.length <
              data.totalCount
            ? nextPage + 1
            : null

      setArticles(mergedArticles)
      setTotalCount(data.totalCount)
      setNextPage(resolvedNextPage)

      setLastUpdated(
        storeNewsCache(
          mergedArticles,
          data.totalCount,
          resolvedNextPage,
        ),
      )
    } catch {
      setLoadMoreError(
        'دریافت خبرهای بیشتر ناموفق بود.',
      )
    } finally {
      setIsLoadingMore(false)
    }
  }

  function toggleSavedArticle(article) {
    setSavedArticles((current) => {
      const isSaved = current.some(
        (saved) =>
          String(saved.id) ===
          String(article.id),
      )

      return isSaved
        ? current.filter(
            (saved) =>
              String(saved.id) !==
              String(article.id),
          )
        : [article, ...current]
    })
  }

  function changeView(view) {
    setActiveView(view)
    setSelectedSource('همه')
    setQuery('')
  }

  function openReader(article) {
    previousFocusRef.current =
      document.activeElement

    setShareStatus('')
    setSelectedArticle(article)
  }

  async function shareArticle() {
    if (!selectedArticle) return

    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedArticle.title,
          url: selectedArticle.url,
        })

        setShareStatus(
          'خبر به اشتراک گذاشته شد.',
        )
      } else {
        await navigator.clipboard.writeText(
          selectedArticle.url,
        )

        setShareStatus(
          'پیوند خبر کپی شد.',
        )
      }
    } catch (shareError) {
      if (
        shareError.name !== 'AbortError'
      ) {
        setShareStatus(
          'اشتراک‌گذاری در دسترس نیست.',
        )
      }
    }
  }

  const viewArticles =
    activeView === 'saved'
      ? savedArticles
      : articles

  const sources = [
    ...new Set(
      viewArticles
        .map((article) => article.source)
        .filter(Boolean),
    ),
  ]

  const normalizedQuery = query
    .trim()
    .toLocaleLowerCase('fa')

  const filteredArticles =
    viewArticles.filter((article) => {
      const matchesSource =
        selectedSource === 'همه' ||
        article.source === selectedSource

      const searchable =
        `${article.title} ${
          article.description || ''
        } ${article.source || ''}`.toLocaleLowerCase(
          'fa',
        )

      return (
        matchesSource &&
        searchable.includes(normalizedQuery)
      )
    })

  const featuredArticle =
    filteredArticles[0]

  const remainingArticles =
    filteredArticles.slice(1)

  const hasMoreArticles =
    activeView === 'latest' &&
    nextPage !== null &&
    articles.length < totalCount

  const remainingCount = Math.max(
    0,
    totalCount - articles.length,
  )

  const issueDay = new Intl.DateTimeFormat(
    'fa-IR',
    {
      day: '2-digit',
    },
  ).format(ISSUE_DATE)

  const issueYear = new Intl.DateTimeFormat(
    'fa-IR',
    {
      year: 'numeric',
    },
  ).format(ISSUE_DATE)

  const fullDate = new Intl.DateTimeFormat(
    'fa-IR',
    {
      dateStyle: 'long',
    },
  ).format(ISSUE_DATE)

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#top"
          aria-label="خبرنما، صفحه نخست"
        >
          <span className="brand-mark">
            <Newspaper
              size={20}
              strokeWidth={1.8}
            />
          </span>

          <span>خبرنما</span>
        </a>

        <nav
          className="top-nav"
          aria-label="ناوبری اصلی"
        >
          <button
            className={
              activeView === 'latest'
                ? 'nav-active'
                : ''
            }
            type="button"
            onClick={() =>
              changeView('latest')
            }
            aria-pressed={
              activeView === 'latest'
            }
          >
            تازه‌ها
          </button>

          <a href="#sources">
            منابع خبری
          </a>

          <button
            className={
              activeView === 'saved'
                ? 'nav-active'
                : ''
            }
            type="button"
            onClick={() =>
              changeView('saved')
            }
            aria-pressed={
              activeView === 'saved'
            }
          >
            نشان‌شده‌ها{' '}
            <span className="saved-count">
              {savedArticles.length.toLocaleString(
                'fa-IR',
              )}
            </span>
          </button>
        </nav>

        <div className="top-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={() =>
              setTheme((current) =>
                current === 'light'
                  ? 'dark'
                  : 'light',
              )
            }
            aria-label={
              theme === 'light'
                ? 'فعال‌کردن حالت تیره'
                : 'فعال‌کردن حالت روشن'
            }
            title={
              theme === 'light'
                ? 'حالت تیره'
                : 'حالت روشن'
            }
          >
            {theme === 'light' ? (
              <Moon
                size={17}
                aria-hidden="true"
              />
            ) : (
              <Sun
                size={17}
                aria-hidden="true"
              />
            )}
          </button>

          <a
            className="api-link"
            href={`${API_BASE_URL}/news/`}
          >
            <span>API</span>

            <ExternalLink
              size={15}
              aria-hidden="true"
            />
          </a>
        </div>
      </header>

      <main id="top">
        <section
          className="headline-rail"
          aria-label="تیترهای تازه"
        >
          <div className="rail-label">
            <Radio
              size={16}
              aria-hidden="true"
            />

            <span>روی خط خبر</span>
          </div>

          {articles.length > 0 ? (
            articles
              .slice(0, 3)
              .map((article, index) => (
                <a
                  className="rail-story"
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  key={article.id}
                >
                  <span className="rail-index">
                    {ARTICLE_INDEX_FORMATTER.format(
                      index + 1,
                    )}
                  </span>

                  <span className="rail-title">
                    {article.title}
                  </span>

                  <ArrowUpLeft
                    size={15}
                    aria-hidden="true"
                  />
                </a>
              ))
          ) : (
            <span className="rail-placeholder">
              {isLoading
                ? 'در حال دریافت تیترهای امروز…'
                : 'خبر تازه‌ای برای نمایش نیست'}
            </span>
          )}
        </section>

        <section
          className="masthead"
          aria-labelledby="page-title"
        >
          <div className="masthead-copy">
            <div className="edition-label">
              <span />
              روایت روز، بی‌واسطه
            </div>

            <h1 id="page-title">
              خبر را
              <br />
              <em>از نو ببین.</em>
            </h1>

            <p>
              گزیده‌ای از تازه‌ترین روایت‌ها، از منابع گوناگون.
            </p>
          </div>

          <div className="masthead-side">
            <div className="today-stamp">
              <span>شماره امروز</span>
              <strong>{issueDay}</strong>
              <i>{issueYear}</i>
            </div>

            <div className="live-note">
              <Radio
                size={16}
                aria-hidden="true"
              />

              <span>گردآوری روزانه</span>
            </div>
          </div>
        </section>

        <section
          className="news-section"
          id="latest"
          aria-labelledby="latest-heading"
        >
          <div className="section-heading">
            <div>
              <p className="section-kicker">
                خواندنی‌های امروز
              </p>

              <h2 id="latest-heading">
                {activeView === 'saved'
                  ? 'خبرهای نشان‌شده'
                  : 'تازه‌ترین خبرها'}{' '}
                <span>
                  {activeView === 'latest'
                    ? totalCount.toLocaleString(
                        'fa-IR',
                      )
                    : filteredArticles.length.toLocaleString(
                        'fa-IR',
                      )}
                </span>
              </h2>
            </div>

            <div className="feed-actions">
              <span className="last-updated">
                <Clock3
                  size={13}
                  aria-hidden="true"
                />

                آخرین دریافت{' '}
                {formatUpdateTime(
                  lastUpdated,
                )}
              </span>

              <button
                className="refresh-button"
                type="button"
                onClick={refreshNews}
                disabled={isLoading}
                aria-label="به‌روزرسانی خبرها"
                title="به‌روزرسانی خبرها"
              >
                <RefreshCw
                  size={17}
                  className={
                    isLoading
                      ? 'is-spinning'
                      : ''
                  }
                  aria-hidden="true"
                />

                <span>
                  به‌روزرسانی
                </span>
              </button>
            </div>
          </div>

          <div
            className="filter-bar"
            id="sources"
          >
            <label className="search-field">
              <Search
                size={18}
                aria-hidden="true"
              />

              <input
                type="search"
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder="جست‌وجو در عنوان و متن خبر"
                aria-label="جست‌وجو در خبرها"
              />

              <kbd>⌕</kbd>
            </label>

            <div
              className="source-tabs"
              role="group"
              aria-label="فیلتر منابع خبری"
            >
              {['همه', ...sources].map(
                (source) => (
                  <button
                    className={
                      selectedSource === source
                        ? 'source-tab source-tab-active'
                        : 'source-tab'
                    }
                    key={source}
                    type="button"
                    onClick={() =>
                      setSelectedSource(
                        source,
                      )
                    }
                    aria-pressed={
                      selectedSource === source
                    }
                  >
                    {source}
                  </button>
                ),
              )}
            </div>
          </div>

          {error ? (
            <div
              className="notice notice-error"
              role="alert"
            >
              <p>{error}</p>

              <button
                type="button"
                onClick={refreshNews}
              >
                تلاش دوباره
                <ArrowLeft
                  size={15}
                />
              </button>
            </div>
          ) : null}

          {activeView === 'latest' &&
          isLoading &&
          articles.length === 0 ? (
            <div
              className="loading-state"
              aria-live="polite"
            >
              <span className="loading-line" />

              <span className="loading-line loading-line-short" />

              <span className="loading-caption">
                در حال دریافت خبرهای امروز…
              </span>
            </div>
          ) : null}

          {!isLoading &&
          !error &&
          activeView === 'latest' &&
          articles.length === 0 ? (
            <div className="empty-state">
              <Newspaper
                size={30}
                strokeWidth={1.4}
                aria-hidden="true"
              />

              <h3>
                هنوز خبری دریافت نشده
              </h3>

              <p>
                برای بررسی دوباره، فهرست خبرها را به‌روزرسانی کنید.
              </p>
            </div>
          ) : null}

          {!isLoading &&
          activeView === 'saved' &&
          savedArticles.length === 0 ? (
            <div className="empty-state">
              <Bookmark
                size={30}
                strokeWidth={1.4}
                aria-hidden="true"
              />

              <h3>
                فهرست نشان‌شده‌ها خالی است
              </h3>

              <p>
                خبرهایی را که می‌خواهید بعداً بخوانید، ذخیره کنید.
              </p>

              <button
                className="empty-action"
                type="button"
                onClick={() =>
                  changeView('latest')
                }
              >
                دیدن تازه‌ترین خبرها
              </button>
            </div>
          ) : null}

          {!isLoading &&
          viewArticles.length > 0 &&
          filteredArticles.length === 0 ? (
            <div className="empty-state">
              <Search
                size={28}
                strokeWidth={1.5}
                aria-hidden="true"
              />

              <h3>خبری پیدا نشد</h3>

              <p>
                عبارت جست‌وجو یا منبع دیگری را انتخاب کنید.
              </p>
            </div>
          ) : null}

          {featuredArticle ? (
            <div
              className="stories"
              aria-live="polite"
            >
              <StoryCard
                article={featuredArticle}
                featured
                isSaved={savedArticles.some(
                  (article) =>
                    String(article.id) ===
                    String(
                      featuredArticle.id,
                    ),
                )}
                onToggleSaved={
                  toggleSavedArticle
                }
                onOpen={openReader}
              />

              {remainingArticles.length >
              0 ? (
                <div className="story-grid">
                  {remainingArticles.map(
                    (article) => (
                      <StoryCard
                        article={article}
                        key={article.id}
                        isSaved={savedArticles.some(
                          (saved) =>
                            String(
                              saved.id,
                            ) ===
                            String(
                              article.id,
                            ),
                        )}
                        onToggleSaved={
                          toggleSavedArticle
                        }
                        onOpen={openReader}
                      />
                    ),
                  )}
                </div>
              ) : null}

              {hasMoreArticles ? (
                <button
                  className="load-more"
                  type="button"
                  onClick={
                    loadMoreArticles
                  }
                  disabled={isLoadingMore}
                >
                  {isLoadingMore
                    ? 'در حال دریافت…'
                    : 'خبرهای بیشتر'}

                  {!isLoadingMore ? (
                    <span>
                      {remainingCount.toLocaleString(
                        'fa-IR',
                      )}{' '}
                      خبر دیگر
                    </span>
                  ) : null}

                  {isLoadingMore ? (
                    <RefreshCw
                      className="is-spinning"
                      size={17}
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronDown
                      size={17}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ) : null}

              {loadMoreError ? (
                <p
                  className="load-more-error"
                  role="alert"
                >
                  {loadMoreError}{' '}

                  <button
                    type="button"
                    onClick={
                      loadMoreArticles
                    }
                  >
                    تلاش دوباره
                  </button>
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>

      <footer className="site-footer">
        <a
          className="footer-brand"
          href="#top"
        >
          خبرنما
        </a>

        <span>
          روایت روشن از آنچه می‌گذرد
        </span>

        <time
          className="footer-date"
          dateTime={ISSUE_DATE.toISOString()}
        >
          {fullDate}
        </time>
      </footer>

      {selectedArticle ? (
        <div
          className="reader-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedArticle(null)
            }
          }}
        >
          <section
            className="reader-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reader-title"
          >
            <header className="reader-header">
              <span>
                <Newspaper
                  size={17}
                  aria-hidden="true"
                />
                خوانش سریع
              </span>

              <button
                className="reader-close"
                type="button"
                autoFocus
                onClick={() =>
                  setSelectedArticle(null)
                }
                aria-label="بستن پنجره"
              >
                <X
                  size={20}
                  aria-hidden="true"
                />
              </button>
            </header>

            {selectedArticle.image ? (
              <div className="reader-image">
                <img
                  src={
                    selectedArticle.image
                  }
                  alt=""
                  decoding="async"
                />
              </div>
            ) : null}

            <div className="reader-body">
              <StoryMeta
                article={selectedArticle}
                isSaved={savedArticles.some(
                  (article) =>
                    String(article.id) ===
                    String(
                      selectedArticle.id,
                    ),
                )}
                onToggleSaved={
                  toggleSavedArticle
                }
              />

              <h2 id="reader-title">
                {selectedArticle.title}
              </h2>

              <p className="reader-description">
                {selectedArticle.description ||
                  'برای خواندن متن کامل، به وب‌سایت منبع خبر مراجعه کنید.'}
              </p>

              <div className="reader-actions">
                <a
                  className="reader-source-link"
                  href={
                    selectedArticle.url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  ادامه در منبع اصلی

                  <ExternalLink
                    size={16}
                    aria-hidden="true"
                  />
                </a>

                <button
                  className="reader-share"
                  type="button"
                  onClick={
                    shareArticle
                  }
                >
                  <Share2
                    size={16}
                    aria-hidden="true"
                  />

                  اشتراک‌گذاری
                </button>
              </div>

              {shareStatus ? (
                <p
                  className="share-status"
                  role="status"
                >
                  {shareStatus}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App