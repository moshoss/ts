/**
 * @module infinite-scroll
 * @description 无限滚动加载，滚动到底部时自动触发加载更多。
 */

/** 无限滚动配置 */
export interface InfiniteScrollOptions {
  /** 滚动容器 */
  container: HTMLElement
  /** 加载更多数据的异步函数 */
  loadMore: () => Promise<void>
  /** 触发加载的底部距离阈值（px），默认 200 */
  threshold?: number
  /** 是否在初始化时立即加载一次，默认 true */
  initialLoad?: boolean
}

/**
 * 创建无限滚动
 *
 * @example
 * ```ts
 * const is = createInfiniteScroll({
 *   container: listEl,
 *   async loadMore() {
 *     const data = await fetchPage(page++)
 *     appendItems(data)
 *   },
 * })
 * ```
 */
export const createInfiniteScroll = (options: InfiniteScrollOptions) => {
  const { container, loadMore, threshold = 200, initialLoad = true } = options

  let loading = false
  let destroyed = false

  // 加载指示器
  const indicator = document.createElement('div')
  Object.assign(indicator.style, {
    textAlign: 'center',
    padding: '12px',
    color: '#999',
    fontSize: '14px',
    display: 'none',
  })
  indicator.textContent = '加载中...'
  container.appendChild(indicator)

  const doLoad = async () => {
    if (loading || destroyed) return
    loading = true
    indicator.style.display = 'block'
    try {
      await loadMore()
    } finally {
      loading = false
      if (!destroyed) {
        indicator.style.display = 'none'
      }
    }
  }

  const onScroll = () => {
    if (loading || destroyed) return
    const { scrollTop, scrollHeight, clientHeight } = container
    if (scrollHeight - scrollTop - clientHeight <= threshold) {
      doLoad()
    }
  }

  container.addEventListener('scroll', onScroll)

  if (initialLoad) {
    doLoad()
  }

  const reset = () => {
    loading = false
    indicator.style.display = 'none'
  }

  const destroy = () => {
    destroyed = true
    container.removeEventListener('scroll', onScroll)
    indicator.remove()
  }

  return { reset, destroy }
}
