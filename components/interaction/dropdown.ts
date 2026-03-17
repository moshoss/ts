/**
 * @module dropdown
 * @description 下拉菜单组件，支持点击/悬停触发、键盘导航、位置自适应等功能。
 */

/** 菜单项 */
interface MenuItem {
  /** 显示文本 */
  label: string;
  /** 唯一标识 */
  key: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否为分割线 */
  divider?: boolean;
}

/** 下拉菜单配置选项 */
interface DropdownOptions {
  /** 触发元素 */
  trigger: HTMLElement;
  /** 菜单项列表 */
  items: MenuItem[];
  /** 选中回调 */
  onSelect?: (item: MenuItem) => void;
  /** 触发方式，默认 'click' */
  triggerMode?: 'click' | 'hover';
  /** 弹出位置，默认 'bottom' */
  placement?: 'bottom' | 'top';
  /** 与触发元素的间距（像素），默认 4 */
  offset?: number;
}

/** 下拉菜单实例 */
interface DropdownInstance {
  /** 打开下拉菜单 */
  open: () => void;
  /** 关闭下拉菜单 */
  close: () => void;
  /** 销毁下拉菜单，移除所有 DOM 和事件监听 */
  destroy: () => void;
}

/**
 * 创建下拉菜单
 * @param options - 下拉菜单配置
 * @returns 下拉菜单实例，包含 open、close、destroy 方法
 */
function createDropdown(options: DropdownOptions): DropdownInstance {
  const {
    trigger,
    items,
    onSelect,
    triggerMode = 'click',
    placement = 'bottom',
    offset = 4,
  } = options;

  let isOpen = false;
  let destroyed = false;
  let menuEl: HTMLDivElement | null = null;
  /** 当前键盘聚焦项的索引（仅非 divider、非 disabled 项） */
  let focusIndex = -1;
  let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

  /** 清除 hover 关闭定时器 */
  function clearHoverTimer(): void {
    if (hoverCloseTimer !== null) {
      clearTimeout(hoverCloseTimer);
      hoverCloseTimer = null;
    }
  }

  /**
   * 获取所有可选菜单项元素
   * @returns 可选元素列表
   */
  function getSelectableItems(): HTMLDivElement[] {
    if (!menuEl) return [];
    return Array.from(
      menuEl.querySelectorAll<HTMLDivElement>('[data-dropdown-selectable="true"]')
    );
  }

  /**
   * 更新键盘聚焦高亮
   * @param newIndex - 新的聚焦索引
   */
  function updateFocus(newIndex: number): void {
    const selectables = getSelectableItems();
    // 清除旧高亮
    for (const el of selectables) {
      el.style.backgroundColor = '';
    }
    focusIndex = newIndex;
    if (focusIndex >= 0 && focusIndex < selectables.length) {
      selectables[focusIndex].style.backgroundColor = '#f5f5f5';
    }
  }

  /** 构建菜单 DOM 并定位 */
  function buildAndPositionMenu(): void {
    menuEl = document.createElement('div');
    Object.assign(menuEl.style, {
      position: 'fixed',
      zIndex: '10000',
      backgroundColor: '#fff',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      padding: '4px 0',
      minWidth: '120px',
      fontSize: '14px',
      color: '#333',
      opacity: '0',
      transition: 'opacity 0.15s ease',
    } satisfies Partial<CSSStyleDeclaration>);

    for (const item of items) {
      if (item.divider) {
        const divider = document.createElement('div');
        Object.assign(divider.style, {
          height: '1px',
          backgroundColor: '#f0f0f0',
          margin: '4px 0',
        } satisfies Partial<CSSStyleDeclaration>);
        menuEl.appendChild(divider);
        continue;
      }

      const menuItem = document.createElement('div');
      menuItem.textContent = item.label;
      Object.assign(menuItem.style, {
        padding: '5px 12px',
        cursor: item.disabled ? 'not-allowed' : 'pointer',
        color: item.disabled ? '#bbb' : '#333',
        whiteSpace: 'nowrap',
        transition: 'background-color 0.15s',
      } satisfies Partial<CSSStyleDeclaration>);

      if (!item.disabled) {
        menuItem.setAttribute('data-dropdown-selectable', 'true');

        const capturedItem = item;
        menuItem.addEventListener('mouseenter', () => {
          const idx = getSelectableItems().indexOf(menuItem);
          updateFocus(idx);
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.backgroundColor = '';
        });
        menuItem.addEventListener('click', () => {
          onSelect?.(capturedItem);
          close();
        });
      }

      menuEl.appendChild(menuItem);
    }

    document.body.appendChild(menuEl);

    // 定位
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menuEl.getBoundingClientRect();

    let top: number;
    if (placement === 'bottom') {
      top = triggerRect.bottom + offset;
      // 如果下方空间不足则翻转到上方
      if (top + menuRect.height > window.innerHeight) {
        top = triggerRect.top - menuRect.height - offset;
      }
    } else {
      top = triggerRect.top - menuRect.height - offset;
      // 如果上方空间不足则翻转到下方
      if (top < 0) {
        top = triggerRect.bottom + offset;
      }
    }

    let left = triggerRect.left;
    // 右侧溢出修正
    if (left + menuRect.width > window.innerWidth) {
      left = window.innerWidth - menuRect.width;
    }

    menuEl.style.top = `${Math.max(0, top)}px`;
    menuEl.style.left = `${Math.max(0, left)}px`;

    // hover 模式下为菜单绑定 mouseenter/mouseleave
    if (triggerMode === 'hover') {
      menuEl.addEventListener('mouseenter', () => {
        clearHoverTimer();
      });
      menuEl.addEventListener('mouseleave', () => {
        hoverCloseTimer = setTimeout(close, 150);
      });
    }

    // 渐入
    void menuEl.offsetHeight;
    menuEl.style.opacity = '1';
  }

  /** 打开下拉菜单 */
  function open(): void {
    if (destroyed || isOpen) return;
    isOpen = true;
    focusIndex = -1;
    buildAndPositionMenu();
  }

  /** 关闭下拉菜单 */
  function close(): void {
    if (!isOpen || !menuEl) return;
    isOpen = false;
    focusIndex = -1;
    menuEl.remove();
    menuEl = null;
  }

  // --- 事件处理 ---
  function handleTriggerClick(): void {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function handleClickOutside(e: MouseEvent): void {
    if (!isOpen) return;
    const t = e.target as Node;
    if (menuEl && !menuEl.contains(t) && !trigger.contains(t)) {
      close();
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (!isOpen) return;

    const selectables = getSelectableItems();
    if (selectables.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusIndex < selectables.length - 1 ? focusIndex + 1 : 0;
      updateFocus(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = focusIndex > 0 ? focusIndex - 1 : selectables.length - 1;
      updateFocus(prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIndex >= 0 && focusIndex < selectables.length) {
        selectables[focusIndex].click();
      }
    } else if (e.key === 'Escape') {
      close();
    }
  }

  function handleTriggerMouseEnter(): void {
    clearHoverTimer();
    open();
  }

  function handleTriggerMouseLeave(): void {
    hoverCloseTimer = setTimeout(close, 150);
  }

  // 绑定事件
  if (triggerMode === 'click') {
    trigger.addEventListener('click', handleTriggerClick);
  } else {
    trigger.addEventListener('mouseenter', handleTriggerMouseEnter);
    trigger.addEventListener('mouseleave', handleTriggerMouseLeave);
  }
  document.addEventListener('click', handleClickOutside, true);
  document.addEventListener('keydown', handleKeydown);

  /** 销毁下拉菜单 */
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;

    close();

    if (triggerMode === 'click') {
      trigger.removeEventListener('click', handleTriggerClick);
    } else {
      trigger.removeEventListener('mouseenter', handleTriggerMouseEnter);
      trigger.removeEventListener('mouseleave', handleTriggerMouseLeave);
    }
    if (hoverCloseTimer !== null) {
      clearTimeout(hoverCloseTimer);
    }
    document.removeEventListener('click', handleClickOutside, true);
    document.removeEventListener('keydown', handleKeydown);
  }

  return { open, close, destroy };
}

export { createDropdown };
export type { DropdownOptions, DropdownInstance, MenuItem };
