/**
 * @module virtual-scroll
 * @description 虚拟滚动列表，仅渲染可见区域的元素，适用于大数据量列表。
 */

/** 虚拟滚动配置 */
export interface VirtualScrollOptions {
  /** 滚动容器 */
  container: HTMLElement
  /** 数据列表 */
  items: any[]
  /** 每项固定高度（px） */
  itemHeight: number
  /** 渲染单个元素 */
  renderItem: (item: any, index: number) => HTMLElement
  /** 上下预渲染缓冲区数量，默认 5 */
  overscan?: number
}

/**
 * 创建虚拟滚动列表
 *
 * @example
 * ```ts
 * const vs = createVirtualScroll({
 *   container: listEl,
 *   items: Array.from({ length: 10000 }, (_, i) => `Item ${i}`),
 *   itemHeight: 40,
 *   renderItem(item) {
 *     const div = document.createElement('div')
 *     div.textContent = item
 *     return div
 *   },
 * })
 * ```
 */
export const createVirtualScroll = (options: VirtualScrollOptions) => {
  const { container, renderItem, itemHeight, overscan = 5 } = options
  let items = [...options.items]

  // 容器设置
  container.style.overflow = 'auto'
  container.style.position = 'relative'

  // 占位元素，撑起总高度
  const spacer = document.createElement('div')
  spacer.style.width = '100%'
  spacer.style.pointerEvents = 'none'

  // 实际内容容器
  const content = document.createElement('div')
  content.style.position = 'absolute'
  content.style.left = '0'
  content.style.right = '0'
  content.style.top = '0'

  container.appendChild(spacer)
  container.appendChild(content)

  const render = () => {
    const scrollTop = container.scrollTop
    const viewHeight = container.clientHeight
    const totalHeight = items.length * itemHeight

    spacer.style.height = `${totalHeight}px`

    // 可见范围
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewHeight) / itemHeight) + overscan)

    content.innerHTML = ''
    content.style.top = `${startIndex * itemHeight}px`

    for (let i = startIndex; i < endIndex; i++) {
      const el = renderItem(items[i], i)
      el.style.height = `${itemHeight}px`
      el.style.boxSizing = 'border-box'
      content.appendChild(el)
    }
  }

  const onScroll = () => render()
  container.addEventListener('scroll', onScroll)
  render()

  const update = (newItems: any[]) => {
    items = [...newItems]
    render()
  }

  const scrollTo = (index: number) => {
    container.scrollTop = index * itemHeight
  }

  const destroy = () => {
    container.removeEventListener('scroll', onScroll)
    spacer.remove()
    content.remove()
  }

  return { update, scrollTo, destroy }
}
