export type SortDirection = 'asc' | 'desc'

export interface SortColumn<Row> {
  key: string
  /** Value to sort by. Default: `row[key]`. */
  sortValue?: (row: Row) => unknown
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

const isBlank = (value: unknown): boolean =>
  value === null || value === undefined || value === '' || (typeof value === 'number' && Number.isNaN(value))

function compareValues (a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return collator.compare(String(a), String(b))
}

/**
 * Returns a new array sorted by `column` in `dir`. The sort is stable, compares
 * text case-insensitively with natural number ordering ("item 9" < "item 10"),
 * and always places blank values (null, undefined, '', NaN) last.
 */
export function sortRows<Row> (
  rows: readonly Row[],
  column: SortColumn<Row> | null | undefined,
  dir: SortDirection = 'asc'
): Row[] {
  if (!column) return rows.slice()
  const valueOf = column.sortValue ?? ((row: Row) => (row as Record<string, unknown>)[column.key])
  const sign = dir === 'desc' ? -1 : 1
  return rows
    .map((row, index) => ({ row, index, value: valueOf(row) }))
    .sort((a, b) => {
      const aBlank = isBlank(a.value)
      const bBlank = isBlank(b.value)
      if (aBlank || bBlank) return aBlank === bBlank ? a.index - b.index : (aBlank ? 1 : -1)
      return (sign * compareValues(a.value, b.value)) || (a.index - b.index)
    })
    .map((entry) => entry.row)
}
