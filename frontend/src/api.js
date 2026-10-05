const API_BASE_URL = import.meta.env.VITE_API_BASE || (
  import.meta.env.DEV
    ? 'http://127.0.0.1:8000'
    : 'https://farsi-news-production.up.railway.app'
)

export async function requestNews({
  page = 1,
  pageSize = 10,
  query = '',
  signal,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })

  if (query.trim()) {
    params.set('q', query.trim())
  }

  const response = await fetch(
    `${API_BASE_URL}/news/?${params}`,
    {
      headers: {
        Accept: 'application/json',
      },
      signal,
    },
  )

  if (!response.ok) {
    throw new Error(
      `News request failed with status ${response.status}`,
    )
  }

  const payload = await response.json()

  if (Array.isArray(payload)) {
    return {
      articles: payload,
      totalCount: payload.length,
      nextPage: null,
    }
  }

  if (
    !payload ||
    !Array.isArray(payload.results)
  ) {
    throw new Error(
      'The news API returned an unexpected response.',
    )
  }

  return {
    articles: payload.results,
    totalCount: Number.isInteger(payload.count)
      ? payload.count
      : payload.results.length,
    nextPage: Number.isInteger(
      payload.next_page,
    )
      ? payload.next_page
      : null,
  }
}

export async function requestNewsDetails(id, { signal } = {}) {
  const response = await fetch(
    `${API_BASE_URL}/news/${encodeURIComponent(id)}/`,
    {
      headers: {
        Accept: 'application/json',
      },
      signal,
    },
  )

  if (!response.ok) {
    throw new Error(
      `News detail request failed with status ${response.status}`,
    )
  }

  return response.json()
}

export { API_BASE_URL }