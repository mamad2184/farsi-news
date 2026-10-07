# Farsi News — Project Specification

## 1. Purpose

Farsi News is a production-quality Persian news aggregation platform.

The goal is **not** to build a demo or a simple API prototype.

The project should behave like a real-world news product:

* Reliable news ingestion
* Clean and consistent data
* Fast REST API
* Responsive and polished frontend
* Automatic synchronization
* Protection against duplicate news
* News images required
* Graceful handling of provider failures
* Production-ready deployment
* Automated testing
* Maintainable architecture

Any AI working on this repository must treat this document as the project's architectural source of truth.

---

# 2. Core Architecture

The system follows this architecture:

```text
                    ┌──────────────────┐
                    │   FreeNewsAPI    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Django Sync     │
                    │  sync_news       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Neon PostgreSQL  │
                    │  Source of Truth │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Django REST API  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   React + Vite  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Cloudflare       │
                    │ Frontend         │
                    └──────────────────┘
```

The database is the single source of truth for news displayed by the frontend.

The frontend must not directly depend on FreeNewsAPI.

---

# 3. Technology Stack

## Backend

* Python
* Django
* Django REST Framework
* PostgreSQL
* Neon PostgreSQL
* `requests` for external HTTP requests
* BeautifulSoup for publisher-page metadata extraction

## Frontend

* React
* Vite
* JavaScript

## Infrastructure

* Railway for Django backend
* Neon for PostgreSQL
* Cloudflare Workers for frontend deployment

## News Provider

* FreeNewsAPI

Official API endpoint:

```text
https://freenewsapi.ai/v1/search
```

---

# 4. Database Rules

Neon PostgreSQL is the production database and the project's database source of truth.

Do not introduce another production database.

The old local SQLite database must not become the production database.

The `News` model represents a stored news article.

Current conceptual fields:

```text
id
external_id
title
description
url
image
source
published_at
created_at
```

## Required rules

### external_id

`external_id` is the primary duplicate-protection key.

It must remain unique.

Do not remove this uniqueness constraint without discussing it first.

### image

News without an image must NOT be saved.

The system must never intentionally store an article with:

```text
image = NULL
```

or an empty image.

If FreeNewsAPI does not provide an image, the ingestion process may attempt to extract an image from the publisher page.

If no valid image can be found:

```text
DO NOT SAVE THE ARTICLE
```

Do not invent placeholder image URLs during ingestion.

### published_at

`published_at` represents the publisher/provider publication time.

It is used for displaying and sorting news.

### created_at

`created_at` represents when the article was stored by our system.

It is useful for ingestion tracking and future monitoring.

---

# 5. News Ingestion

News ingestion is handled by:

```text
src/news/management/commands/sync_news.py
```

The command is:

```bash
python manage.py sync_news
```

The production synchronization job currently runs every 3 minutes.

The synchronization process must be safe to run repeatedly.

Running it multiple times must not create duplicate news.

---

# 6. Current Ingestion Strategy

The current ingestion flow is:

```text
1. Find newest News.published_at in database
2. Use that timestamp as the API "from" value
3. Request Persian news from FreeNewsAPI
4. Receive up to 100 articles
5. Check external_id
6. Use API image if available
7. If no image, inspect publisher page
8. If no image exists, skip the article
9. Parse published_at
10. Save the article
11. Delete articles older than 7 days
```

Current API request size:

```text
100 articles
```

---

# 7. Duplicate Protection

The current duplicate strategy is based on:

```text
external_id
```

The database has a unique constraint on `external_id`.

The ingestion code must also safely handle race conditions where two processes attempt to insert the same article.

Do not rely only on:

```python
if News.objects.filter(external_id=...).exists()
```

The database uniqueness constraint must remain the final protection.

`IntegrityError` should be handled safely.

Do not introduce URL-based deduplication unless explicitly discussed first.

---

# 8. Images

Images are mandatory.

The preferred order is:

```text
FreeNewsAPI image
        ↓
publisher og:image
        ↓
publisher JSON-LD image
        ↓
no image
        ↓
skip article
```

The system must not store an article without an image.

Publisher requests must have strict timeouts.

A broken or slow publisher must never be able to make the entire synchronization process hang indefinitely.

Image extraction should support common JSON-LD structures including:

```text
image: "..."
image: [...]
image: {...}
```

---

# 9. External API Reliability

FreeNewsAPI can occasionally be slow or unavailable.

The ingestion system must therefore be resilient.

External requests should use:

* connection timeout
* read timeout
* limited retries
* exponential backoff where appropriate
* clear logging

A temporary provider failure must NOT corrupt the database.

If FreeNewsAPI is unavailable, the existing database contents remain valid.

The API should continue serving previously stored news.

A sync failure should not delete existing news.

---

# 10. Important FreeNewsAPI Details

The correct language parameter is:

```text
lang=fa
```

Not:

```text
language=fa
```

The response uses:

```text
results
```

not:

```text
articles
```

Important result fields include:

```text
id
url
title
description
published_at
crawled_at
host
sitename
image
```

FreeNewsAPI can provide publisher metadata and images, but image availability is not guaranteed.

---

# 11. Cursor Strategy

The current implementation uses the newest database:

```text
News.published_at
```

as the incremental `from` cursor.

This is an intentional current project decision.

However, FreeNewsAPI also exposes:

```text
crawled_at
```

which may be a better cursor for future ingestion reliability because publishers can backdate `published_at`.

Any AI considering changing the cursor from `published_at` to `crawled_at` must first explain the reason and discuss the migration/behavior change.

Do not silently change this behavior.

---

# 12. Retention

The project currently retains approximately:

```text
7 days
```

of news.

Articles older than seven days should be removed by the synchronization process.

This prevents the database from growing indefinitely.

Do not remove this retention policy without discussing storage and product implications.

---

# 13. Backend API

Django REST Framework is the API layer.

The frontend communicates with Django through REST endpoints.

The frontend must not query PostgreSQL directly.

The frontend must not call FreeNewsAPI directly.

The backend owns:

* data validation
* database access
* pagination
* search
* ordering
* data consistency

---

# 14. News API

Current conceptual endpoints:

```text
GET /news/
GET /news/<id>/
```

The list endpoint supports:

```text
page
page_size
q
```

News should normally be returned newest first:

```text
published_at DESC
```

Pagination must have a maximum page size.

The backend must not allow clients to request unlimited rows.

---

# 15. API Response Stability

The frontend depends on the API contract.

Do not casually rename API fields.

Current important fields are:

```text
id
title
description
url
image
source
published_at
```

If an API contract needs to change, update the backend and frontend together and test both.

---

# 16. Search

Search currently operates against news titles.

Search should be:

* safe
* predictable
* reasonably efficient
* compatible with Persian text

Future improvements may include searching:

```text
title
description
source
```

but this should be implemented deliberately rather than randomly.

---

# 17. Frontend Architecture

The frontend is:

```text
React + Vite
```

The frontend consumes the Django REST API.

The frontend must not contain business logic that belongs to the backend.

The frontend is responsible for:

* rendering news
* user interaction
* search UI
* pagination UI
* loading states
* error states
* empty states
* article reading
* saved articles
* sharing
* theme
* responsive layout

---

# 18. Frontend Data Flow

The intended flow is:

```text
React
  ↓
api.js
  ↓
Django REST API
  ↓
Neon PostgreSQL
```

`api.js` should remain the central place for API communication.

Do not scatter raw `fetch()` calls throughout unrelated components unless there is a strong architectural reason.

---

# 19. Images on Frontend

The frontend should display the article image when available.

Because the backend guarantees stored articles have images, missing-image handling on the frontend should primarily protect against:

* broken remote images
* provider image removal
* unexpected API data
* network errors

A visual fallback may be displayed if an image fails to load.

However, the backend ingestion rule remains:

```text
No image → don't save article
```

---

# 20. Frontend User Experience

The project should feel like a real Persian news product.

Important UX requirements:

* Persian RTL layout
* responsive mobile layout
* desktop layout
* readable Persian typography
* clear article cards
* fast navigation
* useful loading states
* useful error messages
* empty search state
* accessible buttons and controls
* keyboard-friendly interactions where appropriate
* no unnecessary visual complexity

---

# 21. Deployment

## Backend

Deploy Django to Railway.

Current backend:

```text
https://farsi-news-production.up.railway.app
```

Production server:

```text
gunicorn config.wsgi:application
```

## Frontend

Deploy React/Vite frontend to Cloudflare Workers.

Current frontend:

```text
https://farsi-news.mohamadpykarian.workers.dev
```

## Database

Production database:

```text
Neon PostgreSQL
```

---

# 22. Environment Variables

Secrets must never be committed to Git.

Environment-specific configuration should use environment variables.

Examples include:

```text
DJANGO_SECRET_KEY
NEON_DB_PASSWORD
DATABASE_URL
```

Do not hard-code passwords, API keys, tokens, or credentials.

If a credential is accidentally exposed, it should be considered compromised and rotated.

---

# 23. Production Settings

The current project still needs a proper production configuration pass.

Production should eventually have:

```text
DEBUG=False
```

and a restricted:

```text
ALLOWED_HOSTS
```

CORS should be environment-driven rather than permanently hard-coded.

Security settings should be reviewed before considering the project production-complete.

Do not weaken security merely to make local development easier.

Development and production configuration should be clearly separated.

---

# 24. Testing

The project must have automated tests.

Important backend tests should cover:

### Model

* required fields
* unique external_id
* image requirement
* ordering

### Ingestion

* API success
* API failure
* duplicate article
* missing image
* image extracted from `og:image`
* image extracted from JSON-LD
* invalid publication date
* provider timeout
* old article cleanup

### API

* list endpoint
* pagination
* search
* detail endpoint
* missing article
* ordering

Frontend should eventually have appropriate tests for important user-facing behavior.

---

# 25. Performance

Performance should be improved deliberately.

Potential future improvements:

* database indexes
* API caching
* HTTP caching
* query optimization
* pagination optimization
* frontend asset optimization
* image loading optimization
* CDN usage

Do not add caching blindly.

Caching must respect the fact that news is updated frequently.

---

# 26. Monitoring and Reliability

A production news platform needs visibility into failures.

The system should eventually track:

* sync success
* sync failures
* API provider failures
* number of fetched articles
* number of saved articles
* number of duplicates
* number of articles skipped because of missing images
* sync duration
* database errors

The synchronization process should produce useful logs.

---

# 27. Cron / Scheduling

Current synchronization frequency:

```text
Every 3 minutes
```

The current Django cron configuration uses:

```text
*/3 * * * *
```

This means the sync job is automatic.

Important:

The cron frequency does NOT guarantee that FreeNewsAPI will provide new news every three minutes.

The provider may ingest news less frequently.

Do not interpret an empty sync as an error.

---

# 28. Database and Local Development

Neon PostgreSQL is the project's real database.

The old local:

```text
src/db.sqlite3
```

must not become an accidental production data source.

Eventually it should be removed from version control if it is not needed for development.

Database migrations must be committed to Git.

Never manually modify the production database schema without also representing the change through Django migrations when appropriate.

---

# 29. Git and Source of Truth

The GitHub repository is the project's source of truth once changes have been committed and pushed.

Repository:

```text
https://github.com/mamad2184/farsi-news
```

Normal workflow:

```text
local change
    ↓
test
    ↓
git status
    ↓
git add .
    ↓
git commit
    ↓
git push origin main
```

Do not assume GitHub contains a local change until it has actually been pushed.

---

# 30. AI Development Rules

Any AI working on this project MUST follow these rules.

### Rule 1 — Understand before changing

Inspect the relevant existing code before proposing changes.

Do not blindly rewrite files.

### Rule 2 — Preserve working behavior

If something already works, don't replace it without a reason.

### Rule 3 — No random architecture changes

Do not introduce:

* new frameworks
* new databases
* new API providers
* new deployment platforms
* new state-management libraries
* unnecessary dependencies

without discussing the architectural reason first.

### Rule 4 — Ask when a decision matters

If an architectural decision is ambiguous and could affect the production system, ask the project owner.

Examples:

* changing the database
* changing the news provider
* changing the deduplication strategy
* changing the ingestion cursor
* changing API contracts
* changing deployment architecture

### Rule 5 — Exact files

When making a change, clearly identify:

```text
file path
what changes
why it changes
commands to run
```

If replacing an entire file, provide the complete file.

### Rule 6 — Don't destroy data

Never recommend deleting the production database or news records simply to solve a migration problem.

Data migrations must preserve existing data whenever possible.

### Rule 7 — Test before moving on

After each architectural change:

```text
check
migration
tests
runtime verification
```

should be performed as appropriate.

### Rule 8 — Don't hide failures

If an external API fails, don't pretend the sync succeeded.

Log the failure clearly.

### Rule 9 — No fake data

Do not create fake news, fake image URLs, fake API responses, or placeholder production records unless explicitly requested for testing.

### Rule 10 — Production mindset

Every implementation should be evaluated against:

```text
reliability
security
performance
maintainability
scalability
user experience
```

not merely "does it work on my machine?"

---

# 31. Current Development Roadmap

Development should proceed in this order:

```text
1. Data model
2. News ingestion
3. REST API
4. Automated tests
5. Production configuration
6. Frontend architecture
7. Performance and caching
8. Deployment
9. Monitoring and reliability
```

Do not jump randomly between layers unless a dependency requires it.

---

# 32. Current Status

The project currently has:

* Django backend
* Django REST Framework
* Neon PostgreSQL
* FreeNewsAPI integration
* React/Vite frontend
* Railway backend deployment
* Cloudflare frontend deployment
* automatic news synchronization
* external_id duplicate protection
* image-required ingestion
* seven-day retention
* pagination
* search
* article details
* saved articles
* sharing
* theme support

The project is functional but is still being hardened toward production quality.

---

# 33. Important Decisions That Must Not Be Silently Changed

The following are explicit project decisions:

```text
Django backend
PostgreSQL / Neon
React + Vite
Railway backend
Cloudflare frontend
FreeNewsAPI
external_id deduplication
image required for stored news
7-day retention
3-minute synchronization
REST API
backend as source of truth
```

Changing any of these requires an explicit architectural discussion.

---

# 34. Definition of Done

The project is not considered production-complete merely because:

```text
the frontend loads
```

or:

```text
the API returns news
```

Production completion means:

* ingestion is reliable
* provider failures are handled
* duplicates are controlled
* images are reliable
* database integrity is protected
* API is stable
* frontend is responsive and polished
* tests cover critical behavior
* production security settings are correct
* deployment is reproducible
* logs are useful
* failures are observable
* performance is acceptable
* environment secrets are protected
* the system can continue serving existing news when the provider is temporarily unavailable

---

# 35. Final Principle

Build Farsi News as a **real production news aggregation platform**, not as a tutorial project.

Prefer simple, reliable, maintainable solutions.

Do not add complexity unless it solves a real problem.

Do not make architectural changes silently.

When uncertain, inspect the existing project, explain the trade-off, and ask the project owner before changing an established architectural decision.
