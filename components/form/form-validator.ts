/**
 * 表单验证器模块
 * 提供基于规则的表单字段验证功能，支持同步和异步验证规则。
 */

/** 验证规则接口 */
interface Rule {
  /** 是否必填 */
  required?: boolean;
  /** 最小值（字符串长度或数字大小） */
  min?: number;
  /** 最大值（字符串长度或数字大小） */
  max?: number;
  /** 正则表达式验证 */
  pattern?: RegExp;
  /** 验证失败时的错误消息 */
  message: string;
  /** 自定义验证函数，支持异步 */
  validator?: (value: any) => boolean | Promise<boolean>;
}

/** 表单验证器配置选项 */
interface FormValidatorOptions {
  /** 各字段对应的验证规则列表 */
  rules: Record<string, Rule[]>;
  /** 验证出错时的回调函数 */
  onError?: (field: string, errors: string[]) => void;
}

/** 表单验证器返回接口 */
interface FormValidatorInstance {
  /** 验证单个字段 */
  validate: (field: string, value: any) => Promise<string[]>;
  /** 验证所有字段 */
  validateAll: (data: Record<string, any>) => Promise<Record<string, string[]>>;
  /** 销毁验证器实例 */
  destroy: () => void;
}

/**
 * 创建表单验证器
 * @param options - 验证器配置选项
 * @returns 验证器实例，包含 validate、validateAll 和 destroy 方法
 */
function createFormValidator(options: FormValidatorOptions): FormValidatorInstance {
  let rules: Record<string, Rule[]> | null = { ...options.rules };
  let onError: ((field: string, errors: string[]) => void) | undefined = options.onError;

  /**
   * 对单条规则执行验证
   * @param rule - 验证规则
   * @param value - 待验证的值
   * @returns 验证是否通过
   */
  const checkRule = async (rule: Rule, value: any): Promise<boolean> => {
    if (rule.required) {
      if (value === undefined || value === null || value === '') {
        return false;
      }
    }

    // 如果值为空且非必填，跳过后续验证
    if (value === undefined || value === null || value === '') {
      return true;
    }

    if (rule.min !== undefined) {
      if (typeof value === 'string' && value.length < rule.min) {
        return false;
      }
      if (typeof value === 'number' && value < rule.min) {
        return false;
      }
    }

    if (rule.max !== undefined) {
      if (typeof value === 'string' && value.length > rule.max) {
        return false;
      }
      if (typeof value === 'number' && value > rule.max) {
        return false;
      }
    }

    if (rule.pattern !== undefined) {
      if (typeof value === 'string' && !rule.pattern.test(value)) {
        return false;
      }
    }

    if (rule.validator !== undefined) {
      const result: boolean | Promise<boolean> = rule.validator(value);
      const resolved: boolean = await Promise.resolve(result);
      return resolved;
    }

    return true;
  };

  /**
   * 验证单个字段
   * @param field - 字段名
   * @param value - 字段值
   * @returns 错误消息数组，为空表示验证通过
   */
  const validate = async (field: string, value: any): Promise<string[]> => {
    if (!rules) {
      return [];
    }

    const fieldRules: Rule[] | undefined = rules[field];
    if (!fieldRules) {
      return [];
    }

    const errors: string[] = [];

    for (const rule of fieldRules) {
      const passed: boolean = await checkRule(rule, value);
      if (!passed) {
        errors.push(rule.message);
      }
    }

    if (errors.length > 0 && onError) {
      onError(field, errors);
    }

    return errors;
  };

  /**
   * 验证所有字段
   * @param data - 表单数据对象
   * @returns 各字段的错误消息记录
   */
  const validateAll = async (data: Record<string, any>): Promise<Record<string, string[]>> => {
    if (!rules) {
      return {};
    }

    const result: Record<string, string[]> = {};
    const fields: string[] = Object.keys(rules);

    for (const field of fields) {
      const value: any = data[field];
      const errors: string[] = await validate(field, value);
      if (errors.length > 0) {
        result[field] = errors;
      }
    }

    return result;
  };

  /**
   * 销毁验证器，释放所有引用
   */
  const destroy = (): void => {
    rules = null;
    onError = undefined;
  };

  return { validate, validateAll, destroy };
}

export { createFormValidator };
export type { Rule, FormValidatorOptions, FormValidatorInstance };
