/** One page returned by a cursor-paged endpoint. */
export interface CursorPage<Item> {
  items?: Item[]
  /** Opaque cursor for the next page; null, undefined, or '' when finished. */
  nextCursor?: string | null
}

export interface FetchLikeResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<FetchLikeResponse>

export interface FetchAllPagesOptions<Item> {
  /** Sent as the `pageSize` query parameter. Default 500. */
  pageSize?: number
  /** Called after every page with everything loaded so far and whether loading is done. */
  onPage?: (items: Item[], done: boolean) => void
  /** Passed to every request (credentials, headers, an AbortSignal, ...). */
  init?: RequestInit
  /** Custom fetch implementation. Default: the global `fetch`. */
  fetchImpl?: FetchLike
}

/**
 * Loads every page from a cursor-paged endpoint. Each request adds `pageSize`
 * and (after the first page) `cursor` query parameters; each response must be
 * JSON shaped like `{ items: [...], nextCursor: 'opaque' | null }`.
 */
export async function fetchAllPages<Item = unknown> (
  url: string,
  options: FetchAllPagesOptions<Item> = {}
): Promise<Item[]> {
  const { pageSize = 500, onPage, init } = options
  const doFetch: FetchLike = options.fetchImpl ?? ((input, requestInit) => fetch(input, requestInit))
  const separator = url.includes('?') ? '&' : '?'
  const items: Item[] = []
  let cursor: string | null = null
  do {
    const params = new URLSearchParams({ pageSize: String(pageSize) })
    if (cursor) params.set('cursor', cursor)
    const res = await doFetch(`${url}${separator}${params.toString()}`, init)
    if (!res.ok) throw new Error(`Failed to load (${res.status})`)
    const data = (await res.json()) as CursorPage<Item> | null
    if (Array.isArray(data?.items)) items.push(...data.items)
    const next = data?.nextCursor || null
    // Guards against a server bug that would otherwise loop forever.
    if (next !== null && next === cursor) throw new Error('Pagination cursor did not advance')
    cursor = next
    onPage?.(items.slice(), !cursor)
  } while (cursor)
  return items
}
