/**
 * @module carousel
 * @description 轮播组件，支持自动播放、循环、触摸滑动、箭头和指示点。
 */

/** 轮播配置 */
export interface CarouselOptions {
  /** 容器元素 */
  container: HTMLElement
  /** 轮播项，字符串视为图片 URL */
  items: HTMLElement[] | string[]
  /** 是否自动播放，默认 false */
  autoplay?: boolean
  /** 自动播放间隔（ms），默认 3000 */
  interval?: number
  /** 是否循环，默认 true */
  loop?: boolean
  /** 切换回调 */
  onChange?: (index: number) => void
}

/**
 * 创建轮播组件
 *
 * @example
 * ```ts
 * const carousel = createCarousel({
 *   container: el,
 *   items: ['/img/1.jpg', '/img/2.jpg', '/img/3.jpg'],
 *   autoplay: true,
 * })
 * ```
 */
export const createCarousel = (options: CarouselOptions) => {
  const { container, autoplay = false, interval = 3000, loop = true, onChange } = options

  let currentIndex = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let startX = 0
  let deltaX = 0
  let dragging = false

  const total = options.items.length
  if (total === 0) return { prev() {}, next() {}, goTo() {}, destroy() {} }

  // 容器样式
  Object.assign(container.style, {
    position: 'relative',
    overflow: 'hidden',
    touchAction: 'pan-y',
  })

  // 轨道
  const track = document.createElement('div')
  Object.assign(track.style, {
    display: 'flex',
    transition: 'transform 0.3s ease',
    width: `${total * 100}%`,
  })

  // 渲染每项
  for (const item of options.items) {
    const slide = document.createElement('div')
    Object.assign(slide.style, {
      flex: `0 0 ${100 / total}%`,
      width: `${100 / total}%`,
      overflow: 'hidden',
    })

    if (typeof item === 'string') {
      const img = document.createElement('img')
      img.src = item
      Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' })
      img.draggable = false
      slide.appendChild(img)
    } else {
      slide.appendChild(item)
    }

    track.appendChild(slide)
  }

  container.appendChild(track)

  // 箭头
  const createArrow = (text: string, side: 'left' | 'right') => {
    const btn = document.createElement('button')
    btn.textContent = text
    Object.assign(btn.style, {
      position: 'absolute',
      top: '50%',
      [side]: '8px',
      transform: 'translateY(-50%)',
      zIndex: '2',
      background: 'rgba(0,0,0,0.4)',
      color: '#fff',
      border: 'none',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      fontSize: '16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    })
    container.appendChild(btn)
    return btn
  }

  const prevBtn = createArrow('‹', 'left')
  const nextBtn = createArrow('›', 'right')

  // 指示点
  const dots = document.createElement('div')
  Object.assign(dots.style, {
    position: 'absolute',
    bottom: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '6px',
    zIndex: '2',
  })

  const dotEls: HTMLElement[] = []
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('span')
    Object.assign(dot.style, {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.5)',
      cursor: 'pointer',
      transition: 'background 0.2s',
    })
    dot.addEventListener('click', () => goTo(i))
    dots.appendChild(dot)
    dotEls.push(dot)
  }

  container.appendChild(dots)

  const updatePosition = (animate = true) => {
    track.style.transition = animate ? 'transform 0.3s ease' : 'none'
    track.style.transform = `translateX(-${currentIndex * (100 / total)}%)`

    for (let i = 0; i < dotEls.length; i++) {
      dotEls[i].style.background = i === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)'
    }
  }

  const goTo = (index: number) => {
    if (loop) {
      currentIndex = ((index % total) + total) % total
    } else {
      currentIndex = Math.max(0, Math.min(index, total - 1))
    }
    updatePosition()
    onChange?.(currentIndex)
    resetAutoplay()
  }

  const prev = () => goTo(currentIndex - 1)
  const next = () => goTo(currentIndex + 1)

  prevBtn.addEventListener('click', prev)
  nextBtn.addEventListener('click', next)

  // 自动播放
  const startAutoplay = () => {
    if (!autoplay || timer) return
    timer = setInterval(next, interval)
  }

  const stopAutoplay = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const resetAutoplay = () => {
    stopAutoplay()
    startAutoplay()
  }

  // 触摸/鼠标拖拽
  const onPointerDown = (e: PointerEvent) => {
    dragging = true
    startX = e.clientX
    deltaX = 0
    track.style.transition = 'none'
    container.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return
    deltaX = e.clientX - startX
    const containerWidth = container.clientWidth
    const offset = -(currentIndex * containerWidth) + deltaX
    track.style.transform = `translateX(${offset}px)`
  }

  const onPointerUp = () => {
    if (!dragging) return
    dragging = false
    const threshold = container.clientWidth * 0.2
    if (deltaX < -threshold) {
      next()
    } else if (deltaX > threshold) {
      prev()
    } else {
      updatePosition()
    }
  }

  container.addEventListener('pointerdown', onPointerDown)
  container.addEventListener('pointermove', onPointerMove)
  container.addEventListener('pointerup', onPointerUp)

  // 悬停暂停
  container.addEventListener('mouseenter', stopAutoplay)
  container.addEventListener('mouseleave', startAutoplay)

  updatePosition(false)
  startAutoplay()

  const destroy = () => {
    stopAutoplay()
    container.removeEventListener('pointerdown', onPointerDown)
    container.removeEventListener('pointermove', onPointerMove)
    container.removeEventListener('pointerup', onPointerUp)
    container.removeEventListener('mouseenter', stopAutoplay)
    container.removeEventListener('mouseleave', startAutoplay)
    track.remove()
    prevBtn.remove()
    nextBtn.remove()
    dots.remove()
  }

  return { prev, next, goTo, destroy }
}
