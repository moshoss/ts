/**
 * 标签页组件
 *
 * 提供标签页头部导航栏和内容面板的切换功能，
 * 支持动态添加/删除标签页以及禁用状态。
 */

/** 单个标签页项的配置 */
interface TabItem {
  /** 标签页的唯一标识 */
  key: string;
  /** 标签页显示文本 */
  label: string;
  /** 标签页内容，可以是 HTML 元素或字符串 */
  content: HTMLElement | string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
}

/** createTabs 的配置选项 */
interface TabsOptions {
  /** 容器元素 */
  container: HTMLElement;
  /** 标签页列表 */
  tabs: TabItem[];
  /** 默认激活的标签页 key */
  activeKey?: string;
  /** 切换标签页时的回调函数 */
  onChange?: (key: string) => void;
  /** 关闭标签页时的回调函数 */
  onClose?: (key: string) => void;
}

/** createTabs 返回的控制器接口 */
interface TabsController {
  /** 设置激活的标签页 */
  setActive: (key: string) => void;
  /** 添加新标签页 */
  addTab: (item: TabItem) => void;
  /** 移除指定标签页 */
  removeTab: (key: string) => void;
  /** 销毁组件，移除所有 DOM 元素和事件监听器 */
  destroy: () => void;
}

/**
 * 创建标签页组件
 *
 * @param options - 配置选项
 * @returns 包含 setActive、addTab、removeTab 和 destroy 方法的控制器对象
 *
 * @example
 * ```ts
 * const tabs = createTabs({
 *   container: document.getElementById('tabs-root')!,
 *   tabs: [
 *     { key: 'home', label: '首页', content: '<p>首页内容</p>' },
 *     { key: 'about', label: '关于', content: '<p>关于内容</p>', closable: true },
 *   ],
 *   activeKey: 'home',
 *   onChange: (key) => console.log(`切换到: ${key}`),
 * });
 *
 * tabs.addTab({ key: 'new', label: '新标签', content: '新内容', closable: true });
 * tabs.setActive('new');
 * tabs.removeTab('about');
 * tabs.destroy();
 * ```
 */
function createTabs(options: TabsOptions): TabsController {
  const { container, tabs: initialTabs, activeKey, onChange, onClose } = options;

  /** 内部标签页数据存储 */
  let tabItems: TabItem[] = [...initialTabs];
  /** 当前激活的标签页 key */
  let currentKey: string = activeKey ?? (tabItems.length > 0 ? tabItems[0].key : '');

  // 创建包裹元素
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.height = '100%';

  // 标签页头部容器
  const headerBar = document.createElement('div');
  headerBar.style.display = 'flex';
  headerBar.style.borderBottom = '2px solid #e0e0e0';
  headerBar.style.position = 'relative';
  headerBar.style.flexShrink = '0';
  headerBar.style.overflow = 'hidden';

  // 内容面板容器
  const contentArea = document.createElement('div');
  contentArea.style.flex = '1';
  contentArea.style.overflow = 'auto';
  contentArea.style.position = 'relative';

  wrapper.appendChild(headerBar);
  wrapper.appendChild(contentArea);
  container.appendChild(wrapper);

  /** 标签页按钮元素映射 */
  const tabButtonMap = new Map<string, HTMLElement>();
  /** 内容面板元素映射 */
  const contentPanelMap = new Map<string, HTMLElement>();

  /**
   * 创建单个标签页按钮
   *
   * @param item - 标签页配置
   * @returns 标签页按钮元素
   */
  function createTabButton(item: TabItem): HTMLElement {
    const btn = document.createElement('div');
    btn.style.padding = '10px 16px';
    btn.style.cursor = item.disabled ? 'not-allowed' : 'pointer';
    btn.style.whiteSpace = 'nowrap';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '6px';
    btn.style.position = 'relative';
    btn.style.transition = 'color 0.2s ease, background 0.2s ease';
    btn.style.userSelect = 'none';
    btn.style.fontSize = '14px';
    btn.style.color = item.disabled ? '#bbb' : '#666';
    btn.style.borderBottom = '2px solid transparent';
    btn.style.marginBottom = '-2px';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    btn.appendChild(labelSpan);

    if (item.closable) {
      const closeBtn = document.createElement('span');
      closeBtn.textContent = '\u00d7';
      closeBtn.style.fontSize = '16px';
      closeBtn.style.lineHeight = '1';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.color = '#999';
      closeBtn.style.borderRadius = '50%';
      closeBtn.style.width = '18px';
      closeBtn.style.height = '18px';
      closeBtn.style.display = 'flex';
      closeBtn.style.alignItems = 'center';
      closeBtn.style.justifyContent = 'center';
      closeBtn.style.transition = 'background 0.15s ease, color 0.15s ease';

      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#e0e0e0';
        closeBtn.style.color = '#333';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'transparent';
        closeBtn.style.color = '#999';
      });

      closeBtn.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        onClose?.(item.key);
        removeTab(item.key);
      });

      btn.appendChild(closeBtn);
    }

    if (!item.disabled) {
      btn.addEventListener('mouseenter', () => {
        if (currentKey !== item.key) {
          btn.style.color = '#333';
          btn.style.background = '#f5f5f5';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (currentKey !== item.key) {
          btn.style.color = '#666';
          btn.style.background = 'transparent';
        }
      });

      btn.addEventListener('click', () => {
        setActive(item.key);
      });
    }

    return btn;
  }

  /**
   * 创建内容面板
   *
   * @param item - 标签页配置
   * @returns 内容面板元素
   */
  function createContentPanel(item: TabItem): HTMLElement {
    const panel = document.createElement('div');
    panel.style.display = 'none';
    panel.style.height = '100%';

    if (typeof item.content === 'string') {
      panel.innerHTML = item.content;
    } else {
      panel.appendChild(item.content);
    }

    return panel;
  }

  /**
   * 更新所有标签页的激活状态样式
   */
  function updateActiveStyles(): void {
    for (const [key, btn] of tabButtonMap) {
      const isActive = key === currentKey;
      const item = tabItems.find((t) => t.key === key);
      btn.style.color = isActive ? '#1890ff' : item?.disabled ? '#bbb' : '#666';
      btn.style.borderBottom = isActive ? '2px solid #1890ff' : '2px solid transparent';
      btn.style.fontWeight = isActive ? '500' : 'normal';
      btn.style.background = 'transparent';
    }

    for (const [key, panel] of contentPanelMap) {
      panel.style.display = key === currentKey ? 'block' : 'none';
    }
  }

  /**
   * 设置激活的标签页
   *
   * @param key - 标签页唯一标识
   */
  function setActive(key: string): void {
    const item = tabItems.find((t) => t.key === key);
    if (!item || item.disabled) return;
    if (key === currentKey) return;

    currentKey = key;
    updateActiveStyles();
    onChange?.(key);
  }

  /**
   * 添加新标签页
   *
   * @param item - 标签页配置
   */
  function addTab(item: TabItem): void {
    tabItems.push(item);

    const btn = createTabButton(item);
    tabButtonMap.set(item.key, btn);
    headerBar.appendChild(btn);

    const panel = createContentPanel(item);
    contentPanelMap.set(item.key, panel);
    contentArea.appendChild(panel);

    updateActiveStyles();
  }

  /**
   * 移除指定标签页
   *
   * @param key - 要移除的标签页唯一标识
   */
  function removeTab(key: string): void {
    const index = tabItems.findIndex((t) => t.key === key);
    if (index === -1) return;

    tabItems.splice(index, 1);

    const btn = tabButtonMap.get(key);
    btn?.remove();
    tabButtonMap.delete(key);

    const panel = contentPanelMap.get(key);
    panel?.remove();
    contentPanelMap.delete(key);

    // 如果移除的是当前激活标签，切换到相邻标签
    if (currentKey === key && tabItems.length > 0) {
      const newIndex = Math.min(index, tabItems.length - 1);
      currentKey = tabItems[newIndex].key;
      updateActiveStyles();
      onChange?.(currentKey);
    }
  }

  // 初始化渲染所有标签
  for (const item of tabItems) {
    const btn = createTabButton(item);
    tabButtonMap.set(item.key, btn);
    headerBar.appendChild(btn);

    const panel = createContentPanel(item);
    contentPanelMap.set(item.key, panel);
    contentArea.appendChild(panel);
  }

  updateActiveStyles();

  return {
    setActive,
    addTab,
    removeTab,

    destroy(): void {
      tabButtonMap.clear();
      contentPanelMap.clear();
      tabItems = [];
      wrapper.remove();
    },
  };
}

export { createTabs };
export type { TabItem, TabsOptions, TabsController };
