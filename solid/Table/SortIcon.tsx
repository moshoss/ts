import { Show } from 'solid-js'
import type { SortDirection } from '@tanstack/solid-table'

export function SortIcon(props: { direction: SortDirection | false }) {
  return (
    <Show when={props.direction}>
      {(dir) => (
        <svg
          class="size-3.5 text-primary shrink-0"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <Show
            when={dir() === 'asc'}
            fallback={<path d="M8 11.5l-4.5-5h9l-4.5 5z" />}
          >
            <path d="M8 4.5l-4.5 5h9l-4.5-5z" />
          </Show>
        </svg>
      )}
    </Show>
  )
}
