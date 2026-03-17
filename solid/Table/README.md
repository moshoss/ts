# Table 表格组件

基于 [TanStack Solid Table](https://tanstack.com/table/latest) 封装的表格组件，支持列宽拖拽、行选择、行号、排序等功能。

## 安装依赖

```bash
pnpm add @tanstack/solid-table
```

## 导入

```tsx
import {
  Table,
  selectionColumn,
  indexColumn,
  useSortable,
} from '~/components/Table'

import type { TableProps, TableRef, SortState } from '~/components/Table'
```

## 目录结构

```
Table/
├── index.ts            # 统一导出入口
├── Table.tsx           # 表格主组件
├── selectionColumn.tsx # 全选列
├── indexColumn.ts      # 行号列
└── useSortable.tsx     # 排序 hook
```

---

## Table 主组件

### Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `data` | `T[]` | 是 | 表格数据 |
| `columns` | `ColumnDef<T, any>[]` | 是 | 列定义，使用 TanStack Table 的 ColumnDef |
| `class` | `string` | 否 | 自定义 CSS 类名 |
| `ref` | `(api: TableRef) => void` | 否 | 获取组件实例方法 |
| `onSelectionChange` | `(indexes: number[]) => void` | 否 | 选中行变化回调，返回选中行索引数组 |

### TableRef 方法

通过 `ref` 获取，用于外部控制表格状态。

| 方法 | 类型 | 说明 |
|------|------|------|
| `clearSelection` | `() => void` | 清空所有选中 |
| `deselectRow` | `(indexes: number[]) => void` | 取消指定行的选中 |
| `getSelectedRows` | `() => RowSelectionState` | 获取当前选中状态 |

### 基础用法

```tsx
import { type ColumnDef } from '@tanstack/solid-table'
import { Table } from '~/components/Table'

interface User {
  name: string
  age: number
}

const data: User[] = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
]

const columns: ColumnDef<User, any>[] = [
  { accessorKey: 'name', header: '姓名', size: 200 },
  { accessorKey: 'age', header: '年龄', size: 100 },
]

<Table data={data} columns={columns} />
```

### 内置功能

- **列宽拖拽**：默认启用，拖拽表头右侧边缘调整列宽。设置 `enableResizing: false` 可禁用某列。
- **固定表头**：表格滚动时表头自动吸顶。
- **单元格边框**：所有单元格默认带边框。

---

## selectionColumn 全选列

在 `columns` 中添加即可启用行选择功能。

```tsx
import { Table, selectionColumn } from '~/components/Table'
import type { TableRef } from '~/components/Table'

let tableRef: TableRef

const columns: ColumnDef<User, any>[] = [
  selectionColumn<User>(),
  { accessorKey: 'name', header: '姓名' },
]

<Table
  data={data}
  columns={columns}
  ref={(api) => (tableRef = api)}
  onSelectionChange={(indexes) => {
    console.log('选中行索引:', indexes) // [0, 2, 4]
  }}
/>

// 外部操作
<button onClick={() => tableRef.clearSelection()}>清空选中</button>
<button onClick={() => tableRef.deselectRow([0, 1])}>取消第1、2行</button>
```

特性：
- 表头 checkbox 支持全选/取消全选
- 支持 indeterminate 半选状态
- 选中行自动高亮（`data-state="selected"`）
- 固定 40px 宽度，不可拖拽调整

---

## indexColumn 行号列

自动显示从 1 开始的行号。

```tsx
import { Table, indexColumn } from '~/components/Table'

const columns: ColumnDef<User, any>[] = [
  indexColumn<User>(),
  { accessorKey: 'name', header: '姓名' },
]

<Table data={data} columns={columns} />
```

特性：
- 表头显示 `#`
- 固定 50px 宽度，不可拖拽调整

---

## useSortable 排序 Hook

### 参数

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `data` | `Accessor<T[]>` | 是 | 响应式数据源 |
| `defaultSort` | `SortState` | 否 | 初始排序状态 |

### 返回值

| 属性 | 类型 | 说明 |
|------|------|------|
| `sortedData` | `Accessor<T[]>` | 排序后的数据 |
| `sort` | `Accessor<SortState \| null>` | 当前排序状态 |
| `sortable` | `(col: ColumnDef) => ColumnDef` | 列定义包装函数，自动注入排序 UI |
| `clearSort` | `() => void` | 清除排序 |

### 用法

用 `sortable()` 包装需要排序的列，将 `sortedData()` 传给 Table：

```tsx
import { createSignal } from 'solid-js'
import { type ColumnDef } from '@tanstack/solid-table'
import { Table, indexColumn, useSortable } from '~/components/Table'

const [data] = createSignal([
  { name: 'Alice', price: 100 },
  { name: 'Bob', price: 200 },
])

const { sortedData, sortable, clearSort } = useSortable({ data })

const columns: ColumnDef<Item, any>[] = [
  indexColumn<Item>(),
  sortable({ accessorKey: 'name', header: '名称', size: 200 }),
  sortable({ accessorKey: 'price', header: '价格', size: 120 }),
]

<Table data={sortedData()} columns={columns} />
<button onClick={clearSort}>清除排序</button>
```

排序逻辑：点击表头循环切换 **升序 → 降序 → 无排序**。

支持数字比较和字符串 `localeCompare`，`null`/`undefined` 值排到末尾。

### 指定默认排序

```tsx
const { sortedData, sortable } = useSortable({
  data,
  defaultSort: { key: 'price', direction: 'desc' },
})
```

---

## 组合使用

所有功能可自由组合，按需在 columns 中添加：

```tsx
const { sortedData, sortable, clearSort } = useSortable({ data })

let tableRef: TableRef

const columns: ColumnDef<User, any>[] = [
  selectionColumn<User>(),
  indexColumn<User>(),
  sortable({ accessorKey: 'name', header: '姓名', size: 200 }),
  sortable({ accessorKey: 'age', header: '年龄', size: 100 }),
  {
    id: 'actions',
    header: '操作',
    size: 120,
    enableResizing: false,
    cell: (info) => <button>编辑</button>,
  },
]

<Table
  data={sortedData()}
  columns={columns}
  ref={(api) => (tableRef = api)}
  onSelectionChange={(indexes) => console.log(indexes)}
/>
```
