import { type ColumnDef } from '@tanstack/solid-table'

export function indexColumn<T>(): ColumnDef<T, any> {
  return {
    id: '__index',
    header: '#',
    size: 50,
    enableResizing: false,
    cell: (info) => info.row.index + 1,
  }
}
