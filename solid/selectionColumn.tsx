import { type ColumnDef } from '@tanstack/solid-table'

export function selectionColumn<T>(): ColumnDef<T, any> {
  return {
    id: '__selection',
    size: 40,
    enableResizing: false,
    header: ({ table }) => (
      <input
        type="checkbox"
        class="accent-primary"
        checked={table.getIsAllRowsSelected()}
        ref={(el) => {
          queueMicrotask(() => {
            el.indeterminate = table.getIsSomeRowsSelected()
          })
        }}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        class="accent-primary"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  }
}
