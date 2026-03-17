/**
 * 剪贴板工具
 *
 * 封装浏览器剪贴板 API，优先使用 navigator.clipboard，
 * 在不支持的环境下自动降级为 textarea + execCommand 方案。
 *
 * @example
 * ```ts
 * const clipboard = createClipboard();
 *
 * const success = await clipboard.copy('要复制的文本');
 * if (success) {
 *   console.log('复制成功');
 * } else {
 *   console.log('复制失败');
 * }
 * ```
 */

/** 剪贴板实例接口 */
interface Clipboard {
  /**
   * 将文本复制到剪贴板
   * @param text - 要复制的文本
   * @returns 是否复制成功
   */
  copy(text: string): Promise<boolean>;
}

/**
 * 使用 textarea + execCommand 的降级复制方案
 * @param text - 要复制的文本
 * @returns 是否复制成功
 */
function fallbackCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;

  /** 将 textarea 移出可视区域，避免页面闪烁 */
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    success = false;
  }

  document.body.removeChild(textarea);
  return success;
}

/**
 * 创建剪贴板工具实例
 *
 * @returns 剪贴板实例
 */
function createClipboard(): Clipboard {
  /**
   * 将文本复制到剪贴板
   */
  async function copy(text: string): Promise<boolean> {
    /** 优先尝试使用现代 Clipboard API */
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        /** Clipboard API 失败时降级到旧方案 */
        return fallbackCopy(text);
      }
    }

    /** 浏览器不支持 Clipboard API，使用降级方案 */
    return fallbackCopy(text);
  }

  return { copy };
}

export { createClipboard };
export type { Clipboard };
