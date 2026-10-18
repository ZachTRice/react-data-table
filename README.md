# @zachtrice/react-data-table

A small, accessible React data table for admin and back-office lists, plus the
two helpers it is built on:

- **`DataTable`**: client-side sorting and pagination with sortable header
  buttons (`aria-sort`), a rows-per-page picker that includes **All**, and a
  `resetKey` that returns to page 1 when your filters change.
- **`sortRows`**: a stable sort that compares text case-insensitively with
  natural number ordering (`item 9` before `item 10`), handles numbers and
  `Date`s, and always keeps blank values last in both directions.
- **`fetchAllPages`**: loads every page from a cursor-paged JSON endpoint and
  reports progress after each page, so the table can render while the rest loads.

No CSS framework is imposed: every element has a class hook you can rename.
Ships types. The only peer dependency is `react` (17 or newer).

## Install

```sh
npm install @zachtrice/react-data-table
```

## Usage

```tsx
import { useEffect, useState } from 'react'
import { DataTable, fetchAllPages, type DataTableColumn } from '@zachtrice/react-data-table'

interface Order { id: string, customer: string, total: number, placedAt: string | null }

const columns: DataTableColumn<Order>[] = [
  { key: 'id', label: 'Order' },
  { key: 'customer', label: 'Customer' },
  { key: 'placedAt', label: 'Date', firstDir: 'desc', nowrap: true },
  { key: 'total', label: 'Total', align: 'right', firstDir: 'desc', render: (o) => `$${o.total.toFixed(2)}` },
  { key: 'actions', label: '', sortable: false, render: (o) => <a href={`/orders/${o.id}`}>Open</a> }
]

export function Orders () {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Renders the first page right away, then fills in as later pages arrive.
    fetchAllPages<Order>('/api/orders', { onPage: (items) => setOrders(items) })
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <p role='alert'>{error}</p>

  const rows = orders.filter((o) => o.customer.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search' />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(o) => o.id}
        defaultSort={{ key: 'placedAt', dir: 'desc' }}
        resetKey={search}
        noun='order'
        emptyMessage='No orders match.'
      />
    </>
  )
}
```

## `DataTable` props

| prop | type | default | description |
| --- | --- | --- | --- |
| `rows` | `Row[]` | required | Rows to show (already filtered). |
| `columns` | `DataTableColumn<Row>[]` | required | See below. |
| `rowKey` | `(row) => React.Key` | required | Stable key per row. |
| `defaultSort` | `{ key, dir }` | none | Initial sort. Without it, rows keep their order until a header is clicked. |
| `resetKey` | `React.Key` | `''` | Change it (for example, to your joined filter values) to return to page 1. |
| `emptyMessage` | `ReactNode` | `'No results.'` | Shown instead of the table when `rows` is empty. |
| `defaultPageSize` | `number \| 'all'` | `50` | |
| `pageSizeOptions` | `(number \| 'all')[]` | `[25, 50, 100, 250, 'all']` | |
| `noun` / `nounPlural` | `string` | `'row'` / `` `${noun}s` `` | Used in "Showing 1–50 of 120 orders". |
| `scrollOnPageChange` | `boolean` | `true` | Scrolls the table into view after paging. |
| `classNames` | `Partial<DataTableClassNames>` | see below | Merged over the defaults. |
| `labels` | `Partial<DataTableLabels>` | English | Button text, aria labels, and the range and page text. |

### Columns

| field | type | description |
| --- | --- | --- |
| `key` | `string` | Unique id. Also the row property displayed and sorted when `render` / `sortValue` are omitted. |
| `label` | `ReactNode` | Header content. |
| `render` | `(row) => ReactNode` | Cell content. |
| `sortValue` | `(row) => unknown` | Value to sort by, when it differs from what is displayed. |
| `sortable` | `boolean` | `false` renders a plain header. |
| `firstDir` | `'asc' \| 'desc'` | Direction on first click (use `'desc'` for dates and totals). |
| `align` | `'center' \| 'right'` | Adds `cellCenter` / `cellRight` to the header and cells. |
| `nowrap` | `boolean` | Adds `cellNowrap` to the cells. |

### Class names

Defaults (override any subset with `classNames`):

```
root            data-table                 sortButton        data-table-sort
scroll          data-table-scroll          sortButtonActive  is-active
table           data-table-table           sortIcon          data-table-sort-icon
cellCenter      is-center                  pager             data-table-pager
cellRight       is-right                   range             data-table-range
cellNowrap      is-nowrap                  pageSize          data-table-page-size
empty           data-table-empty           pageSizeSelect    data-table-page-size-select
page            data-table-page            pagerButtons      data-table-pager-buttons
                                           pagerButton       data-table-pager-button
```

A minimal starting point:

```css
.data-table-scroll { overflow-x: auto; }
.data-table-table { width: 100%; border-collapse: collapse; }
.data-table-table th, .data-table-table td { padding: .5rem .75rem; border-bottom: 1px solid #ddd; text-align: left; }
.data-table-table th[aria-sort] { padding: 0; }
.data-table-sort { all: unset; box-sizing: border-box; width: 100%; padding: .5rem .75rem; font-weight: 600; cursor: pointer; }
.data-table-sort:focus-visible { outline: 2px solid; outline-offset: -2px; }
.data-table-sort-icon { margin-left: .35rem; opacity: .45; }
.data-table-sort.is-active .data-table-sort-icon { opacity: 1; }
.data-table .is-right { text-align: right; font-variant-numeric: tabular-nums; }
.data-table .is-nowrap { white-space: nowrap; }
.data-table-pager { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem 1rem; margin-top: .75rem; }
.data-table-pager-buttons { margin-left: auto; }
```

Using Bootstrap? Map the hooks onto its classes:

```tsx
<DataTable
  {...props}
  classNames={{ table: 'table table-striped', pageSizeSelect: 'form-select form-select-sm', pagerButton: 'btn btn-outline-secondary btn-sm' }}
/>
```

## `sortRows(rows, column, dir)`

```ts
import { sortRows } from '@zachtrice/react-data-table'

sortRows(rows, { key: 'name' }, 'asc')
sortRows(rows, { key: 'total', sortValue: (r) => Number(r.total) }, 'desc')
```

Returns a new array. Ties keep their original order. `null`, `undefined`, `''`,
and `NaN` always sort after real values, whichever direction is active.

## `fetchAllPages(url, options)`

Requests `url?pageSize=500`, then `url?pageSize=500&cursor=<nextCursor>` until
the response has no `nextCursor`. Existing query strings are preserved.

Each response must be JSON shaped like:

```json
{ "items": [ ... ], "nextCursor": "opaque-string-or-null" }
```

| option | type | default | description |
| --- | --- | --- | --- |
| `pageSize` | `number` | `500` | Sent as `pageSize`. |
| `onPage` | `(items, done) => void` | none | Called after each page with everything loaded so far. |
| `init` | `RequestInit` | none | Passed to every request (credentials, headers, `signal`). |
| `fetchImpl` | `(url, init) => Promise<Response>` | global `fetch` | For tests or custom clients. |

It rejects on a non-2xx response (`Failed to load (403)`) and if the server
returns the same cursor twice, which would otherwise loop forever.

### Server side

Any backend works. For example, an AWS Lambda handler that scans a DynamoDB
table with an opaque, validated cursor:

```js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const encode = (key) => (key ? Buffer.from(JSON.stringify(key)).toString('base64url') : null)
const decode = (cursor) => {
  if (!cursor) return undefined
  const key = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
  if (typeof key?.OrderID !== 'string' || Object.keys(key).length !== 1) throw new Error('Invalid cursor')
  return key
}

export async function handler (event) {
  const { pageSize = '500', cursor } = event.queryStringParameters ?? {}
  let startKey
  try {
    startKey = decode(cursor)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid cursor' }) }
  }
  const page = await db.send(new ScanCommand({
    TableName: process.env.ORDERS_TABLE,
    Limit: Math.min(Math.max(parseInt(pageSize, 10) || 500, 1), 1000),
    ExclusiveStartKey: startKey
  }))
  return { statusCode: 200, body: JSON.stringify({ items: page.Items, nextCursor: encode(page.LastEvaluatedKey) }) }
}
```

Validate the decoded cursor (as above) rather than passing client input
straight to `ExclusiveStartKey`, and cap `pageSize`. Add your own
authorization check before returning data.

## SSR and React Server Components

`DataTable` renders on the server and is marked `'use client'`, so it can be
imported from a Next.js App Router server component. `sortRows` and
`fetchAllPages` are plain functions that also run on the server.

## License

MIT © ZachTRice
