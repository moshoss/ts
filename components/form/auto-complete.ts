/**
 * 自动补全模块
 * 为输入框提供下拉建议列表，支持键盘导航、防抖请求和匹配文本高亮。
 */

/** 自动补全配置选项 */
interface AutoCompleteOptions {
  /** 绑定的输入框元素 */
  input: HTMLInputElement;
  /** 根据查询字符串获取建议列表的异步函数 */
  fetch: (query: string) => Promise<string[]>;
  /** 触发搜索的最小输入长度，默认为 1 */
  minLength?: number;
  /** 防抖延迟时间（毫秒），默认为 300 */
  debounce?: number;
  /** 选中某项时的回调函数 */
  onSelect?: (value: string) => void;
}

/** 自动补全返回接口 */
interface AutoCompleteInstance {
  /** 销毁自动补全实例，清除 DOM 和事件 */
  destroy: () => void;
}

/**
 * 创建自动补全组件
 * @param options - 自动补全配置选项
 * @returns 自动补全实例，包含 destroy 方法
 */
function createAutoComplete(options: AutoCompleteOptions): AutoCompleteInstance {
  const input: HTMLInputElement = options.input;
  const fetchFn: (query: string) => Promise<string[]> = options.fetch;
  const minLength: number = options.minLength ?? 1;
  const debounceMs: number = options.debounce ?? 300;
  const onSelect: ((value: string) => void) | undefined = options.onSelect;

  let debounceTimer: number | null = null;
  let activeIndex: number = -1;
  let items: string[] = [];
  let isDestroyed: boolean = false;

  /** 创建下拉容器 */
  const dropdown: HTMLDivElement = document.createElement('div');
  dropdown.style.cssText = [
    'position: fixed',
    'z-index: 99999',
    'background: #fff',
    'border: 1px solid #d9d9d9',
    'border-radius: 4px',
    'box-shadow: 0 2px 8px rgba(0,0,0,0.15)',
    'max-height: 200px',
    'overflow-y: auto',
    'display: none',
  ].join(';');
  document.body.appendChild(dropdown);

  /**
   * 定位下拉框到输入框下方
   */
  const positionDropdown = (): void => {
    const rect: DOMRect = input.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 2}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
  };

  /**
   * 对文本中匹配的部分进行高亮处理
   * @param text - 原始文本
   * @param query - 查询字符串
   * @returns 包含高亮标签的 HTML 字符串
   */
  const highlightMatch = (text: string, query: string): string => {
    if (!query) {
      return text;
    }
    const escaped: string = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex: RegExp = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<strong style="color:#1890ff">$1</strong>');
  };

  /**
   * 渲染下拉列表
   * @param suggestions - 建议列表
   * @param query - 当前查询字符串
   */
  const renderDropdown = (suggestions: string[], query: string): void => {
    items = suggestions;
    activeIndex = -1;
    dropdown.innerHTML = '';

    if (suggestions.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    for (let i: number = 0; i < suggestions.length; i++) {
      const item: HTMLDivElement = document.createElement('div');
      item.innerHTML = highlightMatch(suggestions[i], query);
      item.style.cssText = [
        'padding: 8px 12px',
        'cursor: pointer',
        'font-size: 14px',
        'line-height: 1.5',
        'white-space: nowrap',
        'overflow: hidden',
        'text-overflow: ellipsis',
      ].join(';');

      item.addEventListener('mouseenter', (): void => {
        updateActiveItem(i);
      });

      item.addEventListener('mousedown', (e: MouseEvent): void => {
        e.preventDefault();
        selectItem(i);
      });

      dropdown.appendChild(item);
    }

    positionDropdown();
    dropdown.style.display = 'block';
  };

  /**
   * 更新当前激活项的高亮样式
   * @param index - 新的激活项索引
   */
  const updateActiveItem = (index: number): void => {
    const children: HTMLCollection = dropdown.children;
    for (let i: number = 0; i < children.length; i++) {
      const child: HTMLElement = children[i] as HTMLElement;
      child.style.backgroundColor = i === index ? '#f5f5f5' : '#fff';
    }
    activeIndex = index;
  };

  /**
   * 选中指定索引的项
   * @param index - 选中项索引
   */
  const selectItem = (index: number): void => {
    if (index < 0 || index >= items.length) {
      return;
    }
    const value: string = items[index];
    input.value = value;
    dropdown.style.display = 'none';
    if (onSelect) {
      onSelect(value);
    }
  };

  /**
   * 处理输入事件，带防抖
   */
  const handleInput = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    const query: string = input.value.trim();

    if (query.length < minLength) {
      dropdown.style.display = 'none';
      items = [];
      return;
    }

    debounceTimer = window.setTimeout(async (): Promise<void> => {
      if (isDestroyed) {
        return;
      }
      try {
        const suggestions: string[] = await fetchFn(query);
        if (!isDestroyed && input.value.trim() === query) {
          renderDropdown(suggestions, query);
        }
      } catch {
        // 请求失败时静默处理
      }
    }, debounceMs);
  };

  /**
   * 处理键盘导航事件
   * @param e - 键盘事件
   */
  const handleKeydown = (e: KeyboardEvent): void => {
    if (dropdown.style.display === 'none' || items.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        updateActiveItem(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        updateActiveItem(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) {
          selectItem(activeIndex);
        }
        break;
      case 'Escape':
        e.preventDefault();
        dropdown.style.display = 'none';
        break;
    }
  };

  /**
   * 处理输入框失焦，关闭下拉
   */
  const handleBlur = (): void => {
    // 延迟关闭以允许 mousedown 事件触发
    window.setTimeout((): void => {
      if (!isDestroyed) {
        dropdown.style.display = 'none';
      }
    }, 150);
  };

  input.addEventListener('input', handleInput);
  input.addEventListener('keydown', handleKeydown);
  input.addEventListener('blur', handleBlur);

  /**
   * 销毁自动补全实例，移除 DOM 元素和事件监听
   */
  const destroy = (): void => {
    isDestroyed = true;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    input.removeEventListener('input', handleInput);
    input.removeEventListener('keydown', handleKeydown);
    input.removeEventListener('blur', handleBlur);
    if (dropdown.parentNode) {
      dropdown.parentNode.removeChild(dropdown);
    }
  };

  return { destroy };
}

export { createAutoComplete };
export type { AutoCompleteOptions, AutoCompleteInstance };
