import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchAllPages } from '../dist/index.js'

const pagedServer = (pages) => {
  const requested = []
  const fetchImpl = async (url, init) => {
    requested.push({ url, init })
    const cursor = new URL(url, 'https://example.test').searchParams.get('cursor') || ''
    return { ok: true, status: 200, json: async () => pages[cursor] }
  }
  return { requested, fetchImpl }
}

test('follows cursors and reports progress until complete', async () => {
  const { requested, fetchImpl } = pagedServer({ '': { items: [1, 2], nextCursor: 'next' }, next: { items: [3], nextCursor: null } })
  const progress = []
  const items = await fetchAllPages('/api/orders', { fetchImpl, onPage: (loaded, done) => progress.push([loaded.length, done]) })
  assert.deepEqual(items, [1, 2, 3])
  assert.deepEqual(progress, [[2, false], [3, true]])
  assert.deepEqual(requested.map((r) => r.url), ['/api/orders?pageSize=500', '/api/orders?pageSize=500&cursor=next'])
})

test('appends to an existing query string and passes init through', async () => {
  const { requested, fetchImpl } = pagedServer({ '': { items: ['a'] } })
  const init = { credentials: 'include' }
  await fetchAllPages('/api/orders?status=open', { fetchImpl, init, pageSize: 50 })
  assert.equal(requested[0].url, '/api/orders?status=open&pageSize=50')
  assert.equal(requested[0].init, init)
})

test('surfaces HTTP failures', async () => {
  await assert.rejects(
    fetchAllPages('/api/customers', { fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) }) }),
    /403/
  )
})

test('stops when the server repeats a cursor', async () => {
  const { fetchImpl } = pagedServer({ '': { items: [1], nextCursor: 'same' }, same: { items: [2], nextCursor: 'same' } })
  await assert.rejects(fetchAllPages('/api/loop', { fetchImpl }), /did not advance/)
})
