/**
 * 可调整大小的元素组件
 *
 * 为指定的 HTML 元素添加拖拽调整大小的功能，
 * 支持边缘和角落的拖拽手柄，并提供最小/最大尺寸约束。
 */

/** 可用的拖拽手柄方向 */
type ResizeHandle =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/** createResizable 的配置选项 */
interface ResizableOptions {
  /** 需要添加调整大小功能的目标元素 */
  el: HTMLElement;
  /** 启用的拖拽手柄方向，默认为 ['right', 'bottom', 'bottom-right'] */
  handles?: ResizeHandle[];
  /** 最小宽度（像素），默认为 50 */
  minWidth?: number;
  /** 最小高度（像素），默认为 50 */
  minHeight?: number;
  /** 最大宽度（像素） */
  maxWidth?: number;
  /** 最大高度（像素） */
  maxHeight?: number;
  /** 调整大小过程中的回调函数 */
  onResize?: (width: number, height: number) => void;
  /** 调整大小结束时的回调函数 */
  onResizeEnd?: (width: number, height: number) => void;
}

/** createResizable 返回的控制器接口 */
interface ResizableController {
  /** 销毁组件，移除所有 DOM 元素和事件监听器 */
  destroy: () => void;
}

/** 手柄对应的光标样式映射 */
const CURSOR_MAP: Record<ResizeHandle, string> = {
  top: 'ns-resize',
  bottom: 'ns-resize',
  left: 'ew-resize',
  right: 'ew-resize',
  'top-left': 'nwse-resize',
  'bottom-right': 'nwse-resize',
  'top-right': 'nesw-resize',
  'bottom-left': 'nesw-resize',
};

/** 手柄的尺寸常量（像素） */
const HANDLE_SIZE = 8;

/**
 * 创建可调整大小的元素
 *
 * @param options - 配置选项
 * @returns 包含 destroy 方法的控制器对象
 *
 * @example
 * ```ts
 * const resizable = createResizable({
 *   el: document.getElementById('box')!,
 *   handles: ['right', 'bottom', 'bottom-right'],
 *   minWidth: 100,
 *   minHeight: 100,
 *   onResize: (w, h) => console.log(`尺寸: ${w}x${h}`),
 * });
 *
 * // 销毁
 * resizable.destroy();
 * ```
 */
function createResizable(options: ResizableOptions): ResizableController {
  const {
    el,
    handles = ['right', 'bottom', 'bottom-right'],
    minWidth = 50,
    minHeight = 50,
    maxWidth,
    maxHeight,
    onResize,
    onResizeEnd,
  } = options;

  const handleElements: HTMLElement[] = [];
  const cleanupFns: (() => void)[] = [];

  // 确保目标元素有定位上下文
  const computedPosition = getComputedStyle(el).position;
  if (computedPosition === 'static') {
    el.style.position = 'relative';
  }

  /**
   * 根据手柄方向计算定位样式
   *
   * @param handle - 手柄方向
   * @returns CSS 样式属性对象
   */
  function getHandleStyles(handle: ResizeHandle): Partial<CSSStyleDeclaration> {
    const base: Partial<CSSStyleDeclaration> = {
      position: 'absolute',
      zIndex: '10',
      cursor: CURSOR_MAP[handle],
    };

    const half = `${-HANDLE_SIZE / 2}px`;
    const full = `${HANDLE_SIZE}px`;

    switch (handle) {
      case 'top':
        return { ...base, top: half, left: '0', right: '0', height: full };
      case 'bottom':
        return { ...base, bottom: half, left: '0', right: '0', height: full };
      case 'left':
        return { ...base, left: half, top: '0', bottom: '0', width: full };
      case 'right':
        return { ...base, right: half, top: '0', bottom: '0', width: full };
      case 'top-left':
        return { ...base, top: half, left: half, width: full, height: full };
      case 'top-right':
        return { ...base, top: half, right: half, width: full, height: full };
      case 'bottom-left':
        return { ...base, bottom: half, left: half, width: full, height: full };
      case 'bottom-right':
        return { ...base, bottom: half, right: half, width: full, height: full };
    }
  }

  /**
   * 将数值限制在指定范围内
   *
   * @param value - 输入值
   * @param min - 最小值
   * @param max - 最大值（可选）
   * @returns 限制后的值
   */
  function clamp(value: number, min: number, max?: number): number {
    if (value < min) return min;
    if (max !== undefined && value > max) return max;
    return value;
  }

  for (const handle of handles) {
    const handleEl = document.createElement('div');
    handleEl.dataset.resizeHandle = handle;

    const styles = getHandleStyles(handle);
    for (const [key, value] of Object.entries(styles)) {
      (handleEl.style as unknown as Record<string, unknown>)[key] = value;
    }

    el.appendChild(handleEl);
    handleElements.push(handleEl);

    /**
     * 处理鼠标按下事件，启动拖拽调整大小
     *
     * @param downEvent - 鼠标按下事件
     */
    const onMouseDown = (downEvent: MouseEvent): void => {
      downEvent.preventDefault();
      downEvent.stopPropagation();

      const startX = downEvent.clientX;
      const startY = downEvent.clientY;
      const startRect = el.getBoundingClientRect();
      const startWidth = startRect.width;
      const startHeight = startRect.height;
      const startLeft = el.offsetLeft;
      const startTop = el.offsetTop;

      const resizesRight = handle.includes('right');
      const resizesLeft = handle.includes('left');
      const resizesBottom = handle.includes('bottom');
      const resizesTop = handle.includes('top');

      const originalCursor = document.body.style.cursor;
      document.body.style.cursor = CURSOR_MAP[handle];
      const originalUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent: MouseEvent): void => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;

        if (resizesRight) {
          newWidth = clamp(startWidth + deltaX, minWidth, maxWidth);
        } else if (resizesLeft) {
          newWidth = clamp(startWidth - deltaX, minWidth, maxWidth);
          const actualDelta = startWidth - newWidth;
          el.style.left = `${startLeft + actualDelta}px`;
        }

        if (resizesBottom) {
          newHeight = clamp(startHeight + deltaY, minHeight, maxHeight);
        } else if (resizesTop) {
          newHeight = clamp(startHeight - deltaY, minHeight, maxHeight);
          const actualDelta = startHeight - newHeight;
          el.style.top = `${startTop + actualDelta}px`;
        }

        el.style.width = `${newWidth}px`;
        el.style.height = `${newHeight}px`;

        onResize?.(newWidth, newHeight);
      };

      const onMouseUp = (): void => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = originalCursor;
        document.body.style.userSelect = originalUserSelect;

        const finalRect = el.getBoundingClientRect();
        onResizeEnd?.(finalRect.width, finalRect.height);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    handleEl.addEventListener('mousedown', onMouseDown);
    cleanupFns.push(() => {
      handleEl.removeEventListener('mousedown', onMouseDown);
    });
  }

  return {
    destroy(): void {
      for (const fn of cleanupFns) {
        fn();
      }
      for (const handleEl of handleElements) {
        handleEl.remove();
      }
      handleElements.length = 0;
      cleanupFns.length = 0;
    },
  };
}

export { createResizable };
export type { ResizableOptions, ResizableController, ResizeHandle };
