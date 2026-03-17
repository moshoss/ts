/**
 * 自定义下拉选择器模块
 * 支持单选、多选、搜索过滤和标签显示功能。
 */

/** 下拉选项接口 */
interface SelectOption {
  /** 显示文本 */
  label: string;
  /** 选项值 */
  value: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/** 下拉选择器配置选项 */
interface SelectOptions {
  /** 挂载容器元素 */
  container: HTMLElement;
  /** 可选项列表 */
  options: SelectOption[];
  /** 占位文本 */
  placeholder?: string;
  /** 是否多选模式 */
  multiple?: boolean;
  /** 是否可搜索 */
  searchable?: boolean;
  /** 值变化时的回调 */
  onChange?: (value: string | string[]) => void;
}

/** 下拉选择器返回接口 */
interface SelectInstance {
  /** 获取当前值 */
  getValue: () => string | string[];
  /** 设置当前值 */
  setValue: (value: string | string[]) => void;
  /** 销毁选择器 */
  destroy: () => void;
}

/**
 * 创建自定义下拉选择器
 * @param options - 选择器配置选项
 * @returns 选择器实例
 */
function createSelect(options: SelectOptions): SelectInstance {
  const container: HTMLElement = options.container;
  const selectOptions: SelectOption[] = [...options.options];
  const placeholder: string = options.placeholder ?? '请选择';
  const multiple: boolean = options.multiple ?? false;
  const searchable: boolean = options.searchable ?? false;
  const onChange: ((value: string | string[]) => void) | undefined = options.onChange;

  let selectedValues: string[] = [];
  let isOpen: boolean = false;
  let filterText: string = '';
  let isDestroyed: boolean = false;

  /** 触发器元素 */
  const trigger: HTMLDivElement = document.createElement('div');
  trigger.style.cssText = [
    'min-height: 34px',
    'border: 1px solid #d9d9d9',
    'border-radius: 4px',
    'padding: 4px 28px 4px 8px',
    'cursor: pointer',
    'position: relative',
    'background: #fff',
    'display: flex',
    'flex-wrap: wrap',
    'align-items: center',
    'gap: 4px',
    'font-size: 14px',
    'line-height: 1.5',
    'box-sizing: border-box',
  ].join(';');
  container.appendChild(trigger);

  /** 下拉箭头 */
  const arrow: HTMLSpanElement = document.createElement('span');
  arrow.textContent = '\u25BC';
  arrow.style.cssText = [
    'position: absolute',
    'right: 8px',
    'top: 50%',
    'transform: translateY(-50%)',
    'font-size: 10px',
    'color: #999',
    'pointer-events: none',
  ].join(';');
  trigger.appendChild(arrow);

  /** 下拉面板 */
  const dropdown: HTMLDivElement = document.createElement('div');
  dropdown.style.cssText = [
    'position: fixed',
    'z-index: 99999',
    'background: #fff',
    'border: 1px solid #d9d9d9',
    'border-radius: 4px',
    'box-shadow: 0 2px 8px rgba(0,0,0,0.15)',
    'max-height: 256px',
    'overflow-y: auto',
    'display: none',
  ].join(';');
  document.body.appendChild(dropdown);

  /** 搜索输入框 */
  let searchInput: HTMLInputElement | null = null;
  if (searchable) {
    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '搜索...';
    searchInput.style.cssText = [
      'width: 100%',
      'border: none',
      'border-bottom: 1px solid #d9d9d9',
      'padding: 8px 12px',
      'font-size: 14px',
      'outline: none',
      'box-sizing: border-box',
    ].join(';');
    dropdown.appendChild(searchInput);
  }

  /** 选项列表容器 */
  const listContainer: HTMLDivElement = document.createElement('div');
  dropdown.appendChild(listContainer);

  /**
   * 定位下拉面板
   */
  const positionDropdown = (): void => {
    const rect: DOMRect = trigger.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 2}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
  };

  /**
   * 渲染触发器内容
   */
  const renderTrigger = (): void => {
    // 清除除箭头外的子元素
    const children: Node[] = Array.from(trigger.childNodes);
    for (const child of children) {
      if (child !== arrow) {
        trigger.removeChild(child);
      }
    }

    if (selectedValues.length === 0) {
      const placeholderEl: HTMLSpanElement = document.createElement('span');
      placeholderEl.textContent = placeholder;
      placeholderEl.style.color = '#bfbfbf';
      trigger.insertBefore(placeholderEl, arrow);
      return;
    }

    if (multiple) {
      for (const val of selectedValues) {
        const opt: SelectOption | undefined = selectOptions.find(
          (o: SelectOption): boolean => o.value === val
        );
        if (!opt) {
          continue;
        }
        const tag: HTMLSpanElement = document.createElement('span');
        tag.style.cssText = [
          'display: inline-flex',
          'align-items: center',
          'background: #f0f0f0',
          'border-radius: 2px',
          'padding: 0 4px',
          'font-size: 12px',
          'line-height: 22px',
          'gap: 4px',
        ].join(';');

        const labelSpan: HTMLSpanElement = document.createElement('span');
        labelSpan.textContent = opt.label;
        tag.appendChild(labelSpan);

        const closeBtn: HTMLSpanElement = document.createElement('span');
        closeBtn.textContent = '\u00D7';
        closeBtn.style.cssText = 'cursor:pointer;font-size:14px;color:#999';
        closeBtn.addEventListener('click', (e: MouseEvent): void => {
          e.stopPropagation();
          removeValue(val);
        });
        tag.appendChild(closeBtn);

        trigger.insertBefore(tag, arrow);
      }
    } else {
      const opt: SelectOption | undefined = selectOptions.find(
        (o: SelectOption): boolean => o.value === selectedValues[0]
      );
      if (opt) {
        const labelSpan: HTMLSpanElement = document.createElement('span');
        labelSpan.textContent = opt.label;
        trigger.insertBefore(labelSpan, arrow);
      }
    }
  };

  /**
   * 移除某个已选值（多选模式）
   * @param value - 要移除的值
   */
  const removeValue = (value: string): void => {
    selectedValues = selectedValues.filter((v: string): boolean => v !== value);
    renderTrigger();
    renderList();
    if (onChange) {
      onChange(multiple ? [...selectedValues] : selectedValues[0] ?? '');
    }
  };

  /**
   * 渲染选项列表
   */
  const renderList = (): void => {
    listContainer.innerHTML = '';

    const filtered: SelectOption[] = selectOptions.filter((opt: SelectOption): boolean => {
      if (!filterText) {
        return true;
      }
      return opt.label.toLowerCase().includes(filterText.toLowerCase());
    });

    if (filtered.length === 0) {
      const empty: HTMLDivElement = document.createElement('div');
      empty.textContent = '无匹配项';
      empty.style.cssText = 'padding:8px 12px;color:#999;font-size:14px;text-align:center';
      listContainer.appendChild(empty);
      return;
    }

    for (const opt of filtered) {
      const item: HTMLDivElement = document.createElement('div');
      const isSelected: boolean = selectedValues.includes(opt.value);
      const isDisabled: boolean = opt.disabled === true;

      item.textContent = opt.label;
      item.style.cssText = [
        'padding: 8px 12px',
        `cursor: ${isDisabled ? 'not-allowed' : 'pointer'}`,
        'font-size: 14px',
        'line-height: 1.5',
        `color: ${isDisabled ? '#bfbfbf' : '#333'}`,
        `background: ${isSelected ? '#e6f7ff' : '#fff'}`,
      ].join(';');

      if (!isDisabled) {
        item.addEventListener('mouseenter', (): void => {
          if (!isSelected) {
            item.style.backgroundColor = '#f5f5f5';
          }
        });
        item.addEventListener('mouseleave', (): void => {
          item.style.backgroundColor = isSelected ? '#e6f7ff' : '#fff';
        });
        item.addEventListener('click', (): void => {
          handleSelect(opt.value);
        });
      }

      listContainer.appendChild(item);
    }
  };

  /**
   * 处理选项选中
   * @param value - 选中的值
   */
  const handleSelect = (value: string): void => {
    if (multiple) {
      const idx: number = selectedValues.indexOf(value);
      if (idx >= 0) {
        selectedValues.splice(idx, 1);
      } else {
        selectedValues.push(value);
      }
    } else {
      selectedValues = [value];
      closeDropdown();
    }

    renderTrigger();
    renderList();

    if (onChange) {
      onChange(multiple ? [...selectedValues] : selectedValues[0]);
    }
  };

  /**
   * 打开下拉面板
   */
  const openDropdown = (): void => {
    isOpen = true;
    filterText = '';
    if (searchInput) {
      searchInput.value = '';
    }
    renderList();
    positionDropdown();
    dropdown.style.display = 'block';
    trigger.style.borderColor = '#1890ff';
    if (searchInput) {
      searchInput.focus();
    }
  };

  /**
   * 关闭下拉面板
   */
  const closeDropdown = (): void => {
    isOpen = false;
    dropdown.style.display = 'none';
    trigger.style.borderColor = '#d9d9d9';
  };

  /**
   * 触发器点击事件
   */
  const handleTriggerClick = (): void => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  /**
   * 全局点击事件，用于关闭下拉
   * @param e - 鼠标事件
   */
  const handleDocumentClick = (e: MouseEvent): void => {
    const target: Node = e.target as Node;
    if (!trigger.contains(target) && !dropdown.contains(target)) {
      closeDropdown();
    }
  };

  /**
   * 搜索输入事件
   */
  const handleSearchInput = (): void => {
    if (searchInput) {
      filterText = searchInput.value;
      renderList();
    }
  };

  trigger.addEventListener('click', handleTriggerClick);
  document.addEventListener('click', handleDocumentClick);
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }

  renderTrigger();

  /**
   * 获取当前值
   * @returns 单选模式返回字符串，多选模式返回字符串数组
   */
  const getValue = (): string | string[] => {
    if (multiple) {
      return [...selectedValues];
    }
    return selectedValues[0] ?? '';
  };

  /**
   * 设置当前值
   * @param value - 要设置的值
   */
  const setValue = (value: string | string[]): void => {
    if (multiple) {
      selectedValues = Array.isArray(value) ? [...value] : [value];
    } else {
      selectedValues = Array.isArray(value) ? (value.length > 0 ? [value[0]] : []) : [value];
    }
    renderTrigger();
    renderList();
  };

  /**
   * 销毁选择器，清除所有 DOM 和事件
   */
  const destroy = (): void => {
    isDestroyed = true;
    trigger.removeEventListener('click', handleTriggerClick);
    document.removeEventListener('click', handleDocumentClick);
    if (searchInput) {
      searchInput.removeEventListener('input', handleSearchInput);
    }
    if (dropdown.parentNode) {
      dropdown.parentNode.removeChild(dropdown);
    }
    if (trigger.parentNode) {
      trigger.parentNode.removeChild(trigger);
    }
  };

  // 防止未使用变量的编译器警告
  void isDestroyed;

  return { getValue, setValue, destroy };
}

export { createSelect };
export type { SelectOption, SelectOptions, SelectInstance };
