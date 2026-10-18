import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { act, createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DataTable } from '../dist/index.js'

const rows = [
  { id: 1, name: 'Charlie', total: 30 },
  { id: 2, name: 'alpha', total: null },
  { id: 3, name: 'Bravo', total: 10 }
]

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'total', label: 'Total', align: 'right', firstDir: 'desc' },
  { key: 'action', label: 'Action', sortable: false, render: (row) => `Edit ${row.id}` }
]

const baseProps = { rows, columns, rowKey: (row) => row.id, noun: 'customer' }

test('server-renders sort state, cells, and the range text', () => {
  const html = renderToStaticMarkup(h(DataTable, { ...baseProps, defaultSort: { key: 'name', dir: 'asc' }, defaultPageSize: 2 }))
  assert.match(html, /<th scope="col" aria-sort="ascending"><button type="button" class="data-table-sort is-active">Name/)
  assert.match(html, /<th scope="col" aria-sort="none" class="is-right">/)
  assert.match(html, /<th scope="col">Action<\/th>/)
  assert.match(html, /Showing 1–2 of 3 customers/)
  assert.match(html, /Page 1 of 2/)
  assert.ok(html.indexOf('alpha') < html.indexOf('Bravo'))
  assert.ok(!html.includes('Charlie'))
})

test('renders the empty message and custom class names', () => {
  const html = renderToStaticMarkup(h(DataTable, { ...baseProps, rows: [], emptyMessage: 'Nothing here.', classNames: { empty: 'custom-empty' } }))
  assert.equal(html, '<p class="custom-empty">Nothing here.</p>')
})

test('sorts, pages, resizes, and resets in the browser', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>')
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = await import('react-dom/client')

  const container = document.getElementById('root')
  const root = createRoot(container)
  const render = (props) => act(() => root.render(h(DataTable, { ...baseProps, defaultPageSize: 2, ...props })))
  const firstColumn = () => [...container.querySelectorAll('tbody tr')].map((tr) => tr.firstChild.textContent)
  const header = (label) => [...container.querySelectorAll('th')].find((th) => th.textContent.startsWith(label))
  const button = (label) => [...container.querySelectorAll('button')].find((b) => b.textContent === label || b.getAttribute('aria-label') === label)
  const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })))

  await render({ resetKey: 'a' })
  assert.deepEqual(firstColumn(), ['Charlie', 'alpha'])

  await click(header('Total').querySelector('button'))
  assert.equal(header('Total').getAttribute('aria-sort'), 'descending')
  assert.deepEqual(firstColumn(), ['Charlie', 'Bravo'])

  await click(header('Total').querySelector('button'))
  assert.equal(header('Total').getAttribute('aria-sort'), 'ascending')
  assert.deepEqual(firstColumn(), ['Bravo', 'Charlie'])

  await click(button('Next'))
  assert.deepEqual(firstColumn(), ['alpha'])
  assert.equal(button('Next').disabled, true)

  await render({ resetKey: 'b' })
  assert.deepEqual(firstColumn(), ['Bravo', 'Charlie'])

  const select = container.querySelector('select')
  await act(() => {
    select.value = 'all'
    select.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  assert.equal(firstColumn().length, 3)
  assert.match(container.textContent, /Page 1 of 1/)

  await act(() => root.unmount())
})
