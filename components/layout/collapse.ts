/**
 * 可折叠面板（手风琴）组件
 *
 * 提供可展开/折叠的面板列表，支持手风琴模式（同一时间只展开一个面板），
 * 并带有平滑的高度过渡动画。
 */

/** 单个折叠面板项的配置 */
interface CollapseItem {
  /** 面板的唯一标识 */
  key: string;
  /** 面板标题 */
  title: string;
  /** 面板内容，可以是 HTML 元素或字符串 */
  content: HTMLElement | string;
  /** 是否默认展开 */
  defaultOpen?: boolean;
}

/** createCollapse 的配置选项 */
interface CollapseOptions {
  /** 容器元素 */
  container: HTMLElement;
  /** 面板列表 */
  items: CollapseItem[];
  /** 是否启用手风琴模式（同一时间只展开一个面板），默认为 false */
  accordion?: boolean;
  /** 展开/折叠状态变化时的回调函数 */
  onChange?: (activeKeys: string[]) => void;
}

/** createCollapse 返回的控制器接口 */
interface CollapseController {
  /** 展开指定面板 */
  open: (key: string) => void;
  /** 折叠指定面板 */
  close: (key: string) => void;
  /** 切换指定面板的展开/折叠状态 */
  toggle: (key: string) => void;
  /** 销毁组件，移除所有 DOM 元素和事件监听器 */
  destroy: () => void;
}

/** 过渡动画时长（毫秒） */
const TRANSITION_DURATION = 250;

/**
 * 创建可折叠面板组件
 *
 * @param options - 配置选项
 * @returns 包含 open、close、toggle 和 destroy 方法的控制器对象
 *
 * @example
 * ```ts
 * const collapse = createCollapse({
 *   container: document.getElementById('collapse-root')!,
 *   items: [
 *     { key: 'faq1', title: '常见问题 1', content: '<p>答案内容</p>', defaultOpen: true },
 *     { key: 'faq2', title: '常见问题 2', content: '<p>答案内容</p>' },
 *   ],
 *   accordion: true,
 *   onChange: (keys) => console.log('已展开的面板:', keys),
 * });
 *
 * collapse.open('faq2');
 * collapse.close('faq1');
 * collapse.toggle('faq2');
 * collapse.destroy();
 * ```
 */
function createCollapse(options: CollapseOptions): CollapseController {
  const { container, items, accordion = false, onChange } = options;

  /** 当前展开的面板 key 集合 */
  const activeKeys = new Set<string>();

  /** 面板内容包裹元素映射 */
  const contentWrapperMap = new Map<string, HTMLElement>();
  /** 面板内容内层元素映射 */
  const contentInnerMap = new Map<string, HTMLElement>();
  /** 面板头部元素映射 */
  const headerMap = new Map<string, HTMLElement>();
  /** 箭头指示器映射 */
  const arrowMap = new Map<string, HTMLElement>();
  /** 面板条目元素列表 */
  const panelElements: HTMLElement[] = [];
  /** 事件清理函数列表 */
  const cleanupFns: (() => void)[] = [];

  // 创建包裹容器
  const wrapper = document.createElement('div');
  wrapper.style.border = '1px solid #e0e0e0';
  wrapper.style.borderRadius = '4px';
  wrapper.style.overflow = 'hidden';

  /**
   * 通知外部展开状态变化
   */
  function notifyChange(): void {
    onChange?.([...activeKeys]);
  }

  /**
   * 展开指定面板（带动画）
   *
   * @param key - 面板唯一标识
   */
  function openPanel(key: string): void {
    if (activeKeys.has(key)) return;

    // 手风琴模式下先关闭其他面板
    if (accordion) {
      for (const openKey of activeKeys) {
        closePanelInternal(openKey);
      }
    }

    activeKeys.add(key);

    const contentWrapper = contentWrapperMap.get(key);
    const contentInner = contentInnerMap.get(key);
    const arrow = arrowMap.get(key);
    if (!contentWrapper || !contentInner) return;

    // 获取内容实际高度
    const height = contentInner.scrollHeight;

    // 设置过渡属性并展开
    contentWrapper.style.transition = `height ${TRANSITION_DURATION}ms ease`;
    contentWrapper.style.height = `${height}px`;

    if (arrow) {
      arrow.style.transform = 'rotate(90deg)';
    }

    // 过渡结束后移除固定高度，允许内容自适应
    const onTransitionEnd = (): void => {
      contentWrapper.removeEventListener('transitionend', onTransitionEnd);
      if (activeKeys.has(key)) {
        contentWrapper.style.height = 'auto';
      }
    };
    contentWrapper.addEventListener('transitionend', onTransitionEnd);

    notifyChange();
  }

  /**
   * 折叠指定面板的内部实现（不触发回调）
   *
   * @param key - 面板唯一标识
   */
  function closePanelInternal(key: string): void {
    if (!activeKeys.has(key)) return;

    activeKeys.delete(key);

    const contentWrapper = contentWrapperMap.get(key);
    const contentInner = contentInnerMap.get(key);
    const arrow = arrowMap.get(key);
    if (!contentWrapper || !contentInner) return;

    // 先设置当前实际高度（从 auto 切换到具体值），以便触发过渡
    const currentHeight = contentInner.scrollHeight;
    contentWrapper.style.height = `${currentHeight}px`;
    contentWrapper.style.transition = 'none';

    // 强制回流以确保浏览器应用了上面的固定高度
    void contentWrapper.offsetHeight;

    // 开始过渡到 0 高度
    contentWrapper.style.transition = `height ${TRANSITION_DURATION}ms ease`;
    contentWrapper.style.height = '0px';

    if (arrow) {
      arrow.style.transform = 'rotate(0deg)';
    }
  }

  /**
   * 折叠指定面板
   *
   * @param key - 面板唯一标识
   */
  function closePanel(key: string): void {
    closePanelInternal(key);
    notifyChange();
  }

  /**
   * 切换指定面板的展开/折叠状态
   *
   * @param key - 面板唯一标识
   */
  function togglePanel(key: string): void {
    if (activeKeys.has(key)) {
      closePanel(key);
    } else {
      openPanel(key);
    }
  }

  // 构建所有面板
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const panel = document.createElement('div');
    if (i > 0) {
      panel.style.borderTop = '1px solid #e0e0e0';
    }
    panelElements.push(panel);

    // 面板头部
    const header = document.createElement('div');
    header.style.padding = '12px 16px';
    header.style.cursor = 'pointer';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.userSelect = 'none';
    header.style.background = '#fafafa';
    header.style.transition = 'background 0.15s ease';
    header.style.fontSize = '14px';
    header.style.fontWeight = '500';
    header.style.color = '#333';
    headerMap.set(item.key, header);

    header.addEventListener('mouseenter', () => {
      header.style.background = '#f0f0f0';
    });
    header.addEventListener('mouseleave', () => {
      header.style.background = '#fafafa';
    });

    // 箭头指示器
    const arrow = document.createElement('span');
    arrow.textContent = '\u25b6';
    arrow.style.fontSize = '10px';
    arrow.style.transition = `transform ${TRANSITION_DURATION}ms ease`;
    arrow.style.display = 'inline-block';
    arrow.style.color = '#999';
    arrowMap.set(item.key, arrow);

    const titleSpan = document.createElement('span');
    titleSpan.textContent = item.title;

    header.appendChild(arrow);
    header.appendChild(titleSpan);

    // 内容包裹层（用于高度过渡动画）
    const contentWrapper = document.createElement('div');
    contentWrapper.style.height = '0px';
    contentWrapper.style.overflow = 'hidden';
    contentWrapperMap.set(item.key, contentWrapper);

    // 内容内层
    const contentInner = document.createElement('div');
    contentInner.style.padding = '12px 16px';
    contentInner.style.color = '#666';
    contentInner.style.fontSize = '14px';
    contentInner.style.lineHeight = '1.6';
    contentInnerMap.set(item.key, contentInner);

    if (typeof item.content === 'string') {
      contentInner.innerHTML = item.content;
    } else {
      contentInner.appendChild(item.content);
    }

    contentWrapper.appendChild(contentInner);

    panel.appendChild(header);
    panel.appendChild(contentWrapper);
    wrapper.appendChild(panel);

    // 点击头部切换展开/折叠
    const onClick = (): void => {
      togglePanel(item.key);
    };
    header.addEventListener('click', onClick);
    cleanupFns.push(() => {
      header.removeEventListener('click', onClick);
    });

    // 处理默认展开
    if (item.defaultOpen) {
      activeKeys.add(item.key);
      contentWrapper.style.height = 'auto';
      arrow.style.transform = 'rotate(90deg)';
    }
  }

  container.appendChild(wrapper);

  return {
    open: openPanel,
    close: closePanel,
    toggle: togglePanel,

    destroy(): void {
      for (const fn of cleanupFns) {
        fn();
      }
      cleanupFns.length = 0;
      contentWrapperMap.clear();
      contentInnerMap.clear();
      headerMap.clear();
      arrowMap.clear();
      panelElements.length = 0;
      activeKeys.clear();
      wrapper.remove();
    },
  };
}

export { createCollapse };
export type { CollapseItem, CollapseOptions, CollapseController };
