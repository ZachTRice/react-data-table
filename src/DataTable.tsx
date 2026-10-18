'use client'

import * as React from 'react'
import { sortRows, type SortDirection } from './sortRows.js'

export interface DataTableColumn<Row> {
  /** Unique column id. Also the row property shown when there is no `render`. */
  key: string
  label: React.ReactNode
  /** Cell content. Default: `row[key]`. */
  render?: (row: Row) => React.ReactNode
  /** Value to sort by. Default: `row[key]`. */
  sortValue?: (row: Row) => unknown
  /** Set to false for a plain, non-sortable header. Default true. */
  sortable?: boolean
  /** Direction applied when the column is first clicked. Default 'asc'. */
  firstDir?: SortDirection
  align?: 'center' | 'right'
  /** Keep cell content on one line. */
  nowrap?: boolean
}

export interface DataTableSort {
  key: string
  dir: SortDirection
}

export type PageSizeOption = number | 'all'

export interface DataTableClassNames {
  root: string
  scroll: string
  table: string
  cellCenter: string
  cellRight: string
  cellNowrap: string
  sortButton: string
  sortButtonActive: string
  sortIcon: string
  pager: string
  range: string
  pageSize: string
  pageSizeSelect: string
  pagerButtons: string
  pagerButton: string
  page: string
  empty: string
}

export interface DataTableRangeInfo {
  from: number
  to: number
  total: number
  /** `noun` or `nounPlural`, matching `total`. */
  noun: string
}

export interface DataTableLabels {
  pagination: string
  rowsPerPage: string
  all: string
  first: string
  previous: string
  next: string
  last: string
  range: (info: DataTableRangeInfo) => React.ReactNode
  page: (info: { page: number, pageCount: number }) => React.ReactNode
}

export interface DataTableProps<Row> {
  rows: readonly Row[]
  columns: readonly DataTableColumn<Row>[]
  rowKey: (row: Row) => React.Key
  /** Initial sort. Omit to keep the incoming row order until a header is clicked. */
  defaultSort?: DataTableSort
  /** Change this (for example, to a string of your filter values) to return to page 1. */
  resetKey?: React.Key
  emptyMessage?: React.ReactNode
  /** Default 50. */
  defaultPageSize?: PageSizeOption
  /** Default [25, 50, 100, 250, 'all']. */
  pageSizeOptions?: readonly PageSizeOption[]
  /** Singular name for a row, used in the range text. Default 'row'. */
  noun?: string
  /** Default `${noun}s`. */
  nounPlural?: string
  /** Scroll the table into view after a page change. Default true. */
  scrollOnPageChange?: boolean
  /** Merged over the default `data-table*` class names. */
  classNames?: Partial<DataTableClassNames>
  labels?: Partial<DataTableLabels>
}

export const defaultClassNames: DataTableClassNames = {
  root: 'data-table',
  scroll: 'data-table-scroll',
  table: 'data-table-table',
  cellCenter: 'is-center',
  cellRight: 'is-right',
  cellNowrap: 'is-nowrap',
  sortButton: 'data-table-sort',
  sortButtonActive: 'is-active',
  sortIcon: 'data-table-sort-icon',
  pager: 'data-table-pager',
  range: 'data-table-range',
  pageSize: 'data-table-page-size',
  pageSizeSelect: 'data-table-page-size-select',
  pagerButtons: 'data-table-pager-buttons',
  pagerButton: 'data-table-pager-button',
  page: 'data-table-page',
  empty: 'data-table-empty'
}

export const defaultLabels: DataTableLabels = {
  pagination: 'Table pages',
  rowsPerPage: 'Rows per page',
  all: 'All',
  first: 'First page',
  previous: 'Previous',
  next: 'Next',
  last: 'Last page',
  range: ({ from, to, total, noun }) => `Showing ${from}–${to} of ${total} ${noun}`,
  page: ({ page, pageCount }) => `Page ${page} of ${pageCount}`
}

const DEFAULT_PAGE_SIZE_OPTIONS: readonly PageSizeOption[] = [25, 50, 100, 250, 'all']

const cx = (...names: Array<string | false | undefined>): string | undefined =>
  names.filter(Boolean).join(' ') || undefined

/**
 * Client-side sortable, paginated table. Headers are buttons with `aria-sort`,
 * blank values always sort last, and the page size can be set to "All".
 */
export function DataTable<Row> (props: DataTableProps<Row>): React.ReactElement {
  const {
    rows,
    columns,
    rowKey,
    defaultSort,
    resetKey = '',
    emptyMessage = 'No results.',
    defaultPageSize = 50,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
    noun = 'row',
    nounPlural = `${noun}s`,
    scrollOnPageChange = true
  } = props
  const cls = { ...defaultClassNames, ...props.classNames }
  const text = { ...defaultLabels, ...props.labels }

  const [sort, setSort] = React.useState<DataTableSort | undefined>(defaultSort)
  const [pageSize, setPageSize] = React.useState<PageSizeOption>(defaultPageSize)
  const [page, setPage] = React.useState(1)
  const topRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => { setPage(1) }, [resetKey])

  const sorted = React.useMemo(
    () => sortRows(rows, sort && columns.find((column) => column.key === sort.key), sort?.dir),
    [rows, columns, sort]
  )

  if (rows.length === 0) return <p className={cls.empty}>{emptyMessage}</p>

  const size = pageSize === 'all' ? Math.max(sorted.length, 1) : pageSize
  const pageCount = Math.max(1, Math.ceil(sorted.length / size))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * size
  const visible = sorted.slice(start, start + size)

  const cellClass = (column: DataTableColumn<Row>) => cx(
    column.align === 'center' && cls.cellCenter,
    column.align === 'right' && cls.cellRight,
    column.nowrap && cls.cellNowrap
  )

  const handleSort = (column: DataTableColumn<Row>) => {
    setSort((prev) => prev?.key === column.key
      ? { key: column.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key: column.key, dir: column.firstDir ?? 'asc' })
    setPage(1)
  }

  const goTo = (next: number) => {
    setPage(Math.min(Math.max(next, 1), pageCount))
    if (scrollOnPageChange) topRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  }

  return (
    <div ref={topRef} className={cls.root}>
      <div className={cls.scroll}>
        <table className={cls.table}>
          <thead>
            <tr>
              {columns.map((column) => {
                if (column.sortable === false) {
                  return <th key={column.key} scope='col' className={cellClass(column)}>{column.label}</th>
                }
                const active = sort?.key === column.key
                const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                return (
                  <th key={column.key} scope='col' aria-sort={ariaSort} className={cellClass(column)}>
                    <button type='button' className={cx(cls.sortButton, active && cls.sortButtonActive)} onClick={() => handleSort(column)}>
                      {column.label}
                      <span className={cls.sortIcon} aria-hidden='true'>{active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={cellClass(column)}>
                    {column.render ? column.render(row) : (row as Record<string, unknown>)[column.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className={cls.pager} aria-label={text.pagination}>
        <span className={cls.range}>
          {text.range({ from: start + 1, to: start + visible.length, total: sorted.length, noun: sorted.length === 1 ? noun : nounPlural })}
        </span>
        <label className={cls.pageSize}>
          {text.rowsPerPage}
          <select
            className={cls.pageSizeSelect}
            value={String(pageSize)}
            onChange={(event) => {
              setPageSize(event.target.value === 'all' ? 'all' : Number(event.target.value))
              setPage(1)
            }}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={String(option)}>{option === 'all' ? text.all : option}</option>
            ))}
          </select>
        </label>
        <div className={cls.pagerButtons}>
          <button type='button' className={cls.pagerButton} onClick={() => goTo(1)} disabled={current === 1} aria-label={text.first}>«</button>
          <button type='button' className={cls.pagerButton} onClick={() => goTo(current - 1)} disabled={current === 1}>{text.previous}</button>
          <span className={cls.page}>{text.page({ page: current, pageCount })}</span>
          <button type='button' className={cls.pagerButton} onClick={() => goTo(current + 1)} disabled={current === pageCount}>{text.next}</button>
          <button type='button' className={cls.pagerButton} onClick={() => goTo(pageCount)} disabled={current === pageCount} aria-label={text.last}>»</button>
        </div>
      </nav>
    </div>
  )
}
