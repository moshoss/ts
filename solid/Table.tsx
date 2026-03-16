import { For, Show, createSignal } from 'solid-js'
import {
  type ColumnDef,
  type RowSelectionState,
  createSolidTable,
  getCoreRowModel,
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

export interface TableProps<T> {
  data: T[]
  columns: ColumnDef<T, any>[]
  class?: string
  onSelectionChange?: (rows: T[]) => void
}

export function Table<T>(props: TableProps<T>) {
  const [rowSelection, setRowSelection] = createSignal<RowSelectionState>({})

  const hasSelection = () => props.columns.some((c) => c.id === '__selection')

  const table = createSolidTable({
    get data() {
      return props.data
    },
    get columns() {
      return props.columns
    },
    state: {
      get rowSelection() {
        return rowSelection()
      },
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection()) : updater
      setRowSelection(next)
      props.onSelectionChange?.(
        Object.keys(next)
          .filter((k) => next[k])
          .map((k) => props.data[Number(k)])
      )
    },
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    get enableRowSelection() {
      return hasSelection()
    },
  })

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
                  <TableHead class="relative group">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                  <TableCell>
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
