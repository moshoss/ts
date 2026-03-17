/**
 * 分割面板布局组件
 *
 * 在容器的两个子元素之间添加可拖拽的分隔条，
 * 支持水平和垂直方向的分割布局。
 */

/** 分割方向 */
type SplitDirection = 'horizontal' | 'vertical';

/** createSplitPane 的配置选项 */
interface SplitPaneOptions {
  /** 容器元素，必须恰好包含 2 个子元素 */
  container: HTMLElement;
  /** 分割方向，默认为 'horizontal'（左右分割） */
  direction?: SplitDirection;
  /** 初始分割比例（百分比），默认为 50 */
  initialSplit?: number;
  /** 面板最小尺寸（像素），默认为 100 */
  minSize?: number;
  /** 面板最大尺寸（像素） */
  maxSize?: number;
  /** 调整大小时的回调函数，参数为两个面板的尺寸（像素） */
  onResize?: (sizes: [number, number]) => void;
}

/** createSplitPane 返回的控制器接口 */
interface SplitPaneController {
  /** 设置分割比例（百分比，0-100） */
  setSplit: (percentage: number) => void;
  /** 销毁组件，移除所有 DOM 元素和事件监听器，恢复原始样式 */
  destroy: () => void;
}

/** 分隔条宽度常量（像素） */
const DIVIDER_SIZE = 6;

/**
 * 创建分割面板布局
 *
 * @param options - 配置选项
 * @returns 包含 setSplit 和 destroy 方法的控制器对象
 * @throws 当容器子元素数量不为 2 时抛出错误
 *
 * @example
 * ```ts
 * const split = createSplitPane({
 *   container: document.getElementById('wrapper')!,
 *   direction: 'horizontal',
 *   initialSplit: 30,
 *   minSize: 150,
 *   onResize: ([left, right]) => console.log(`左: ${left}px, 右: ${right}px`),
 * });
 *
 * // 修改分割比例
 * split.setSplit(60);
 *
 * // 销毁
 * split.destroy();
 * ```
 */
function createSplitPane(options: SplitPaneOptions): SplitPaneController {
  const {
    container,
    direction = 'horizontal',
    initialSplit = 50,
    minSize = 100,
    maxSize,
    onResize,
  } = options;

  const children = Array.from(container.children) as HTMLElement[];
  if (children.length !== 2) {
    throw new Error(
      `createSplitPane: 容器必须恰好包含 2 个子元素，当前有 ${children.length} 个`
    );
  }

  const isHorizontal = direction === 'horizontal';
  const pane1 = children[0];
  const pane2 = children[1];

  // 保存原始样式以便 destroy 时恢复
  const originalContainerStyle = container.style.cssText;
  const originalPane1Style = pane1.style.cssText;
  const originalPane2Style = pane2.style.cssText;

  // 创建分隔条
  const divider = document.createElement('div');

  // 设置容器样式
  container.style.display = 'flex';
  container.style.flexDirection = isHorizontal ? 'row' : 'column';
  container.style.overflow = 'hidden';

  // 设置面板通用样式
  pane1.style.overflow = 'auto';
  pane1.style.flexShrink = '0';
  pane2.style.overflow = 'auto';
  pane2.style.flex = '1';
  pane2.style.minWidth = '0';
  pane2.style.minHeight = '0';

  // 设置分隔条样式
  divider.style.flexShrink = '0';
  divider.style.background = '#e0e0e0';
  divider.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
  divider.style.transition = 'background 0.15s ease';
  if (isHorizontal) {
    divider.style.width = `${DIVIDER_SIZE}px`;
  } else {
    divider.style.height = `${DIVIDER_SIZE}px`;
  }

  // 分隔条悬浮高亮
  divider.addEventListener('mouseenter', () => {
    divider.style.background = '#b0b0b0';
  });
  divider.addEventListener('mouseleave', () => {
    divider.style.background = '#e0e0e0';
  });

  // 插入分隔条到两个面板之间
  container.insertBefore(divider, pane2);

  /**
   * 将数值限制在指定范围内
   *
   * @param value - 输入值
   * @param min - 最小值
   * @param max - 最大值
   * @returns 限制后的值
   */
  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 获取容器在分割方向上的可用尺寸
   *
   * @returns 可用尺寸（像素）
   */
  function getAvailableSize(): number {
    const rect = container.getBoundingClientRect();
    return (isHorizontal ? rect.width : rect.height) - DIVIDER_SIZE;
  }

  /**
   * 计算最大允许的面板 1 尺寸
   *
   * @param available - 可用总尺寸
   * @returns 最大允许尺寸（像素）
   */
  function getMaxPane1(available: number): number {
    let max = available - minSize;
    if (maxSize !== undefined) {
      max = Math.min(max, maxSize);
    }
    return max;
  }

  /**
   * 根据百分比应用分割比例
   *
   * @param percentage - 分割百分比（0-100）
   */
  function applySplit(percentage: number): void {
    const available = getAvailableSize();
    const pane1Size = clamp(
      (percentage / 100) * available,
      minSize,
      getMaxPane1(available)
    );

    if (isHorizontal) {
      pane1.style.width = `${pane1Size}px`;
      pane1.style.height = '';
    } else {
      pane1.style.height = `${pane1Size}px`;
      pane1.style.width = '';
    }

    const pane2Size = available - pane1Size;
    onResize?.([pane1Size, pane2Size]);
  }

  // 应用初始分割
  applySplit(initialSplit);

  /**
   * 处理鼠标按下事件，启动拖拽调整分割比例
   *
   * @param downEvent - 鼠标按下事件
   */
  const onMouseDown = (downEvent: MouseEvent): void => {
    downEvent.preventDefault();

    const startPos = isHorizontal ? downEvent.clientX : downEvent.clientY;
    const startSize = isHorizontal
      ? pane1.getBoundingClientRect().width
      : pane1.getBoundingClientRect().height;

    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    divider.style.background = '#999';

    const onMouseMove = (moveEvent: MouseEvent): void => {
      const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - startPos;
      const available = getAvailableSize();
      const newSize = clamp(startSize + delta, minSize, getMaxPane1(available));

      if (isHorizontal) {
        pane1.style.width = `${newSize}px`;
      } else {
        pane1.style.height = `${newSize}px`;
      }

      const pane2Size = available - newSize;
      onResize?.([newSize, pane2Size]);
    };

    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
      divider.style.background = '#e0e0e0';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  divider.addEventListener('mousedown', onMouseDown);

  return {
    setSplit(percentage: number): void {
      applySplit(clamp(percentage, 0, 100));
    },

    destroy(): void {
      divider.removeEventListener('mousedown', onMouseDown);
      divider.remove();

      container.style.cssText = originalContainerStyle;
      pane1.style.cssText = originalPane1Style;
      pane2.style.cssText = originalPane2Style;
    },
  };
}

export { createSplitPane };
export type { SplitPaneOptions, SplitPaneController, SplitDirection };
