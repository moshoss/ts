import { createPopover, type Popover } from './popover.js'

export interface SelectionPopoverOptions {
  /** 监听选中事件的容器，默认 document */
  container?: HTMLElement | Document
  /** 弹窗内容渲染，接收选中文字，返回要显示的 DOM 元素 */
  render: (text: string, range: Range) => HTMLElement
  /** 弹窗与选区的间距，默认 8 */
  offset?: number
  /** 弹窗打开回调 */
  onOpen?: (text: string) => void
  /** 弹窗关闭回调 */
  onClose?: () => void
}

/**
 * 选中文字弹窗（基于 Popover）
 *
 * 选中文字后，创建一个不可见的虚拟 trigger 定位到选区，
 * 然后用 Popover 处理弹窗定位、翻转和关闭。
 *
 * @example
 * ```ts
 * createSelectionPopover({
 *   container: articleEl,
 *   render(text) {
 *     const div = document.createElement('div')
 *     div.innerHTML = `<button>复制</button><button>高亮</button>`
 *     return div
 *   },
 * })
 * ```
 */
export const createSelectionPopover = (options: SelectionPopoverOptions) => {
  const { container = document, render, offset = 8, onOpen, onClose } = options

  // 虚拟 trigger：不可见元素，定位到选区位置，供 Popover 计算弹窗坐标
  let triggerEl: HTMLElement | null = null
  let popover: Popover | null = null

  /** 将虚拟 trigger 定位到选区 rect */
  const positionTrigger = (rect: DOMRect) => {
    if (!triggerEl) {
      triggerEl = document.createElement('div')
      Object.assign(triggerEl.style, {
        position: 'fixed',
        pointerEvents: 'none',
        opacity: '0',
      })
      document.body.appendChild(triggerEl)
    }
    Object.assign(triggerEl.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
  }

  const close = () => {
    if (!popover) return
    popover.destroy()
    popover = null
    triggerEl?.remove()
    triggerEl = null
    onClose?.()
  }

  /** mouseup 时检查是否有选中文字 */
  const onMouseUp = () => {
    // 延迟一帧，等浏览器更新 selection
    requestAnimationFrame(() => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        close()
        return
      }

      const text = selection.toString().trim()
      if (!text) {
        close()
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // 先关闭旧的
      close()

      // 虚拟 trigger 定位到选区
      positionTrigger(rect)

      // 渲染弹窗内容
      const contentEl = render(text, range)

      // 用 Popover 处理定位和关闭
      popover = createPopover({
        trigger: triggerEl!,
        content: contentEl,
        placement: 'top',
        align: 'start',
        triggerMode: 'click',
        offset,
        closeOnOutsideClick: true,
        closeOnEscape: true,
        initialOpen: true,
        onClose() {
          // Popover 关闭后清理虚拟 trigger
          triggerEl?.remove()
          triggerEl = null
          popover = null
          onClose?.()
        },
      })

      onOpen?.(text)
    })
  }

  // ---- 绑定事件 ----
  container.addEventListener('mouseup', onMouseUp as EventListener)

  const destroy = () => {
    close()
    container.removeEventListener('mouseup', onMouseUp as EventListener)
  }

  return { close, destroy }
}
