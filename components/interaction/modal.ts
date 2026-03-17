/**
 * @module modal
 * @description 模态对话框组件，支持遮罩层、ESC 关闭、点击遮罩关闭、打开/关闭动画等功能。
 */

/** 模态对话框配置选项 */
interface ModalOptions {
  /** 对话框内容元素 */
  content: HTMLElement;
  /** 对话框标题 */
  title?: string;
  /** 是否显示关闭按钮，默认 true */
  closable?: boolean;
  /** 是否点击遮罩层关闭，默认 true */
  maskClosable?: boolean;
  /** 打开回调 */
  onOpen?: () => void;
  /** 关闭回调 */
  onClose?: () => void;
  /** 对话框宽度，默认 '480px' */
  width?: string;
  /** 层级，默认 1000 */
  zIndex?: number;
}

/** 模态对话框实例 */
interface ModalInstance {
  /** 打开对话框 */
  open: () => void;
  /** 关闭对话框 */
  close: () => void;
  /** 销毁对话框，移除所有 DOM 和事件监听 */
  destroy: () => void;
}

/**
 * 创建模态对话框
 * @param options - 模态对话框配置
 * @returns 模态对话框实例，包含 open、close、destroy 方法
 */
function createModal(options: ModalOptions): ModalInstance {
  const {
    content,
    title,
    closable = true,
    maskClosable = true,
    onOpen,
    onClose,
    width = '480px',
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

  // --- 对话框容器 ---
  const dialog = document.createElement('div');
  Object.assign(dialog.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) scale(0.5)',
    width,
    maxHeight: '80vh',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: String(zIndex + 1),
    opacity: '0',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    display: 'none',
    overflow: 'auto',
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

    dialog.appendChild(header);
  }

  // --- 内容区域 ---
  const body = document.createElement('div');
  Object.assign(body.style, {
    padding: '24px',
  } satisfies Partial<CSSStyleDeclaration>);
  body.appendChild(content);
  dialog.appendChild(body);

  document.body.appendChild(mask);
  document.body.appendChild(dialog);

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

  /** 打开对话框 */
  function open(): void {
    if (destroyed || isOpen) return;
    isOpen = true;

    // 防止 body 滚动
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    mask.style.display = 'block';
    dialog.style.display = 'block';

    // 触发重排后应用过渡
    void mask.offsetHeight;
    mask.style.opacity = '1';
    dialog.style.opacity = '1';
    dialog.style.transform = 'translate(-50%, -50%) scale(1)';

    onOpen?.();
  }

  /** 关闭对话框 */
  function close(): void {
    if (destroyed || !isOpen) return;
    isOpen = false;

    document.body.style.overflow = savedOverflow;

    mask.style.opacity = '0';
    dialog.style.opacity = '0';
    dialog.style.transform = 'translate(-50%, -50%) scale(0.5)';

    const onTransitionEnd = (): void => {
      mask.style.display = 'none';
      dialog.style.display = 'none';
      dialog.removeEventListener('transitionend', onTransitionEnd);
    };
    dialog.addEventListener('transitionend', onTransitionEnd, { once: true });

    onClose?.();
  }

  /** 销毁对话框 */
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
    dialog.remove();
  }

  return { open, close, destroy };
}

export { createModal };
export type { ModalOptions, ModalInstance };
