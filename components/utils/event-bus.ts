/**
 * 事件总线（发布/订阅模式）
 *
 * 提供类型安全的事件发布与订阅机制，支持一次性监听、取消订阅和清除所有处理器。
 *
 * @example
 * ```ts
 * type Events = {
 *   login: { userId: string };
 *   logout: void;
 * };
 *
 * const bus = createEventBus<Events>();
 * const unsub = bus.on('login', (data) => console.log(data.userId));
 * bus.emit('login', { userId: '123' });
 * unsub();
 * ```
 */

/** 事件处理器类型 */
type EventHandler<T = any> = (data: T) => void;

/** 事件总线实例接口 */
interface EventBus<T extends Record<string, any>> {
  /**
   * 订阅事件
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 取消订阅的函数
   */
  on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): () => void;

  /**
   * 取消订阅事件
   * @param event - 事件名称
   * @param handler - 需要取消的事件处理函数
   */
  off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void;

  /**
   * 发布事件
   * @param event - 事件名称
   * @param data - 事件数据
   */
  emit<K extends keyof T>(event: K, data: T[K]): void;

  /**
   * 订阅事件（仅触发一次）
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 取消订阅的函数
   */
  once<K extends keyof T>(event: K, handler: EventHandler<T[K]>): () => void;

  /**
   * 清除事件处理器
   * @param event - 可选，指定事件名称；不传则清除所有事件的处理器
   */
  clear<K extends keyof T>(event?: K): void;
}

/**
 * 创建类型安全的事件总线
 *
 * @typeParam T - 事件名称到事件数据类型的映射
 * @returns 事件总线实例
 */
function createEventBus<T extends Record<string, any>>(): EventBus<T> {
  /** 存储所有事件处理器的映射 */
  const handlers: Map<keyof T, Set<EventHandler>> = new Map();

  /**
   * 获取指定事件的处理器集合，若不存在则创建
   * @param event - 事件名称
   * @returns 处理器集合
   */
  function getHandlers<K extends keyof T>(event: K): Set<EventHandler> {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    return set;
  }

  /**
   * 订阅事件
   */
  function on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): () => void {
    const set = getHandlers(event);
    set.add(handler);
    return () => off(event, handler);
  }

  /**
   * 取消订阅事件
   */
  function off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void {
    const set = handlers.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        handlers.delete(event);
      }
    }
  }

  /**
   * 发布事件，按注册顺序依次调用所有处理器
   */
  function emit<K extends keyof T>(event: K, data: T[K]): void {
    const set = handlers.get(event);
    if (set) {
      for (const handler of [...set]) {
        handler(data);
      }
    }
  }

  /**
   * 订阅事件，仅在首次触发时执行处理器，随后自动取消订阅
   */
  function once<K extends keyof T>(event: K, handler: EventHandler<T[K]>): () => void {
    const wrapper: EventHandler<T[K]> = (data: T[K]) => {
      off(event, wrapper);
      handler(data);
    };
    return on(event, wrapper);
  }

  /**
   * 清除处理器：传入事件名称则清除该事件的处理器，否则清除全部
   */
  function clear<K extends keyof T>(event?: K): void {
    if (event !== undefined) {
      handlers.delete(event);
    } else {
      handlers.clear();
    }
  }

  return { on, off, emit, once, clear };
}

export { createEventBus };
export type { EventBus, EventHandler };
