/**
 * 懒加载工具
 *
 * 基于 IntersectionObserver 实现元素懒加载，支持图片 src 和背景图，
 * 自动管理加载状态的 CSS 类名。
 *
 * @example
 * ```ts
 * const lazyLoad = createLazyLoad({
 *   selector: '[data-src]',
 *   rootMargin: '200px',
 *   onLoad: (el) => console.log('加载完成:', el),
 *   onError: (el) => console.log('加载失败:', el),
 * });
 *
 * // 手动观察额外元素
 * const img = document.querySelector('.lazy-img');
 * if (img) lazyLoad.observe(img as HTMLElement);
 *
 * // 清理
 * lazyLoad.disconnect();
 * ```
 */

/** 懒加载配置选项 */
interface LazyLoadOptions {
  /** 需要懒加载的元素选择器，默认 '[data-src]' */
  selector?: string;
  /** IntersectionObserver 的根元素 */
  root?: HTMLElement;
  /** 根元素的外边距，默认 '200px' */
  rootMargin?: string;
  /** 元素加载完成的回调 */
  onLoad?: (el: HTMLElement) => void;
  /** 元素加载失败的回调 */
  onError?: (el: HTMLElement) => void;
}

/** 懒加载实例接口 */
interface LazyLoad {
  /**
   * 手动观察一个元素
   * @param el - 要观察的 HTML 元素
   */
  observe(el: HTMLElement): void;

  /**
   * 断开所有观察并清理资源
   */
  disconnect(): void;
}

/**
 * 创建懒加载实例
 *
 * @param options - 懒加载配置
 * @returns 懒加载实例
 */
function createLazyLoad(options?: LazyLoadOptions): LazyLoad {
  const {
    selector = '[data-src]',
    root,
    rootMargin = '200px',
    onLoad,
    onError,
  } = options ?? {};

  /**
   * 加载单个元素：将 data-src 赋值给 src，或将 data-background 赋值给 backgroundImage
   * @param el - 要加载的元素
   */
  function loadElement(el: HTMLElement): void {
    const dataSrc = el.getAttribute('data-src');
    const dataBackground = el.getAttribute('data-background');

    if (dataSrc) {
      /** 图片元素：监听 load/error 事件 */
      if (el instanceof HTMLImageElement) {
        el.addEventListener(
          'load',
          () => {
            el.classList.add('loaded');
            onLoad?.(el);
          },
          { once: true }
        );
        el.addEventListener(
          'error',
          () => {
            el.classList.add('error');
            onError?.(el);
          },
          { once: true }
        );
        el.src = dataSrc;
      } else {
        /** 非图片元素直接设置 src 属性 */
        el.setAttribute('src', dataSrc);
        el.classList.add('loaded');
        onLoad?.(el);
      }
      el.removeAttribute('data-src');
    }

    if (dataBackground) {
      el.style.backgroundImage = `url(${dataBackground})`;
      el.removeAttribute('data-background');

      /** 使用 Image 预加载来检测背景图加载状态 */
      const img = new Image();
      img.addEventListener(
        'load',
        () => {
          el.classList.add('loaded');
          onLoad?.(el);
        },
        { once: true }
      );
      img.addEventListener(
        'error',
        () => {
          el.classList.add('error');
          onError?.(el);
        },
        { once: true }
      );
      img.src = dataBackground;
    }
  }

  /**
   * IntersectionObserver 回调：元素进入视口时触发加载
   */
  function handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        loadElement(el);
      }
    }
  }

  /** 创建 IntersectionObserver 实例 */
  const observer = new IntersectionObserver(handleIntersection, {
    root: root ?? null,
    rootMargin,
    threshold: 0,
  });

  /** 初始化：观察所有匹配选择器的元素 */
  const elements = document.querySelectorAll<HTMLElement>(selector);
  for (const el of elements) {
    observer.observe(el);
  }

  /**
   * 手动观察一个元素
   */
  function observe(el: HTMLElement): void {
    observer.observe(el);
  }

  /**
   * 断开所有观察并清理资源
   */
  function disconnect(): void {
    observer.disconnect();
  }

  return { observe, disconnect };
}

export { createLazyLoad };
export type { LazyLoadOptions, LazyLoad };
