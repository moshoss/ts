/**
 * @module tree
 * @description 树形控件，支持展开/折叠、节点选中、全部展开/折叠。
 */

/** 树节点 */
export interface TreeNode {
  /** 唯一标识 */
  key: string
  /** 显示文本 */
  label: string
  /** 子节点 */
  children?: TreeNode[]
  /** 是否展开 */
  expanded?: boolean
  /** 是否选中 */
  selected?: boolean
}

/** 树形控件配置 */
export interface TreeOptions {
  /** 容器元素 */
  container: HTMLElement
  /** 树数据 */
  data: TreeNode[]
  /** 选中节点回调 */
  onSelect?: (node: TreeNode) => void
  /** 展开/折叠回调 */
  onExpand?: (node: TreeNode) => void
}

/**
 * 创建树形控件
 *
 * @example
 * ```ts
 * const tree = createTree({
 *   container: el,
 *   data: [
 *     { key: '1', label: '目录', children: [
 *       { key: '1-1', label: '文件.ts' },
 *     ]},
 *   ],
 *   onSelect(node) { console.log(node.label) },
 * })
 * ```
 */
export const createTree = (options: TreeOptions) => {
  const { container, onSelect, onExpand } = options
  let data = deepClone(options.data)
  let selectedKey: string | null = null

  const renderNode = (node: TreeNode, depth: number, parent: HTMLElement) => {
    const hasChildren = node.children && node.children.length > 0
    const row = document.createElement('div')
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      padding: '4px 8px',
      paddingLeft: `${depth * 20 + 8}px`,
      cursor: 'pointer',
      fontSize: '14px',
      color: '#333',
      borderRadius: '4px',
      backgroundColor: node.key === selectedKey ? '#e6f7ff' : 'transparent',
    })

    // 展开/折叠箭头
    const arrow = document.createElement('span')
    Object.assign(arrow.style, {
      width: '16px',
      height: '16px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      flexShrink: '0',
      marginRight: '4px',
      transition: 'transform 0.2s',
      transform: node.expanded ? 'rotate(90deg)' : 'rotate(0deg)',
    })
    arrow.textContent = hasChildren ? '▶' : ''
    row.appendChild(arrow)

    // 标签
    const label = document.createElement('span')
    label.textContent = node.label
    label.style.userSelect = 'none'
    row.appendChild(label)

    // 悬停效果
    row.addEventListener('mouseenter', () => {
      if (node.key !== selectedKey) row.style.backgroundColor = '#f5f5f5'
    })
    row.addEventListener('mouseleave', () => {
      row.style.backgroundColor = node.key === selectedKey ? '#e6f7ff' : 'transparent'
    })

    // 点击箭头展开/折叠
    if (hasChildren) {
      arrow.style.cursor = 'pointer'
      arrow.addEventListener('click', (e) => {
        e.stopPropagation()
        node.expanded = !node.expanded
        onExpand?.(node)
        render()
      })
    }

    // 点击行选中
    row.addEventListener('click', () => {
      selectedKey = node.key
      node.selected = true
      onSelect?.(node)
      render()
    })

    parent.appendChild(row)

    // 递归渲染子节点
    if (hasChildren && node.expanded) {
      for (const child of node.children!) {
        renderNode(child, depth + 1, parent)
      }
    }
  }

  const render = () => {
    container.innerHTML = ''
    for (const node of data) {
      renderNode(node, 0, container)
    }
  }

  const walkAll = (nodes: TreeNode[], fn: (n: TreeNode) => void) => {
    for (const n of nodes) {
      fn(n)
      if (n.children) walkAll(n.children, fn)
    }
  }

  const expandAll = () => {
    walkAll(data, (n) => { if (n.children?.length) n.expanded = true })
    render()
  }

  const collapseAll = () => {
    walkAll(data, (n) => { n.expanded = false })
    render()
  }

  const getSelected = (): TreeNode | null => {
    let found: TreeNode | null = null
    walkAll(data, (n) => { if (n.key === selectedKey) found = n })
    return found
  }

  const update = (newData: TreeNode[]) => {
    data = deepClone(newData)
    selectedKey = null
    render()
  }

  const destroy = () => {
    container.innerHTML = ''
  }

  render()

  return { update, expandAll, collapseAll, getSelected, destroy }
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
