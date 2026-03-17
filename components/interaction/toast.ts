/**
 * @module toast
 * @description 轻提示/消息通知组件，支持多种类型、自动消失、多条堆叠、滑入动画等功能。
 */

/** 提示类型 */
type ToastType = 'info' | 'success' | 'warning' | 'error';

/** 提示位置 */
type ToastPosition = 'top' | 'bottom';

/** 轻提示配置选项 */
interface ToastOptions {
  /** 提示内容 */
  message: string;
  /** 提示类型，默认 'info' */
  type?: ToastType;
  /** 显示时长（毫秒），默认 3000，0 为手动关闭 */
  duration?: number;
  /** 显示位置，默认 'top' */
  position?: ToastPosition;
  /** 关闭回调 */
  onClose?: () => void;
}

/** 轻提示实例 */
interface ToastInstance {
  /** 关闭提示 */
  close: () => void;
}

/** 各类型对应的颜色配置 */
const TYPE_COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  info: { bg: '#e6f7ff', border: '#91d5ff', text: '#1890ff' },
  success: { bg: '#f6ffed', border: '#b7eb8f', text: '#52c41a' },
  warning: { bg: '#fffbe6', border: '#ffe58f', text: '#faad14' },
  error: { bg: '#fff2f0', border: '#ffccc7', text: '#ff4d4f' },
};

/** 各类型对应的图标 */
const TYPE_ICONS: Record<ToastType, string> = {
  info: '\u2139',
  success: '\u2713',
  warning: '\u26a0',
  error: '\u2717',
};

/** 容器缓存，按位置区分 */
const containerMap = new Map<ToastPosition, HTMLDivElement>();

/**
 * 获取或创建指定位置的 toast 容器
 * @param position - 显示位置
 * @returns 容器元素
 */
function getContainer(position: ToastPosition): HTMLDivElement {
  let container = containerMap.get(position);
  if (container && container.isConnected) {
    return container;
  }

  container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    pointerEvents: 'none',
    ...(position === 'top' ? { top: '24px' } : { bottom: '24px' }),
  } satisfies Partial<CSSStyleDeclaration>);

  document.body.appendChild(container);
  containerMap.set(position, container);
  return container;
}

/**
 * 创建轻提示通知
 * @param options - 轻提示配置
 * @returns 轻提示实例，包含 close 方法
 */
function createToast(options: ToastOptions): ToastInstance {
  const {
    message,
    type = 'info',
    duration = 3000,
    position = 'top',
    onClose,
  } = options;

  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const colors = TYPE_COLORS[type];
  const icon = TYPE_ICONS[type];
  const container = getContainer(position);

  // --- toast 元素 ---
  const el = document.createElement('div');
  Object.assign(el.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    fontSize: '14px',
    color: '#333',
    pointerEvents: 'auto',
    opacity: '0',
    transform: position === 'top' ? 'translateY(-16px)' : 'translateY(16px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    whiteSpace: 'nowrap',
  } satisfies Partial<CSSStyleDeclaration>);

  // 图标
  const iconEl = document.createElement('span');
  iconEl.textContent = icon;
  Object.assign(iconEl.style, {
    color: colors.text,
    fontSize: '16px',
    fontWeight: 'bold',
  } satisfies Partial<CSSStyleDeclaration>);
  el.appendChild(iconEl);

  // 文本
  const textEl = document.createElement('span');
  textEl.textContent = message;
  el.appendChild(textEl);

  // 手动关闭按钮（duration === 0 时显示）
  if (duration === 0) {
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '\u00d7';
    Object.assign(closeBtn.style, {
      marginLeft: '8px',
      cursor: 'pointer',
      color: '#999',
      fontSize: '16px',
      lineHeight: '1',
    } satisfies Partial<CSSStyleDeclaration>);
    closeBtn.addEventListener('click', close);
    el.appendChild(closeBtn);
  }

  container.appendChild(el);

  // 触发滑入动画
  void el.offsetHeight;
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';

  // 自动关闭
  if (duration > 0) {
    timer = setTimeout(close, duration);
  }

  /** 关闭提示 */
  function close(): void {
    if (closed) return;
    closed = true;

    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    el.style.opacity = '0';
    el.style.transform = position === 'top' ? 'translateY(-16px)' : 'translateY(16px)';

    const onTransitionEnd = (): void => {
      el.remove();
      // 容器空了就移除
      if (container.children.length === 0) {
        container.remove();
        containerMap.delete(position);
      }
      onClose?.();
    };
    el.addEventListener('transitionend', onTransitionEnd, { once: true });
  }

  return { close };
}

export { createToast };
export type { ToastOptions, ToastInstance, ToastType, ToastPosition };
