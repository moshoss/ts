/**
 * 键盘快捷键管理器
 *
 * 支持组合键绑定、作用域隔离，可按作用域批量管理快捷键。
 *
 * @example
 * ```ts
 * const hotkey = createHotkey();
 *
 * const unbind = hotkey.bind('ctrl+s', (e) => {
 *   e.preventDefault();
 *   console.log('保存');
 * });
 *
 * hotkey.bind('ctrl+shift+k', () => console.log('删除行'), { scope: 'editor' });
 * hotkey.setScope('editor');
 *
 * // 清理
 * hotkey.destroy();
 * ```
 */

/** 快捷键绑定选项 */
interface HotkeyBindOptions {
  /** 作用域名称，仅当前作用域匹配时触发 */
  scope?: string;
}

/** 内部绑定记录 */
interface Binding {
  /** 修饰键与主键的规范化组合 */
  combo: string;
  /** 事件处理函数 */
  handler: (e: KeyboardEvent) => void;
  /** 所属作用域 */
  scope: string;
}

/** 快捷键管理器实例接口 */
interface Hotkey {
  /**
   * 绑定快捷键
   * @param combo - 组合键字符串，如 'ctrl+s'、'ctrl+shift+k'、'escape'、'alt+1'
   * @param handler - 快捷键触发时的回调
   * @param options - 可选配置
   * @returns 取消绑定的函数
   */
  bind(combo: string, handler: (e: KeyboardEvent) => void, options?: HotkeyBindOptions): () => void;

  /**
   * 设置当前活跃作用域
   * @param scope - 作用域名称
   */
  setScope(scope: string): void;

  /**
   * 移除绑定
   * @param scope - 可选，指定作用域；不传则移除所有绑定
   */
  unbindAll(scope?: string): void;

  /**
   * 销毁管理器，移除所有绑定和事件监听
   */
  destroy(): void;
}

/** 默认作用域名称 */
const DEFAULT_SCOPE = '__default__';

/**
 * 规范化组合键字符串：统一小写，修饰键排序后拼接
 * @param combo - 原始组合键字符串
 * @returns 规范化后的组合键
 */
function normalizeCombo(combo: string): string {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());

  const modifiers: string[] = [];
  let key = '';

  /** 识别的修饰键列表 */
  const modifierNames = ['ctrl', 'control', 'shift', 'alt', 'meta', 'cmd', 'command'];

  for (const part of parts) {
    if (modifierNames.includes(part)) {
      /** 统一别名 */
      if (part === 'control') {
        modifiers.push('ctrl');
      } else if (part === 'cmd' || part === 'command') {
        modifiers.push('meta');
      } else {
        modifiers.push(part);
      }
    } else {
      key = part;
    }
  }

  /** 修饰键按固定顺序排列，确保一致性 */
  const order = ['ctrl', 'alt', 'shift', 'meta'];
  modifiers.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return [...modifiers, key].join('+');
}

/**
 * 从 KeyboardEvent 提取规范化的组合键
 * @param e - 键盘事件
 * @returns 规范化后的组合键
 */
function getComboFromEvent(e: KeyboardEvent): string {
  const modifiers: string[] = [];

  if (e.ctrlKey) modifiers.push('ctrl');
  if (e.altKey) modifiers.push('alt');
  if (e.shiftKey) modifiers.push('shift');
  if (e.metaKey) modifiers.push('meta');

  const key = e.key.toLowerCase();

  /** 避免将修饰键本身作为主键 */
  const modifierKeys = ['control', 'alt', 'shift', 'meta'];
  if (modifierKeys.includes(key)) {
    return modifiers.join('+');
  }

  return [...modifiers, key].join('+');
}

/**
 * 创建键盘快捷键管理器
 *
 * @returns 快捷键管理器实例
 */
function createHotkey(): Hotkey {
  /** 所有绑定记录 */
  const bindings: Set<Binding> = new Set();

  /** 当前活跃作用域 */
  let currentScope: string = DEFAULT_SCOPE;

  /**
   * 全局 keydown 事件处理
   */
  function handleKeyDown(e: KeyboardEvent): void {
    const combo = getComboFromEvent(e);

    for (const binding of bindings) {
      if (binding.combo !== combo) continue;

      /** 检查作用域：默认作用域的绑定始终触发，其他作用域仅在匹配时触发 */
      if (binding.scope !== DEFAULT_SCOPE && binding.scope !== currentScope) {
        continue;
      }

      binding.handler(e);
    }
  }

  /** 绑定全局事件 */
  document.addEventListener('keydown', handleKeyDown);

  /**
   * 绑定快捷键
   */
  function bind(
    combo: string,
    handler: (e: KeyboardEvent) => void,
    options?: HotkeyBindOptions
  ): () => void {
    const normalizedCombo = normalizeCombo(combo);
    const scope = options?.scope ?? DEFAULT_SCOPE;

    const binding: Binding = {
      combo: normalizedCombo,
      handler,
      scope,
    };

    bindings.add(binding);

    return () => {
      bindings.delete(binding);
    };
  }

  /**
   * 设置当前活跃作用域
   */
  function setScope(scope: string): void {
    currentScope = scope;
  }

  /**
   * 移除绑定
   */
  function unbindAll(scope?: string): void {
    if (scope !== undefined) {
      for (const binding of [...bindings]) {
        if (binding.scope === scope) {
          bindings.delete(binding);
        }
      }
    } else {
      bindings.clear();
    }
  }

  /**
   * 销毁管理器
   */
  function destroy(): void {
    bindings.clear();
    document.removeEventListener('keydown', handleKeyDown);
  }

  return { bind, setScope, unbindAll, destroy };
}

export { createHotkey };
export type { Hotkey, HotkeyBindOptions };
