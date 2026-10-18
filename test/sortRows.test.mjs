import assert from 'node:assert/strict'
import test from 'node:test'
import { sortRows } from '../dist/index.js'

const rows = [
  { id: 'a', joined: 300, name: 'beta', total: 10 },
  { id: 'b', joined: null, name: 'Alpha', total: 2 },
  { id: 'c', joined: 100, name: 'item 10', total: 10 },
  { id: 'd', joined: 200, name: 'item 9', total: 30 }
]

const ids = (list) => list.map((row) => row.id)

test('keeps blank values last in both directions', () => {
  assert.deepEqual(ids(sortRows(rows, { key: 'joined' }, 'desc')), ['a', 'd', 'c', 'b'])
  assert.deepEqual(ids(sortRows(rows, { key: 'joined' }, 'asc')), ['c', 'd', 'a', 'b'])
  const blanks = [{ id: 'x', v: '' }, { id: 'y', v: NaN }, { id: 'z', v: 1 }, { id: 'w', v: undefined }]
  assert.deepEqual(ids(sortRows(blanks, { key: 'v' }, 'desc')), ['z', 'x', 'y', 'w'])
})

test('compares text case-insensitively with natural numbers', () => {
  assert.deepEqual(ids(sortRows(rows, { key: 'name' }, 'asc')), ['b', 'a', 'd', 'c'])
})

test('is stable for equal values in either direction and honors sortValue', () => {
  assert.deepEqual(ids(sortRows(rows, { key: 'total' }, 'desc')), ['d', 'a', 'c', 'b'])
  assert.deepEqual(ids(sortRows(rows, { key: 'total', sortValue: (r) => -r.total }, 'asc')), ['d', 'a', 'c', 'b'])
})

test('sorts Date values chronologically', () => {
  const dated = [
    { id: 'new', at: new Date('2026-10-17') },
    { id: 'old', at: new Date('2024-01-02') },
    { id: 'mid', at: new Date('2025-06-30') }
  ]
  assert.deepEqual(ids(sortRows(dated, { key: 'at' }, 'asc')), ['old', 'mid', 'new'])
})

test('returns a copy in the original order without a column', () => {
  const result = sortRows(rows, undefined)
  assert.notEqual(result, rows)
  assert.deepEqual(result, rows)
})
