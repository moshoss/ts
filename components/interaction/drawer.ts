/**
 * @module drawer
 * @description 抽屉面板组件，支持从左/右侧滑入、遮罩层、ESC 关闭等功能。
 */

/** 抽屉位置 */
type DrawerPlacement = 'left' | 'right';

/** 抽屉面板配置选项 */
interface DrawerOptions {
  /** 抽屉内容元素 */
  content: HTMLElement;
  /** 抽屉标题 */
  title?: string;
  /** 滑入方向，默认 'right' */
  placement?: DrawerPlacement;
  /** 抽屉宽度，默认 '300px' */
  width?: string;
  /** 是否点击遮罩层关闭，默认 true */
  maskClosable?: boolean;
  /** 是否显示关闭按钮，默认 true */
  closable?: boolean;
  /** 打开回调 */
  onOpen?: () => void;
  /** 关闭回调 */
  onClose?: () => void;
  /** 层级，默认 1000 */
  zIndex?: number;
}

/** 抽屉面板实例 */
interface DrawerInstance {
  /** 打开抽屉 */
  open: () => void;
  /** 关闭抽屉 */
  close: () => void;
  /** 销毁抽屉，移除所有 DOM 和事件监听 */
  destroy: () => void;
}

/**
 * 创建抽屉面板
 * @param options - 抽屉配置
 * @returns 抽屉实例，包含 open、close、destroy 方法
 */
function createDrawer(options: DrawerOptions): DrawerInstance {
  const {
    content,
    title,
    placement = 'right',
    width = '300px',
    maskClosable = true,
    closable = true,
    onOpen,
    onClose,
    zIndex = 1000,
  } = options;

  let isOpen = false;
  let destroyed = false;
  let savedOverflow = '';

  // --- 遮罩层 ---
  const mask = document.createElement('div');
  Object.assign(mask.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: String(zIndex),
    opacity: '0',
    transition: 'opacity 0.3s ease',
    display: 'none',
  } satisfies Partial<CSSStyleDeclaration>);

  // --- 抽屉面板 ---
  const panel = document.createElement('div');
  const translateHidden = placement === 'right' ? 'translateX(100%)' : 'translateX(-100%)';
  Object.assign(panel.style, {
    position: 'fixed',
    top: '0',
    [placement]: '0',
    width,
    height: '100%',
    backgroundColor: '#fff',
    boxShadow: placement === 'right'
      ? '-2px 0 8px rgba(0, 0, 0, 0.15)'
      : '2px 0 8px rgba(0, 0, 0, 0.15)',
    zIndex: String(zIndex + 1),
    transform: translateHidden,
    transition: 'transform 0.3s ease',
    display: 'none',
    overflow: 'auto',
    boxSizing: 'border-box',
  } satisfies Partial<CSSStyleDeclaration>);

  // --- 头部（标题 + 关闭按钮）---
  if (title || closable) {
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid #f0f0f0',
    } satisfies Partial<CSSStyleDeclaration>);

    if (title) {
      const titleEl = document.createElement('div');
      titleEl.textContent = title;
      Object.assign(titleEl.style, {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
      } satisfies Partial<CSSStyleDeclaration>);
      header.appendChild(titleEl);
    }

    if (closable) {
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '\u00d7';
      Object.assign(closeBtn.style, {
        background: 'none',
        border: 'none',
        fontSize: '20px',
        cursor: 'pointer',
        color: '#999',
        padding: '0',
        lineHeight: '1',
        marginLeft: 'auto',
      } satisfies Partial<CSSStyleDeclaration>);
      closeBtn.addEventListener('click', close);
      header.appendChild(closeBtn);
    }

    panel.appendChild(header);
  }

  // --- 内容区域 ---
  const body = document.createElement('div');
  Object.assign(body.style, {
    padding: '24px',
  } satisfies Partial<CSSStyleDeclaration>);
  body.appendChild(content);
  panel.appendChild(body);

  document.body.appendChild(mask);
  document.body.appendChild(panel);

  // --- 事件处理 ---
  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && isOpen) {
      close();
    }
  }

  function handleMaskClick(e: MouseEvent): void {
    if (maskClosable && e.target === mask) {
      close();
    }
  }

  mask.addEventListener('click', handleMaskClick);
  document.addEventListener('keydown', handleKeydown);

  /** 打开抽屉 */
  function open(): void {
    if (destroyed || isOpen) return;
    isOpen = true;

    // 防止 body 滚动
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    mask.style.display = 'block';
    panel.style.display = 'block';

    // 触发重排后应用过渡
    void panel.offsetHeight;
    mask.style.opacity = '1';
    panel.style.transform = 'translateX(0)';

    onOpen?.();
  }

  /** 关闭抽屉 */
  function close(): void {
    if (destroyed || !isOpen) return;
    isOpen = false;

    document.body.style.overflow = savedOverflow;

    mask.style.opacity = '0';
    panel.style.transform = translateHidden;

    const onTransitionEnd = (): void => {
      mask.style.display = 'none';
      panel.style.display = 'none';
      panel.removeEventListener('transitionend', onTransitionEnd);
    };
    panel.addEventListener('transitionend', onTransitionEnd, { once: true });

    onClose?.();
  }

  /** 销毁抽屉 */
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;

    if (isOpen) {
      document.body.style.overflow = savedOverflow;
      isOpen = false;
    }

    document.removeEventListener('keydown', handleKeydown);
    mask.removeEventListener('click', handleMaskClick);
    mask.remove();
    panel.remove();
  }

  return { open, close, destroy };
}

export { createDrawer };
export type { DrawerOptions, DrawerInstance, DrawerPlacement };
