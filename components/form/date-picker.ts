/**
 * 日期选择器模块
 * 提供带日历面板的日期选择功能，支持自定义格式、日期范围限制。
 */

/** 日期选择器配置选项 */
interface DatePickerOptions {
  /** 挂载容器元素 */
  container: HTMLElement;
  /** 初始日期值 */
  value?: Date;
  /** 日期格式字符串，默认 'YYYY-MM-DD' */
  format?: string;
  /** 日期变化时的回调 */
  onChange?: (date: Date) => void;
  /** 可选最小日期 */
  min?: Date;
  /** 可选最大日期 */
  max?: Date;
}

/** 日期选择器返回接口 */
interface DatePickerInstance {
  /** 获取当前选中的日期 */
  getValue: () => Date | null;
  /** 设置日期 */
  setValue: (date: Date) => void;
  /** 销毁日期选择器 */
  destroy: () => void;
}

/** 星期标题 */
const WEEKDAYS: string[] = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 格式化日期为指定格式
 * @param date - 日期对象
 * @param format - 格式字符串
 * @returns 格式化后的字符串
 */
function formatDate(date: Date, format: string): string {
  const year: number = date.getFullYear();
  const month: number = date.getMonth() + 1;
  const day: number = date.getDate();

  let result: string = format;
  result = result.replace('YYYY', String(year));
  result = result.replace('MM', String(month).padStart(2, '0'));
  result = result.replace('DD', String(day).padStart(2, '0'));
  return result;
}

/**
 * 判断两个日期是否为同一天
 * @param a - 日期 A
 * @param b - 日期 B
 * @returns 是否同一天
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 创建日期选择器
 * @param options - 日期选择器配置
 * @returns 日期选择器实例
 */
function createDatePicker(options: DatePickerOptions): DatePickerInstance {
  const container: HTMLElement = options.container;
  const dateFormat: string = options.format ?? 'YYYY-MM-DD';
  const onChange: ((date: Date) => void) | undefined = options.onChange;
  const minDate: Date | undefined = options.min;
  const maxDate: Date | undefined = options.max;

  let selectedDate: Date | null = options.value ? new Date(options.value.getTime()) : null;
  let viewYear: number = selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
  let viewMonth: number = selectedDate ? selectedDate.getMonth() : new Date().getMonth();
  let isOpen: boolean = false;

  /** 输入框 */
  const input: HTMLInputElement = document.createElement('input');
  input.type = 'text';
  input.readOnly = true;
  input.placeholder = dateFormat;
  input.style.cssText = [
    'width: 100%',
    'height: 34px',
    'border: 1px solid #d9d9d9',
    'border-radius: 4px',
    'padding: 4px 8px',
    'font-size: 14px',
    'cursor: pointer',
    'box-sizing: border-box',
    'outline: none',
    'background: #fff',
  ].join(';');
  if (selectedDate) {
    input.value = formatDate(selectedDate, dateFormat);
  }
  container.appendChild(input);

  /** 日历面板 */
  const panel: HTMLDivElement = document.createElement('div');
  panel.style.cssText = [
    'position: fixed',
    'z-index: 99999',
    'background: #fff',
    'border: 1px solid #d9d9d9',
    'border-radius: 4px',
    'box-shadow: 0 2px 8px rgba(0,0,0,0.15)',
    'padding: 12px',
    'display: none',
    'width: 280px',
  ].join(';');
  document.body.appendChild(panel);

  /**
   * 定位面板
   */
  const positionPanel = (): void => {
    const rect: DOMRect = input.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 2}px`;
    panel.style.left = `${rect.left}px`;
  };

  /**
   * 判断日期是否在允许范围外
   * @param date - 待判断的日期
   * @returns 是否被禁用
   */
  const isDisabled = (date: Date): boolean => {
    if (minDate) {
      const min: Date = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      if (date < min) {
        return true;
      }
    }
    if (maxDate) {
      const max: Date = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
      if (date > max) {
        return true;
      }
    }
    return false;
  };

  /**
   * 渲染日历面板
   */
  const renderCalendar = (): void => {
    panel.innerHTML = '';

    /** 头部：上月 < 年月标题 > 下月 */
    const header: HTMLDivElement = document.createElement('div');
    header.style.cssText = [
      'display: flex',
      'justify-content: space-between',
      'align-items: center',
      'margin-bottom: 8px',
    ].join(';');

    const prevBtn: HTMLButtonElement = document.createElement('button');
    prevBtn.textContent = '\u25C0';
    prevBtn.style.cssText = 'border:none;background:none;cursor:pointer;font-size:14px;padding:4px 8px;color:#333';
    prevBtn.addEventListener('click', (): void => {
      viewMonth--;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
      }
      renderCalendar();
    });

    const nextBtn: HTMLButtonElement = document.createElement('button');
    nextBtn.textContent = '\u25B6';
    nextBtn.style.cssText = 'border:none;background:none;cursor:pointer;font-size:14px;padding:4px 8px;color:#333';
    nextBtn.addEventListener('click', (): void => {
      viewMonth++;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
      }
      renderCalendar();
    });

    const title: HTMLSpanElement = document.createElement('span');
    title.textContent = `${viewYear}年${viewMonth + 1}月`;
    title.style.cssText = 'font-size:14px;font-weight:bold;color:#333';

    header.appendChild(prevBtn);
    header.appendChild(title);
    header.appendChild(nextBtn);
    panel.appendChild(header);

    /** 星期标题行 */
    const grid: HTMLDivElement = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px';

    for (const wd of WEEKDAYS) {
      const cell: HTMLDivElement = document.createElement('div');
      cell.textContent = wd;
      cell.style.cssText = 'text-align:center;font-size:12px;color:#999;padding:4px 0';
      grid.appendChild(cell);
    }

    /** 计算日期网格 */
    const firstDay: Date = new Date(viewYear, viewMonth, 1);
    const startWeekday: number = firstDay.getDay();
    const daysInMonth: number = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today: Date = new Date();

    // 填充前面的空白
    for (let i: number = 0; i < startWeekday; i++) {
      const empty: HTMLDivElement = document.createElement('div');
      grid.appendChild(empty);
    }

    // 日期单元格
    for (let d: number = 1; d <= daysInMonth; d++) {
      const cellDate: Date = new Date(viewYear, viewMonth, d);
      const cell: HTMLDivElement = document.createElement('div');
      cell.textContent = String(d);

      const disabled: boolean = isDisabled(cellDate);
      const isToday: boolean = isSameDay(cellDate, today);
      const isSelected: boolean = selectedDate !== null && isSameDay(cellDate, selectedDate);

      let bg: string = '#fff';
      let color: string = '#333';
      let border: string = 'none';

      if (isSelected) {
        bg = '#1890ff';
        color = '#fff';
      } else if (isToday) {
        border = '1px solid #1890ff';
        color = '#1890ff';
      }

      if (disabled) {
        color = '#d9d9d9';
      }

      cell.style.cssText = [
        'text-align: center',
        'font-size: 13px',
        'padding: 4px 0',
        `cursor: ${disabled ? 'not-allowed' : 'pointer'}`,
        `background: ${bg}`,
        `color: ${color}`,
        'border-radius: 2px',
        `border: ${border}`,
        'line-height: 24px',
      ].join(';');

      if (!disabled) {
        cell.addEventListener('mouseenter', (): void => {
          if (!isSelected) {
            cell.style.backgroundColor = '#f5f5f5';
          }
        });
        cell.addEventListener('mouseleave', (): void => {
          cell.style.backgroundColor = isSelected ? '#1890ff' : '#fff';
        });
        cell.addEventListener('click', (): void => {
          selectDate(cellDate);
        });
      }

      grid.appendChild(cell);
    }

    panel.appendChild(grid);
  };

  /**
   * 选中日期
   * @param date - 选中的日期
   */
  const selectDate = (date: Date): void => {
    selectedDate = new Date(date.getTime());
    input.value = formatDate(selectedDate, dateFormat);
    closePanel();
    if (onChange) {
      onChange(new Date(selectedDate.getTime()));
    }
  };

  /**
   * 打开日历面板
   */
  const openPanel = (): void => {
    isOpen = true;
    if (selectedDate) {
      viewYear = selectedDate.getFullYear();
      viewMonth = selectedDate.getMonth();
    }
    renderCalendar();
    positionPanel();
    panel.style.display = 'block';
    input.style.borderColor = '#1890ff';
  };

  /**
   * 关闭日历面板
   */
  const closePanel = (): void => {
    isOpen = false;
    panel.style.display = 'none';
    input.style.borderColor = '#d9d9d9';
  };

  /**
   * 输入框点击事件
   */
  const handleInputClick = (): void => {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  };

  /**
   * 全局点击事件
   * @param e - 鼠标事件
   */
  const handleDocumentClick = (e: MouseEvent): void => {
    const target: Node = e.target as Node;
    if (!input.contains(target) && !panel.contains(target)) {
      closePanel();
    }
  };

  input.addEventListener('click', handleInputClick);
  document.addEventListener('click', handleDocumentClick);

  /**
   * 获取当前选中的日期
   * @returns 选中的日期对象或 null
   */
  const getValue = (): Date | null => {
    return selectedDate ? new Date(selectedDate.getTime()) : null;
  };

  /**
   * 设置日期
   * @param date - 要设置的日期
   */
  const setValue = (date: Date): void => {
    selectedDate = new Date(date.getTime());
    input.value = formatDate(selectedDate, dateFormat);
    viewYear = selectedDate.getFullYear();
    viewMonth = selectedDate.getMonth();
    if (isOpen) {
      renderCalendar();
    }
  };

  /**
   * 销毁日期选择器，清除 DOM 和事件
   */
  const destroy = (): void => {
    input.removeEventListener('click', handleInputClick);
    document.removeEventListener('click', handleDocumentClick);
    if (panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
    if (input.parentNode) {
      input.parentNode.removeChild(input);
    }
  };

  return { getValue, setValue, destroy };
}

export { createDatePicker };
export type { DatePickerOptions, DatePickerInstance };
