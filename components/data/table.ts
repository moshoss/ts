/**
 * @module table
 * @description 数据表格，支持列排序、自定义渲染、交替行色和悬停高亮。
 */

/** 列定义 */
export interface Column {
  /** 数据字段 key */
  key: string
  /** 列标题 */
  title: string
  /** 列宽 */
  width?: string
  /** 是否可排序 */
  sortable?: boolean
  /** 自定义单元格渲染 */
  render?: (value: any, row: any, index: number) => string | HTMLElement
}

/** 排序方向 */
export type SortDirection = 'asc' | 'desc' | null

/** 表格配置 */
export interface TableOptions {
  /** 表格容器 */
  container: HTMLElement
  /** 列定义 */
  columns: Column[]
  /** 数据 */
  data: any[]
}

/**
 * 创建数据表格
 *
 * @example
 * ```ts
 * const table = createTable({
 *   container: el,
 *   columns: [
 *     { key: 'name', title: '姓名', sortable: true },
 *     { key: 'age', title: '年龄', sortable: true },
 *   ],
 *   data: [{ name: '张三', age: 25 }],
 * })
 * ```
 */
export const createTable = (options: TableOptions) => {
  const { container, columns } = options
  let data = [...options.data]
  let sortKey: string | null = null
  let sortDir: SortDirection = null

  const tableEl = document.createElement('table')
  Object.assign(tableEl.style, {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    color: '#333',
  })

  const thead = document.createElement('thead')
  const tbody = document.createElement('tbody')
  tableEl.appendChild(thead)
  tableEl.appendChild(tbody)
  container.appendChild(tableEl)

  const cellStyle: Partial<CSSStyleDeclaration> = {
    padding: '10px 12px',
    borderBottom: '1px solid #eee',
    textAlign: 'left',
  }

  const renderHead = () => {
    thead.innerHTML = ''
    const tr = document.createElement('tr')
    tr.style.backgroundColor = '#fafafa'

    for (const col of columns) {
      const th = document.createElement('th')
      Object.assign(th.style, cellStyle, { fontWeight: '600', cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none' })
      if (col.width) th.style.width = col.width

      let label = col.title
      if (col.sortable && sortKey === col.key && sortDir) {
        label += sortDir === 'asc' ? ' ↑' : ' ↓'
      }
      th.textContent = label

      if (col.sortable) {
        th.addEventListener('click', () => sort(col.key))
      }

      tr.appendChild(th)
    }

    thead.appendChild(tr)
  }

  const renderBody = () => {
    tbody.innerHTML = ''

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const tr = document.createElement('tr')
      tr.style.backgroundColor = i % 2 === 0 ? '#fff' : '#fafafa'
      tr.addEventListener('mouseenter', () => { tr.style.backgroundColor = '#f0f7ff' })
      tr.addEventListener('mouseleave', () => { tr.style.backgroundColor = i % 2 === 0 ? '#fff' : '#fafafa' })

      for (const col of columns) {
        const td = document.createElement('td')
        Object.assign(td.style, cellStyle)
        if (col.width) td.style.width = col.width

        const value = row[col.key]
        if (col.render) {
          const result = col.render(value, row, i)
          if (typeof result === 'string') {
            td.textContent = result
          } else {
            td.appendChild(result)
          }
        } else {
          td.textContent = value != null ? String(value) : ''
        }

        tr.appendChild(td)
      }

      tbody.appendChild(tr)
    }
  }

  const sort = (key: string, direction?: SortDirection) => {
    if (direction !== undefined) {
      sortKey = key
      sortDir = direction
    } else if (sortKey === key) {
      // 循环: asc -> desc -> null
      sortDir = sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc'
      if (!sortDir) sortKey = null
    } else {
      sortKey = key
      sortDir = 'asc'
    }

    if (sortKey && sortDir) {
      data.sort((a, b) => {
        const va = a[sortKey!]
        const vb = b[sortKey!]
        if (va == null) return 1
        if (vb == null) return -1
        const cmp = va < vb ? -1 : va > vb ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    renderHead()
    renderBody()
  }

  const update = (newData: any[]) => {
    data = [...newData]
    sortKey = null
    sortDir = null
    renderHead()
    renderBody()
  }

  const destroy = () => {
    tableEl.remove()
  }

  renderHead()
  renderBody()

  return { update, sort, destroy }
}
