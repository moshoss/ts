export interface DraggableOptions {
  /** 限制拖拽范围到视口内，默认 true */
  bounded?: boolean
  /** 拖拽手柄元素，仅在该元素上按下鼠标才会触发拖拽，默认为目标元素自身 */
  handle?: HTMLElement
  /** 拖拽开始时触发，参数为元素当前 left/top */
  onDragStart?: (x: number, y: number) => void
  /** 拖拽移动过程中持续触发，参数为元素实时 left/top */
  onDragMove?: (x: number, y: number) => void
  /** 拖拽结束时触发，参数为元素最终 left/top */
  onDragEnd?: (x: number, y: number) => void
}

/**
 * 为指定 DOM 元素创建拖拽能力
 *
 * 原理：
 *   1. 在 handle（手柄）上监听 mousedown，记录鼠标起始坐标和元素初始位置
 *   2. 在 document 上监听 mousemove，计算鼠标偏移量并更新元素 left/top
 *   3. 在 document 上监听 mouseup，结束拖拽并清理事件
 *   - 事件绑定在 document 而非元素上，是为了鼠标快速移出元素时仍能正常拖拽
 *
 * @param el - 要拖拽的目标元素，会被设置为 position: fixed
 * @param options - 配置项
 * @returns { destroy } - 调用 destroy() 移除所有事件监听，释放资源
 *
 * @example
 * ```ts
 * const { destroy } = createDraggable(boxEl, {
 *   handle: headerEl,   // 只能通过 header 拖拽
 *   bounded: true,      // 不超出视口
 *   onDragMove(x, y) { console.log(x, y) },
 * })
 *
 * // 不再需要时销毁
 * destroy()
 * ```
 */
export const createDraggable = (el: HTMLElement, options: DraggableOptions = {}) => {
  const { bounded = true, handle = el, onDragStart, onDragMove, onDragEnd } = options

  // 鼠标按下时的起始坐标（视口坐标）
  let startX = 0
  let startY = 0
  // 拖拽开始时元素的 left/top 值
  let initLeft = 0
  let initTop = 0
  // 当前是否处于拖拽状态
  let dragging = false

  /** 从 computedStyle 中解析元素当前的 left/top 像素值 */
  const getPosition = () => {
    const style = getComputedStyle(el)
    return {
      left: parseInt(style.left, 10) || 0,
      top: parseInt(style.top, 10) || 0,
    }
  }

  /** 将 left/top 限制在视口范围内，防止元素被拖出可视区域 */
  const clamp = (left: number, top: number) => {
    if (!bounded) return { left, top }
    const rect = el.getBoundingClientRect()
    // 最大偏移 = 视口尺寸 - 元素尺寸，确保元素右/下边缘不超出视口
    const maxLeft = window.innerWidth - rect.width
    const maxTop = window.innerHeight - rect.height
    return {
      left: Math.max(0, Math.min(left, maxLeft)),
      top: Math.max(0, Math.min(top, maxTop)),
    }
  }

  /** mousedown: 开始拖拽，记录初始状态，绑定 move/up 事件 */
  const onMouseDown = (e: MouseEvent) => {
    // 只响应鼠标左键
    if (e.button !== 0) return
    // 阻止默认行为（如文本选中、图片拖拽）
    e.preventDefault()

    dragging = true
    startX = e.clientX
    startY = e.clientY

    const pos = getPosition()
    initLeft = pos.left
    initTop = pos.top

    // 确保元素使用 fixed 定位，left/top 才能正确生效
    el.style.position = 'fixed'
    // 拖拽期间禁止文本选中，避免拖拽时出现选中效果
    el.style.userSelect = 'none'
    el.style.cursor = 'grabbing'

    // 绑定到 document 上，这样鼠标移出元素区域也能继续拖拽
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    onDragStart?.(initLeft, initTop)
  }

  /** mousemove: 计算偏移量，更新元素位置 */
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return

    // 当前鼠标位置与起始位置的差值 = 元素需要移动的距离
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    // 初始位置 + 偏移量 = 新位置，再通过 clamp 限制边界
    const { left, top } = clamp(initLeft + dx, initTop + dy)
    el.style.left = `${left}px`
    el.style.top = `${top}px`

    onDragMove?.(left, top)
  }

  /** mouseup: 结束拖拽，清理 document 上的事件监听 */
  const onMouseUp = () => {
    if (!dragging) return

    dragging = false
    el.style.userSelect = ''
    el.style.cursor = 'grab'

    // 及时移除 document 上的监听，避免内存泄漏
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)

    const pos = getPosition()
    onDragEnd?.(pos.left, pos.top)
  }

  // ---- 初始化 ----
  // 设置手柄的鼠标样式，提示用户可拖拽
  handle.style.cursor = 'grab'
  handle.addEventListener('mousedown', onMouseDown)

  /**
   * 销毁拖拽实例，移除所有事件监听
   * 应在元素被移除或不再需要拖拽时调用
   */
  const destroy = () => {
    handle.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  return { destroy }
}
