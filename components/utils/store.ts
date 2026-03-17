/**
 * 简单响应式状态管理
 *
 * 提供轻量级的状态存储，支持全局订阅和按键订阅，状态变更时自动通知监听者。
 *
 * @example
 * ```ts
 * const store = createStore({ count: 0, name: 'world' });
 *
 * store.subscribe((state, prev) => {
 *   console.log('状态变更:', prev, '->', state);
 * });
 *
 * store.select('count', (value, prev) => {
 *   console.log('count 变更:', prev, '->', value);
 * });
 *
 * store.setState({ count: 1 });
 * ```
 */

/** 全局状态变更监听器类型 */
type StoreListener<T> = (state: T, prevState: T) => void;

/** 单键状态变更监听器类型 */
type KeyListener<V> = (value: V, prevValue: V) => void;

/** Store 实例接口 */
interface Store<T extends Record<string, any>> {
  /**
   * 获取当前状态的浅拷贝
   * @returns 当前状态
   */
  getState(): T;

  /**
   * 合并更新状态，仅在值实际变更时通知监听者
   * @param partial - 部分状态更新
   */
  setState(partial: Partial<T>): void;

  /**
   * 订阅所有状态变更
   * @param listener - 变更回调，接收新状态和旧状态
   * @returns 取消订阅的函数
   */
  subscribe(listener: StoreListener<T>): () => void;

  /**
   * 订阅指定键的变更
   * @param key - 要监听的状态键
   * @param listener - 变更回调，接收新值和旧值
   * @returns 取消订阅的函数
   */
  select<K extends keyof T>(key: K, listener: KeyListener<T[K]>): () => void;

  /**
   * 销毁 Store，清除所有监听器
   */
  destroy(): void;
}

/**
 * 创建简单响应式状态管理实例
 *
 * @typeParam T - 状态对象类型
 * @param initialState - 初始状态
 * @returns Store 实例
 */
function createStore<T extends Record<string, any>>(initialState: T): Store<T> {
  /** 当前状态 */
  let state: T = { ...initialState };

  /** 全局监听器集合 */
  const listeners: Set<StoreListener<T>> = new Set();

  /** 按键监听器映射 */
  const keyListeners: Map<keyof T, Set<KeyListener<any>>> = new Map();

  /**
   * 获取当前状态的浅拷贝
   */
  function getState(): T {
    return { ...state };
  }

  /**
   * 合并更新状态
   */
  function setState(partial: Partial<T>): void {
    const prevState = state;
    const nextState: T = { ...state, ...partial };

    /** 检查是否有实际变更 */
    let changed = false;
    const changedKeys: (keyof T)[] = [];

    for (const key of Object.keys(partial) as (keyof T)[]) {
      if (!Object.is(prevState[key], nextState[key])) {
        changed = true;
        changedKeys.push(key);
      }
    }

    if (!changed) {
      return;
    }

    state = nextState;

    /** 通知全局监听器 */
    for (const listener of [...listeners]) {
      listener(getState(), prevState);
    }

    /** 通知对应键的监听器 */
    for (const key of changedKeys) {
      const set = keyListeners.get(key);
      if (set) {
        for (const listener of [...set]) {
          listener(nextState[key], prevState[key]);
        }
      }
    }
  }

  /**
   * 订阅所有状态变更
   */
  function subscribe(listener: StoreListener<T>): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * 订阅指定键的变更
   */
  function select<K extends keyof T>(key: K, listener: KeyListener<T[K]>): () => void {
    let set = keyListeners.get(key);
    if (!set) {
      set = new Set();
      keyListeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) {
        keyListeners.delete(key);
      }
    };
  }

  /**
   * 销毁 Store，清除所有监听器
   */
  function destroy(): void {
    listeners.clear();
    keyListeners.clear();
  }

  return { getState, setState, subscribe, select, destroy };
}

export { createStore };
export type { Store, StoreListener, KeyListener };
