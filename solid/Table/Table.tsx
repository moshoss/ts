import { For, Show, createSignal, createMemo } from 'solid-js'
import {
  type RowSelectionState,
  type SortingState,
  type ColumnFiltersState,
  type ColumnPinningState,
  createSolidTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/solid-table'

import {
  Table as TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '~/components/ui/table'

import type { TableProps, TableColumnDef } from './types'
import { SortIcon } from './SortIcon'

export function Table<T>(props: TableProps<T>) {
  const [rowSelection, setRowSelection] = createSignal<RowSelectionState>({})
  const [sorting, setSorting] = createSignal<SortingState>([])
  const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([])

  const hasSelection = () => props.columns.some((c) => c.id === '__selection')

  const columnPinning = createMemo<ColumnPinningState>(() => {
    const left: string[] = []
    const right: string[] = []
    for (const col of props.columns as TableColumnDef<T>[]) {
      const id = col.id ?? (col as any).accessorKey
      if (!id) continue
      if (col.fixed === 'left') left.push(id)
      else if (col.fixed === 'right') right.push(id)
    }
    return { left, right }
  })

  props.ref?.({
    clearSelection: () => setRowSelection({}),
    deselectRow: (indexes: number[]) => {
      const next = { ...rowSelection() }
      indexes.forEach((i) => delete next[i])
      setRowSelection(next)
    },
    getSelectedRows: () => rowSelection(),
    clearSort: () => setSorting([]),
    clearFilters: () => setColumnFilters([]),
    reset: () => {
      setRowSelection({})
      setSorting([])
      setColumnFilters([])
    },
  })

  const columnsWithDefaults = createMemo(() =>
    props.columns.map((col) => ({
      enableSorting: false,
      enableColumnFilter: false,
      ...col,
    }))
  )

  const table = createSolidTable({
    get data() {
      return props.data
    },
    get columns() {
      return columnsWithDefaults()
    },
    state: {
      get rowSelection() {
        return rowSelection()
      },
      get sorting() {
        return sorting()
      },
      get columnFilters() {
        return columnFilters()
      },
      get columnPinning() {
        return columnPinning()
      },
    },
    enableRowSelection: hasSelection(),
    columnResizeMode: 'onChange',
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection()) : updater
      setRowSelection(next)
      props.onSelectionChange?.(Object.keys(next).filter((k) => next[k]).map(Number))
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const getPinnedStyle = (col: { column: { getIsPinned: () => false | 'left' | 'right', getStart: (pos?: string) => number, getAfter: (pos?: string) => number } }, isHeader: boolean) => {
    const pinned = col.column.getIsPinned()
    if (!pinned) return {}
    return {
      position: 'sticky' as const,
      [pinned]: `${pinned === 'left' ? col.column.getStart('left') : col.column.getAfter('right')}px`,
      'z-index': isHeader ? 30 : 20,
      'background-color': 'var(--background, hsl(var(--background)))',
    }
  }

  const isLastPinned = (col: { column: { getIsPinned: () => false | 'left' | 'right', getPinnedIndex: () => number } }, side: 'left' | 'right') => {
    const pinned = col.column.getIsPinned()
    if (pinned !== side) return false
    const pinnedCols = side === 'left' ? table.getLeftLeafColumns() : table.getRightLeafColumns()
    return col.column.getPinnedIndex() === pinnedCols.length - 1
  }

  const pinnedShadowClass = (col: { column: { getIsPinned: () => false | 'left' | 'right', getPinnedIndex: () => number } }) => {
    if (isLastPinned(col, 'left')) return 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]'
    if (isLastPinned(col, 'right')) return 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]'
    return ''
  }

  return (
    <TableRoot class={props.class} style={{ "table-layout": "fixed", width: "100%" }}>
      <colgroup>
        <For each={table.getAllLeafColumns()}>
          {(col) => (
            <col style={{ width: `${col.getSize()}px` }} />
          )}
        </For>
      </colgroup>
      <TableHeader>
        <For each={table.getHeaderGroups()}>
          {(headerGroup) => (
            <TableRow>
              <For each={headerGroup.headers}>
                {(header) => (
                  <TableHead
                    class={`relative group ${pinnedShadowClass(header)}`}
                    style={getPinnedStyle(header, true)}
                  >
                    <Show
                      when={!header.isPlaceholder && header.column.getCanSort()}
                      fallback={
                        header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())
                      }
                    >
                      <button
                        class="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon direction={header.column.getIsSorted()} />
                      </button>
                    </Show>
                    <Show when={header.column.getCanResize()}>
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        class="absolute top-0 right-0 w-1 h-full cursor-col-resize select-none touch-none bg-border opacity-0 group-hover:opacity-100"
                        classList={{ "opacity-100 bg-primary": header.column.getIsResizing() }}
                      />
                    </Show>
                  </TableHead>
                )}
              </For>
            </TableRow>
          )}
        </For>
      </TableHeader>
      <TableBody>
        <For each={table.getRowModel().rows}>
          {(row) => (
            <TableRow data-state={row.getIsSelected() ? 'selected' : undefined}>
              <For each={row.getVisibleCells()}>
                {(cell) => (
                  <TableCell
                    class={pinnedShadowClass(cell)}
                    style={getPinnedStyle(cell, false)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                )}
              </For>
            </TableRow>
          )}
        </For>
      </TableBody>
    </TableRoot>
  )
}
