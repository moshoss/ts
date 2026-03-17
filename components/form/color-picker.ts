/**
 * 颜色选择器模块
 * 提供色相条、饱和度/亮度二维区域和十六进制输入的颜色选择面板。
 */

/** 颜色选择器配置选项 */
interface ColorPickerOptions {
  /** 挂载容器元素 */
  container: HTMLElement;
  /** 初始颜色值（十六进制），默认 '#000000' */
  value?: string;
  /** 颜色变化时的回调 */
  onChange?: (color: string) => void;
}

/** 颜色选择器返回接口 */
interface ColorPickerInstance {
  /** 获取当前颜色值 */
  getValue: () => string;
  /** 设置颜色值 */
  setValue: (color: string) => void;
  /** 销毁颜色选择器 */
  destroy: () => void;
}

/** HSV 颜色模型 */
interface HSV {
  /** 色相 0-360 */
  h: number;
  /** 饱和度 0-1 */
  s: number;
  /** 明度 0-1 */
  v: number;
}

/**
 * 将十六进制颜色转为 HSV
 * @param hex - 十六进制颜色字符串
 * @returns HSV 对象
 */
function hexToHsv(hex: string): HSV {
  const cleaned: string = hex.replace('#', '');
  const r: number = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g: number = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b: number = parseInt(cleaned.substring(4, 6), 16) / 255;

  const max: number = Math.max(r, g, b);
  const min: number = Math.min(r, g, b);
  const delta: number = max - min;

  let h: number = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  if (h < 0) {
    h += 360;
  }

  const s: number = max === 0 ? 0 : delta / max;
  const v: number = max;

  return { h, s, v };
}

/**
 * 将 HSV 转为十六进制颜色
 * @param hsv - HSV 对象
 * @returns 十六进制颜色字符串
 */
function hsvToHex(hsv: HSV): string {
  const { h, s, v } = hsv;
  const c: number = v * s;
  const x: number = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m: number = v - c;

  let r: number = 0;
  let g: number = 0;
  let b: number = 0;

  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number): string => {
    const val: number = Math.round((n + m) * 255);
    return val.toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 将色相值转为 CSS 颜色（用于背景渲染）
 * @param h - 色相 0-360
 * @returns CSS 颜色字符串
 */
function hueToColor(h: number): string {
  return hsvToHex({ h, s: 1, v: 1 });
}

/**
 * 创建颜色选择器
 * @param options - 颜色选择器配置
 * @returns 颜色选择器实例
 */
function createColorPicker(options: ColorPickerOptions): ColorPickerInstance {
  const container: HTMLElement = options.container;
  const onChange: ((color: string) => void) | undefined = options.onChange;

  let currentHsv: HSV = hexToHsv(options.value ?? '#000000');
  let currentHex: string = options.value ?? '#000000';
  let isOpen: boolean = false;
  let isDraggingSV: boolean = false;
  let isDraggingHue: boolean = false;

  /** 色块触发器 */
  const swatch: HTMLDivElement = document.createElement('div');
  swatch.style.cssText = [
    'width: 36px',
    'height: 36px',
    'border: 1px solid #d9d9d9',
    'border-radius: 4px',
    'cursor: pointer',
    `background: ${currentHex}`,
  ].join(';');
  container.appendChild(swatch);

  /** 选色面板 */
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
    'width: 240px',
  ].join(';');
  document.body.appendChild(panel);

  /** 饱和度/亮度二维区域 */
  const svArea: HTMLDivElement = document.createElement('div');
  const SV_WIDTH: number = 216;
  const SV_HEIGHT: number = 150;
  svArea.style.cssText = [
    `width: ${SV_WIDTH}px`,
    `height: ${SV_HEIGHT}px`,
    'position: relative',
    'cursor: crosshair',
    'border-radius: 2px',
    'margin-bottom: 8px',
  ].join(';');
  panel.appendChild(svArea);

  /** SV区域的渐变背景 */
  const svWhite: HTMLDivElement = document.createElement('div');
  svWhite.style.cssText = [
    'position: absolute',
    'inset: 0',
    'background: linear-gradient(to right, #fff, transparent)',
    'border-radius: 2px',
  ].join(';');
  svArea.appendChild(svWhite);

  const svBlack: HTMLDivElement = document.createElement('div');
  svBlack.style.cssText = [
    'position: absolute',
    'inset: 0',
    'background: linear-gradient(to bottom, transparent, #000)',
    'border-radius: 2px',
  ].join(';');
  svArea.appendChild(svBlack);

  /** SV 指示器 */
  const svCursor: HTMLDivElement = document.createElement('div');
  svCursor.style.cssText = [
    'position: absolute',
    'width: 12px',
    'height: 12px',
    'border: 2px solid #fff',
    'border-radius: 50%',
    'box-shadow: 0 0 2px rgba(0,0,0,0.5)',
    'transform: translate(-50%, -50%)',
    'pointer-events: none',
  ].join(';');
  svArea.appendChild(svCursor);

  /** 色相条 */
  const hueBar: HTMLDivElement = document.createElement('div');
  const HUE_HEIGHT: number = 14;
  hueBar.style.cssText = [
    `width: ${SV_WIDTH}px`,
    `height: ${HUE_HEIGHT}px`,
    'position: relative',
    'cursor: pointer',
    'border-radius: 2px',
    'margin-bottom: 8px',
    'background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
  ].join(';');
  panel.appendChild(hueBar);

  /** 色相指示器 */
  const hueCursor: HTMLDivElement = document.createElement('div');
  hueCursor.style.cssText = [
    'position: absolute',
    'top: -2px',
    'width: 6px',
    'height: 18px',
    'border: 2px solid #fff',
    'border-radius: 2px',
    'box-shadow: 0 0 2px rgba(0,0,0,0.5)',
    'transform: translateX(-50%)',
    'pointer-events: none',
  ].join(';');
  hueBar.appendChild(hueCursor);

  /** 十六进制输入 */
  const hexRow: HTMLDivElement = document.createElement('div');
  hexRow.style.cssText = 'display:flex;align-items:center;gap:8px';

  const hexLabel: HTMLSpanElement = document.createElement('span');
  hexLabel.textContent = 'HEX';
  hexLabel.style.cssText = 'font-size:12px;color:#666';
  hexRow.appendChild(hexLabel);

  const hexInput: HTMLInputElement = document.createElement('input');
  hexInput.type = 'text';
  hexInput.maxLength = 7;
  hexInput.style.cssText = [
    'flex: 1',
    'height: 28px',
    'border: 1px solid #d9d9d9',
    'border-radius: 2px',
    'padding: 0 6px',
    'font-size: 13px',
    'font-family: monospace',
    'outline: none',
    'box-sizing: border-box',
  ].join(';');
  hexRow.appendChild(hexInput);
  panel.appendChild(hexRow);

  /**
   * 更新界面，使之与当前 HSV 状态一致
   */
  const updateUI = (): void => {
    currentHex = hsvToHex(currentHsv);
    swatch.style.background = currentHex;

    // SV 区域底色
    svArea.style.background = hueToColor(currentHsv.h);

    // SV 指示器位置
    svCursor.style.left = `${currentHsv.s * SV_WIDTH}px`;
    svCursor.style.top = `${(1 - currentHsv.v) * SV_HEIGHT}px`;

    // 色相指示器位置
    hueCursor.style.left = `${(currentHsv.h / 360) * SV_WIDTH}px`;

    // 十六进制输入
    hexInput.value = currentHex;
  };

  /**
   * 通知颜色变化
   */
  const notifyChange = (): void => {
    if (onChange) {
      onChange(currentHex);
    }
  };

  /**
   * 定位面板
   */
  const positionPanel = (): void => {
    const rect: DOMRect = swatch.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 4}px`;
    panel.style.left = `${rect.left}px`;
  };

  /**
   * 处理 SV 区域拖拽
   * @param e - 鼠标事件
   */
  const handleSVDrag = (e: MouseEvent): void => {
    const rect: DOMRect = svArea.getBoundingClientRect();
    const x: number = Math.max(0, Math.min(e.clientX - rect.left, SV_WIDTH));
    const y: number = Math.max(0, Math.min(e.clientY - rect.top, SV_HEIGHT));
    currentHsv.s = x / SV_WIDTH;
    currentHsv.v = 1 - y / SV_HEIGHT;
    updateUI();
    notifyChange();
  };

  /**
   * 处理色相条拖拽
   * @param e - 鼠标事件
   */
  const handleHueDrag = (e: MouseEvent): void => {
    const rect: DOMRect = hueBar.getBoundingClientRect();
    const x: number = Math.max(0, Math.min(e.clientX - rect.left, SV_WIDTH));
    currentHsv.h = (x / SV_WIDTH) * 360;
    updateUI();
    notifyChange();
  };

  /**
   * SV 区域鼠标按下
   * @param e - 鼠标事件
   */
  const handleSVMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    isDraggingSV = true;
    handleSVDrag(e);
  };

  /**
   * 色相条鼠标按下
   * @param e - 鼠标事件
   */
  const handleHueMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    isDraggingHue = true;
    handleHueDrag(e);
  };

  /**
   * 全局鼠标移动
   * @param e - 鼠标事件
   */
  const handleMouseMove = (e: MouseEvent): void => {
    if (isDraggingSV) {
      handleSVDrag(e);
    }
    if (isDraggingHue) {
      handleHueDrag(e);
    }
  };

  /**
   * 全局鼠标松开
   */
  const handleMouseUp = (): void => {
    isDraggingSV = false;
    isDraggingHue = false;
  };

  /**
   * 十六进制输入变化
   */
  const handleHexChange = (): void => {
    const val: string = hexInput.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      currentHsv = hexToHsv(val);
      updateUI();
      notifyChange();
    }
  };

  /**
   * 色块点击切换面板
   */
  const handleSwatchClick = (): void => {
    if (isOpen) {
      panel.style.display = 'none';
      isOpen = false;
    } else {
      positionPanel();
      panel.style.display = 'block';
      isOpen = true;
      updateUI();
    }
  };

  /**
   * 全局点击关闭面板
   * @param e - 鼠标事件
   */
  const handleDocumentClick = (e: MouseEvent): void => {
    const target: Node = e.target as Node;
    if (!swatch.contains(target) && !panel.contains(target)) {
      panel.style.display = 'none';
      isOpen = false;
    }
  };

  swatch.addEventListener('click', handleSwatchClick);
  svArea.addEventListener('mousedown', handleSVMouseDown);
  hueBar.addEventListener('mousedown', handleHueMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('click', handleDocumentClick);
  hexInput.addEventListener('input', handleHexChange);

  updateUI();

  /**
   * 获取当前颜色值
   * @returns 十六进制颜色字符串
   */
  const getValue = (): string => {
    return currentHex;
  };

  /**
   * 设置颜色值
   * @param color - 十六进制颜色字符串
   */
  const setValue = (color: string): void => {
    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      currentHsv = hexToHsv(color);
      updateUI();
    }
  };

  /**
   * 销毁颜色选择器，清除 DOM 和事件
   */
  const destroy = (): void => {
    swatch.removeEventListener('click', handleSwatchClick);
    svArea.removeEventListener('mousedown', handleSVMouseDown);
    hueBar.removeEventListener('mousedown', handleHueMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('click', handleDocumentClick);
    hexInput.removeEventListener('input', handleHexChange);
    if (panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
    if (swatch.parentNode) {
      swatch.parentNode.removeChild(swatch);
    }
  };

  return { getValue, setValue, destroy };
}

export { createColorPicker };
export type { ColorPickerOptions, ColorPickerInstance };
