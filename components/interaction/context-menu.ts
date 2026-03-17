/**
 * @module context-menu
 * @description 右键上下文菜单组件，支持视口边界检测、ESC 关闭、点击外部关闭等功能。
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

/** 上下文菜单配置选项 */
interface ContextMenuOptions {
  /** 绑定右键事件的目标元素 */
  target: HTMLElement;
  /** 菜单项列表 */
  items: MenuItem[];
  /** 选中回调 */
  onSelect?: (item: MenuItem) => void;
}

/** 上下文菜单实例 */
interface ContextMenuInstance {
  /** 销毁菜单，移除所有 DOM 和事件监听 */
  destroy: () => void;
}

/**
 * 创建右键上下文菜单
 * @param options - 上下文菜单配置
 * @returns 上下文菜单实例，包含 destroy 方法
 */
function createContextMenu(options: ContextMenuOptions): ContextMenuInstance {
  const { target, items, onSelect } = options;

  let destroyed = false;
  let menuEl: HTMLDivElement | null = null;

  /**
   * 构建菜单 DOM
   * @returns 菜单元素
   */
  function buildMenu(): HTMLDivElement {
    const menu = document.createElement('div');
    Object.assign(menu.style, {
      position: 'fixed',
      zIndex: '10000',
      backgroundColor: '#fff',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      padding: '4px 0',
      minWidth: '120px',
      fontSize: '14px',
      color: '#333',
    } satisfies Partial<CSSStyleDeclaration>);

    for (const item of items) {
      if (item.divider) {
        const divider = document.createElement('div');
        Object.assign(divider.style, {
          height: '1px',
          backgroundColor: '#f0f0f0',
          margin: '4px 0',
        } satisfies Partial<CSSStyleDeclaration>);
        menu.appendChild(divider);
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
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.backgroundColor = '#f5f5f5';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.backgroundColor = '';
        });
        menuItem.addEventListener('click', () => {
          onSelect?.(item);
          hideMenu();
        });
      }

      menu.appendChild(menuItem);
    }

    return menu;
  }

  /**
   * 在指定坐标显示菜单，自动处理视口边界翻转
   * @param x - 鼠标 X 坐标
   * @param y - 鼠标 Y 坐标
   */
  function showMenu(x: number, y: number): void {
    hideMenu();

    menuEl = buildMenu();
    document.body.appendChild(menuEl);

    // 先放到屏幕外测量尺寸
    menuEl.style.left = '-9999px';
    menuEl.style.top = '-9999px';
    const rect = menuEl.getBoundingClientRect();

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 视口边界检测：如果超出右/下边界则翻转
    const finalX = x + rect.width > vw ? x - rect.width : x;
    const finalY = y + rect.height > vh ? y - rect.height : y;

    menuEl.style.left = `${Math.max(0, finalX)}px`;
    menuEl.style.top = `${Math.max(0, finalY)}px`;
  }

  /** 隐藏并移除菜单 */
  function hideMenu(): void {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
    }
  }

  // --- 事件处理 ---
  function handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    showMenu(e.clientX, e.clientY);
  }

  function handleClickOutside(e: MouseEvent): void {
    if (menuEl && !menuEl.contains(e.target as Node)) {
      hideMenu();
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && menuEl) {
      hideMenu();
    }
  }

  target.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', handleClickOutside, true);
  document.addEventListener('keydown', handleKeydown);

  /** 销毁菜单 */
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;

    hideMenu();
    target.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('click', handleClickOutside, true);
    document.removeEventListener('keydown', handleKeydown);
  }

  return { destroy };
}

export { createContextMenu };
export type { ContextMenuOptions, ContextMenuInstance, MenuItem };
