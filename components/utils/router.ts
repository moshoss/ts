/**
 * 简单 SPA 路由器
 *
 * 支持 hash 和 history 两种模式，路径参数匹配，程序化导航。
 *
 * @example
 * ```ts
 * const router = createRouter({
 *   routes: [
 *     { path: '/', handler: () => console.log('首页') },
 *     { path: '/user/:id', handler: (params) => console.log('用户:', params?.id) },
 *   ],
 *   mode: 'hash',
 *   onNotFound: () => console.log('页面未找到'),
 * });
 *
 * router.push('/user/42');
 * router.destroy();
 * ```
 */

/** 路由定义 */
interface Route {
  /** 路由路径，支持参数占位符如 '/user/:id' */
  path: string;
  /** 路由匹配时的处理函数 */
  handler: (params?: Record<string, string>) => void;
}

/** 路由器配置选项 */
interface RouterOptions {
  /** 路由表 */
  routes: Route[];
  /** 路由模式，默认 'hash' */
  mode?: 'hash' | 'history';
  /** 未匹配到任何路由时的回调 */
  onNotFound?: () => void;
}

/** 路由器实例接口 */
interface Router {
  /**
   * 程序化导航，新增历史记录
   * @param path - 目标路径
   */
  push(path: string): void;

  /**
   * 程序化导航，替换当前历史记录
   * @param path - 目标路径
   */
  replace(path: string): void;

  /**
   * 获取当前路径
   * @returns 当前路径字符串
   */
  getCurrentPath(): string;

  /**
   * 销毁路由器，移除所有事件监听
   */
  destroy(): void;
}

/** 编译后的路由信息（内部使用） */
interface CompiledRoute {
  /** 原始路由定义 */
  route: Route;
  /** 匹配用正则表达式 */
  regex: RegExp;
  /** 参数名称列表 */
  paramNames: string[];
}

/**
 * 将路由路径编译为正则表达式
 * @param path - 路由路径
 * @returns 编译后的正则和参数名
 */
function compilePath(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexStr = path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, paramName: string) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });
  const regex = new RegExp(`^${regexStr}$`);
  return { regex, paramNames };
}

/**
 * 创建 SPA 路由器
 *
 * @param options - 路由器配置
 * @returns 路由器实例
 */
function createRouter(options: RouterOptions): Router {
  const { routes, mode = 'hash', onNotFound } = options;

  /** 编译所有路由 */
  const compiledRoutes: CompiledRoute[] = routes.map((route) => {
    const { regex, paramNames } = compilePath(route.path);
    return { route, regex, paramNames };
  });

  /**
   * 获取当前路径
   */
  function getCurrentPath(): string {
    if (mode === 'hash') {
      const hash = window.location.hash.slice(1);
      return hash || '/';
    }
    return window.location.pathname;
  }

  /**
   * 根据路径匹配路由并执行处理函数
   * @param path - 待匹配的路径
   */
  function resolve(path: string): void {
    for (const compiled of compiledRoutes) {
      const match = path.match(compiled.regex);
      if (match) {
        const params: Record<string, string> = {};
        compiled.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        compiled.route.handler(
          compiled.paramNames.length > 0 ? params : undefined
        );
        return;
      }
    }
    onNotFound?.();
  }

  /**
   * 程序化导航，新增历史记录
   */
  function push(path: string): void {
    if (mode === 'hash') {
      window.location.hash = path;
    } else {
      window.history.pushState(null, '', path);
      resolve(path);
    }
  }

  /**
   * 程序化导航，替换当前历史记录
   */
  function replace(path: string): void {
    if (mode === 'hash') {
      const url = window.location.pathname + window.location.search + '#' + path;
      window.location.replace(url);
    } else {
      window.history.replaceState(null, '', path);
      resolve(path);
    }
  }

  /**
   * 处理 hashchange 事件
   */
  function handleHashChange(): void {
    resolve(getCurrentPath());
  }

  /**
   * 处理 popstate 事件
   */
  function handlePopState(): void {
    resolve(getCurrentPath());
  }

  /** 绑定对应模式的事件监听 */
  if (mode === 'hash') {
    window.addEventListener('hashchange', handleHashChange);
  } else {
    window.addEventListener('popstate', handlePopState);
  }

  /** 初始化时解析当前路径 */
  resolve(getCurrentPath());

  /**
   * 销毁路由器，移除所有事件监听
   */
  function destroy(): void {
    if (mode === 'hash') {
      window.removeEventListener('hashchange', handleHashChange);
    } else {
      window.removeEventListener('popstate', handlePopState);
    }
  }

  return { push, replace, getCurrentPath, destroy };
}

export { createRouter };
export type { Route, RouterOptions, Router };
