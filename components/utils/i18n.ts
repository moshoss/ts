/**
 * 国际化工具
 *
 * 提供多语言文案管理，支持点号分隔的键名查找和模板参数插值。
 *
 * @example
 * ```ts
 * const i18n = createI18n({
 *   locale: 'zh',
 *   messages: {
 *     zh: { 'common.save': '保存', 'greeting': '你好 {name}' },
 *     en: { 'common.save': 'Save', 'greeting': 'Hello {name}' },
 *   },
 *   fallback: 'en',
 * });
 *
 * i18n.t('common.save');                    // => '保存'
 * i18n.t('greeting', { name: '世界' });     // => '你好 世界'
 * i18n.setLocale('en');
 * i18n.t('greeting', { name: 'World' });    // => 'Hello World'
 * ```
 */

/** 国际化配置选项 */
interface I18nOptions {
  /** 当前语言标识 */
  locale: string;
  /** 多语言消息映射，外层键为语言标识，内层键为消息键 */
  messages: Record<string, Record<string, string>>;
  /** 回退语言标识，当前语言找不到消息时使用 */
  fallback?: string;
}

/** 国际化实例接口 */
interface I18n {
  /**
   * 根据键获取翻译文案，支持模板参数插值
   * @param key - 消息键，支持点号分隔如 'common.save'
   * @param params - 可选的模板参数
   * @returns 翻译后的字符串，未找到时返回键本身
   */
  t(key: string, params?: Record<string, string>): string;

  /**
   * 切换当前语言
   * @param locale - 语言标识
   */
  setLocale(locale: string): void;

  /**
   * 获取当前语言标识
   * @returns 当前语言
   */
  getLocale(): string;
}

/**
 * 创建国际化实例
 *
 * @param options - 国际化配置
 * @returns 国际化实例
 */
function createI18n(options: I18nOptions): I18n {
  let currentLocale: string = options.locale;
  const messages: Record<string, Record<string, string>> = options.messages;
  const fallback: string | undefined = options.fallback;

  /**
   * 从指定语言的消息映射中查找键值
   * @param locale - 语言标识
   * @param key - 消息键
   * @returns 找到的消息字符串，未找到返回 undefined
   */
  function lookup(locale: string, key: string): string | undefined {
    const localeMessages = messages[locale];
    if (!localeMessages) {
      return undefined;
    }
    return localeMessages[key];
  }

  /**
   * 对消息模板执行参数插值
   * @param template - 消息模板，如 'Hello {name}'
   * @param params - 参数映射
   * @returns 替换后的字符串
   */
  function interpolate(template: string, params: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_match, paramKey: string) => {
      return params[paramKey] !== undefined ? params[paramKey] : `{${paramKey}}`;
    });
  }

  /**
   * 获取翻译文案
   */
  function t(key: string, params?: Record<string, string>): string {
    let message = lookup(currentLocale, key);

    /** 当前语言未找到，尝试回退语言 */
    if (message === undefined && fallback && fallback !== currentLocale) {
      message = lookup(fallback, key);
    }

    /** 仍未找到，返回键本身 */
    if (message === undefined) {
      return key;
    }

    /** 如果有参数则进行插值 */
    if (params) {
      return interpolate(message, params);
    }

    return message;
  }

  /**
   * 切换当前语言
   */
  function setLocale(locale: string): void {
    currentLocale = locale;
  }

  /**
   * 获取当前语言标识
   */
  function getLocale(): string {
    return currentLocale;
  }

  return { t, setLocale, getLocale };
}

export { createI18n };
export type { I18nOptions, I18n };
