import type { Accessor } from 'solid-js'
import type { ColumnDef, RowSelectionState } from '@tanstack/solid-table'

// ---- Column ----

/** Extended column definition with custom meta */
export type TableColumnDef<T, V = any> = ColumnDef<T, V> & {
  /** Pin this column to the left or right edge of the table */
  fixed?: 'left' | 'right'
}

// ---- Table Component ----

export interface TableRef {
  clearSelection: () => void
  deselectRow: (indexes: number[]) => void
  getSelectedRows: () => RowSelectionState
  clearSort: () => void
  clearFilters: () => void
  reset: () => void
}

export interface TableProps<T> {
  data: T[]
  columns: TableColumnDef<T>[]
  class?: string
  ref?: (api: TableRef) => void
  onSelectionChange?: (indexes: number[]) => void
}

// ---- Filter ----

export interface FilterColumnOptions {
  mode?: 'search' | 'select'
  options?: string[]
}

// ---- useTable ----

export interface UseTableOptions<T> {
  data: Accessor<T[]>
}

export interface UseTableReturn<T> {
  // Column helpers
  selectionColumn: () => TableColumnDef<T>
  indexColumn: () => TableColumnDef<T>
  sortable: (col: TableColumnDef<T>) => TableColumnDef<T>
  filterable: (col: TableColumnDef<T>, opts?: FilterColumnOptions) => TableColumnDef<T>
}
