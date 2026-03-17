import { createSignal, createMemo, Show, For } from 'solid-js'

import type {
  TableColumnDef,
  FilterColumnOptions,
  UseTableOptions,
  UseTableReturn,
} from './types'

export function useTable<T>(options: UseTableOptions<T>): UseTableReturn<T> {
  // ---- Column helpers ----

  const selectionColumn = (): TableColumnDef<T> => ({
    id: '__selection',
    size: 40,
    enableResizing: false,
    enableSorting: false,
    enableColumnFilter: false,
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
  })

  const indexColumn = (): TableColumnDef<T> => ({
    id: '__index',
    header: '#',
    size: 50,
    enableResizing: false,
    enableSorting: false,
    enableColumnFilter: false,
    cell: (info) => info.row.index + 1,
  })

  const sortable = (col: TableColumnDef<T>): TableColumnDef<T> => {
    return {
      ...col,
      enableSorting: true,
    } as TableColumnDef<T>
  }

  const filterable = (col: TableColumnDef<T>, colOpts?: FilterColumnOptions): TableColumnDef<T> => {
    const key = (col as any).accessorKey as string
    const originalHeader = col.header
    const mode = colOpts?.mode ?? 'search'

    return {
      ...col,
      enableColumnFilter: true,
      filterFn: mode === 'select'
        ? (row: any, columnId: string, filterValue: string[]) => {
            if (!filterValue || filterValue.length === 0) return true
            const cellVal = row.getValue(columnId)
            return cellVal != null && filterValue.includes(String(cellVal))
          }
        : (row: any, columnId: string, filterValue: string) => {
            if (!filterValue) return true
            const cellVal = row.getValue(columnId)
            return cellVal != null && String(cellVal).toLowerCase().includes(filterValue.toLowerCase())
          },
      header: (ctx: any) => {
        const label = typeof originalHeader === 'function' ? originalHeader(ctx) : originalHeader
        const column = ctx.column
        const [open, setOpen] = createSignal(false)

        const isActive = () => {
          const v = column.getFilterValue()
          if (v == null) return false
          if (Array.isArray(v)) return v.length > 0
          return v !== ''
        }

        const uniqueOptions = createMemo(() => {
          if (colOpts?.options) return colOpts.options
          const values = new Set<string>()
          options.data().forEach((row) => {
            const v = (row as any)[key]
            if (v != null) values.add(String(v))
          })
          return [...values].sort()
        })

        return (
          <div class="flex items-center gap-1">
            <span>{label}</span>
            <div class="relative">
              <button
                class="inline-flex items-center justify-center size-5 rounded hover:bg-muted transition-colors cursor-pointer"
                classList={{ 'text-primary': isActive(), 'text-muted-foreground': !isActive() }}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(!open())
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </button>
              <Show when={open()}>
                <div
                  class="absolute top-full left-0 z-20 mt-1 min-w-45 rounded-md border border-border bg-popover p-2 shadow-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  {mode === 'search' ? (
                    <div class="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="搜索筛选..."
                        class="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
                        value={(column.getFilterValue() as string) ?? ''}
                        onInput={(e) => column.setFilterValue(e.currentTarget.value || undefined)}
                      />
                      <Show when={isActive()}>
                        <button
                          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => column.setFilterValue(undefined)}
                        >
                          清除
                        </button>
                      </Show>
                    </div>
                  ) : (
                    <div class="flex flex-col gap-1 max-h-50 overflow-y-auto">
                      <For each={uniqueOptions()}>
                        {(option) => {
                          const selected = () => {
                            const v = column.getFilterValue() as string[] | undefined
                            return Array.isArray(v) && v.includes(option)
                          }
                          return (
                            <label class="flex items-center gap-2 px-1 py-0.5 text-sm rounded hover:bg-muted cursor-pointer">
                              <input
                                type="checkbox"
                                class="accent-primary"
                                checked={selected()}
                                onChange={() => {
                                  const current = (column.getFilterValue() as string[]) ?? []
                                  if (selected()) {
                                    const next = current.filter((v: string) => v !== option)
                                    column.setFilterValue(next.length > 0 ? next : undefined)
                                  } else {
                                    column.setFilterValue([...current, option])
                                  }
                                }}
                              />
                              {option}
                            </label>
                          )
                        }}
                      </For>
                      <Show when={isActive()}>
                        <button
                          class="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => column.setFilterValue(undefined)}
                        >
                          清除
                        </button>
                      </Show>
                    </div>
                  )}
                </div>
              </Show>
            </div>
          </div>
        )
      },
    } as TableColumnDef<T>
  }

  return {
    selectionColumn,
    indexColumn,
    sortable,
    filterable,
  }
}
