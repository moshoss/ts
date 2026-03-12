export type PopoverPlacement = 'top' | 'right' | 'bottom' | 'left';
export type PopoverAlign = 'start' | 'center' | 'end';
export type PopoverTriggerMode = 'click' | 'hover';

export interface PopoverOptions {
  trigger: HTMLElement;
  content: HTMLElement;
  placement?: PopoverPlacement;
  align?: PopoverAlign;
  triggerMode?: PopoverTriggerMode;
  offset?: number;
  openDelay?: number;
  closeDelay?: number;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  matchTriggerWidth?: boolean;
  destroyOnHidden?:boolean
  initialOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

interface Size {
  width: number;
  height: number;
}

interface Position {
  top: number;
  left: number;
  placement: PopoverPlacement;
}

interface AttributeSnapshot {
  expanded: string | null;
  controls: string | null;
  hidden: string | null;
  role: string | null;
}

interface StyleSnapshot {
  position: string;
  top: string;
  left: string;
  display: string;
  visibility: string;
  zIndex: string;
  minWidth: string;
}

type ResolvedPopoverOptions = Required<Omit<PopoverOptions, 'onOpen' | 'onClose'>> &
  Pick<PopoverOptions, 'onOpen' | 'onClose'>;

const DEFAULT_OPTIONS: Required<Omit<PopoverOptions, 'trigger' | 'content' | 'onOpen' | 'onClose'>> = {
  placement: 'bottom',
  align: 'center',
  triggerMode: 'click',
  offset: 8,
  openDelay: 80,
  closeDelay: 120,
  closeOnOutsideClick: true,
  closeOnEscape: true,
  matchTriggerWidth: false,
  destroyOnHidden: true,
  initialOpen: false,
};

const VIEWPORT_PADDING = 8;

let popoverId = 0;

function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function getOppositePlacement(placement: PopoverPlacement): PopoverPlacement {
  switch (placement) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

function restoreAttribute(element: HTMLElement, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
    return;
  }

  element.setAttribute(name, value);
}

export class Popover {
  private readonly options: ResolvedPopoverOptions;
  private readonly originalAttributes: AttributeSnapshot;
  private readonly originalStyles: StyleSnapshot;

  private isOpen = false;
  private openTimer: number | null = null;
  private closeTimer: number | null = null;

  private readonly handleTriggerClick = (): void => {
    if (!this.supportsClick()) {
      return;
    }

    this.toggle();
  };

  private readonly handleTriggerPointerEnter = (): void => {
    if (!this.supportsHover()) {
      return;
    }

    this.clearCloseTimer();
    this.scheduleOpen();
  };

  private readonly handleTriggerPointerLeave = (event: PointerEvent): void => {
    if (!this.supportsHover()) {
      return;
    }

    if (this.isMovingBetweenPopoverElements(event)) {
      return;
    }

    this.scheduleClose();
  };

  private readonly handleContentPointerEnter = (): void => {
    if (!this.supportsHover()) {
      return;
    }

    this.clearCloseTimer();
  };

  private readonly handleContentPointerLeave = (event: PointerEvent): void => {
    if (!this.supportsHover()) {
      return;
    }

    if (this.isMovingBetweenPopoverElements(event)) {
      return;
    }

    this.scheduleClose();
  };

  private readonly handleDocumentPointerDown = (event: Event): void => {
    if (!this.isOpen || !this.options.closeOnOutsideClick) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (this.options.trigger.contains(target) || this.options.content.contains(target)) {
      return;
    }

    this.close();
  };

  private readonly handleDocumentKeydown = (event: KeyboardEvent): void => {
    if (!this.isOpen || !this.options.closeOnEscape) {
      return;
    }

    if (event.key === 'Escape') {
      this.close();
    }
  };

  private readonly handleViewportChange = (): void => {
    if (!this.isOpen) {
      return;
    }

    this.position();
  };

  constructor(options: PopoverOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    this.originalAttributes = {
      expanded: options.trigger.getAttribute('aria-expanded'),
      controls: options.trigger.getAttribute('aria-controls'),
      hidden: options.content.getAttribute('aria-hidden'),
      role: options.content.getAttribute('role'),
    };

    this.originalStyles = {
      position: options.content.style.position,
      top: options.content.style.top,
      left: options.content.style.left,
      display: options.content.style.display,
      visibility: options.content.style.visibility,
      zIndex: options.content.style.zIndex,
      minWidth: options.content.style.minWidth,
    };

    this.setupAria();
    this.setupContent();
    this.bindEvents();

    if (this.options.initialOpen) {
      this.open();
    }
  }

  get openState(): boolean {
    return this.isOpen;
  }

  open(): void {
    this.clearTimers();

    if (this.isOpen) {
      this.position();
      return;
    }

    if(!document.body.contains(this.options.content)) {
      document.body.appendChild(this.options.content)
    }

  
    this.isOpen = true;
    this.options.trigger.setAttribute('aria-expanded', 'true');
    this.options.content.setAttribute('aria-hidden', 'false');
    this.options.content.style.display = 'block';
    this.options.content.style.visibility = 'hidden';

    this.position();

    this.options.content.style.visibility = 'visible';
    this.options.content.dataset.popoverOpen = 'true';

    document.addEventListener('pointerdown', this.handleDocumentPointerDown, true);
    document.addEventListener('keydown', this.handleDocumentKeydown);
    window.addEventListener('resize', this.handleViewportChange);
    window.addEventListener('scroll', this.handleViewportChange, true);

    this.options.onOpen?.();
  }

  close(): void {
    this.clearTimers();

    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.options.trigger.setAttribute('aria-expanded', 'false');
    this.options.content.setAttribute('aria-hidden', 'true');
    this.options.content.style.display = 'none';
    this.options.content.style.visibility = 'hidden';
    delete this.options.content.dataset.popoverOpen;

    document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true);
    document.removeEventListener('keydown', this.handleDocumentKeydown);
    window.removeEventListener('resize', this.handleViewportChange);
    window.removeEventListener('scroll', this.handleViewportChange, true);

    if(this.options.destroyOnHidden) {
       this.options.content.remove?.()
    }

    this.options.onClose?.();
  }

  toggle(force?: boolean): void {
    const nextOpen = typeof force === 'boolean' ? force : !this.isOpen;

    if (nextOpen) {
      this.open();
      return;
    }

    this.close();
  }

  position(): void {
    if (!this.isOpen) {
      return;
    }

    const triggerRect = this.options.trigger.getBoundingClientRect();

    if (this.options.matchTriggerWidth) {
      this.options.content.style.minWidth = `${Math.round(triggerRect.width)}px`;
    }

    const popoverSize = this.measureContent();
    const { top, left, placement } = this.computePosition(triggerRect, popoverSize);

    this.options.content.style.top = `${Math.round(top)}px`;
    this.options.content.style.left = `${Math.round(left)}px`;
    this.options.content.dataset.popoverPlacement = placement;
  }

  destroy(): void {
    this.clearTimers();
    this.close();
    this.unbindEvents();

    restoreAttribute(this.options.trigger, 'aria-expanded', this.originalAttributes.expanded);
    restoreAttribute(this.options.trigger, 'aria-controls', this.originalAttributes.controls);
    restoreAttribute(this.options.content, 'aria-hidden', this.originalAttributes.hidden);
    restoreAttribute(this.options.content, 'role', this.originalAttributes.role);

    this.options.content.style.position = this.originalStyles.position;
    this.options.content.style.top = this.originalStyles.top;
    this.options.content.style.left = this.originalStyles.left;
    this.options.content.style.display = this.originalStyles.display;
    this.options.content.style.visibility = this.originalStyles.visibility;
    this.options.content.style.zIndex = this.originalStyles.zIndex;
    this.options.content.style.minWidth = this.originalStyles.minWidth;
    delete this.options.content.dataset.popoverOpen;
    delete this.options.content.dataset.popoverPlacement;
  }

  private setupAria(): void {
    if (!this.options.content.id) {
      popoverId += 1;
      this.options.content.id = `popover-${popoverId}`;
    }

    this.options.trigger.setAttribute('aria-expanded', 'false');
    this.options.trigger.setAttribute('aria-controls', this.options.content.id);
    
    this.options.content.setAttribute('role', this.options.content.getAttribute('role') ?? 'dialog');
    this.options.content.setAttribute('aria-hidden', 'true');
  }

  private setupContent(): void {
    this.options.content.style.position = 'fixed';
    this.options.content.style.top = '0';
    this.options.content.style.left = '0';
    this.options.content.style.display = 'none';
    this.options.content.style.visibility = 'hidden';

    if (!this.options.content.style.zIndex) {
      this.options.content.style.zIndex = '1000';
    }
  }

  private bindEvents(): void {
    if (this.supportsClick()) {
      this.options.trigger.addEventListener('click', this.handleTriggerClick);
    }

    if (this.supportsHover()) {
      this.options.trigger.addEventListener('pointerenter', this.handleTriggerPointerEnter);
      this.options.trigger.addEventListener('pointerleave', this.handleTriggerPointerLeave);
      this.options.content.addEventListener('pointerenter', this.handleContentPointerEnter);
      this.options.content.addEventListener('pointerleave', this.handleContentPointerLeave);
    }
  }

  private unbindEvents(): void {
    this.options.trigger.removeEventListener('click', this.handleTriggerClick);
    this.options.trigger.removeEventListener('pointerenter', this.handleTriggerPointerEnter);
    this.options.trigger.removeEventListener('pointerleave', this.handleTriggerPointerLeave);
    this.options.content.removeEventListener('pointerenter', this.handleContentPointerEnter);
    this.options.content.removeEventListener('pointerleave', this.handleContentPointerLeave);
  }

  private supportsClick(): boolean {
    return this.options.triggerMode === 'click';
  }

  private supportsHover(): boolean {
    return this.options.triggerMode === 'hover';
  }

  private scheduleOpen(): void {
    this.clearCloseTimer();

    if (this.isOpen) {
      this.position();
      return;
    }

    if (this.options.openDelay <= 0) {
      this.open();
      return;
    }

    this.clearOpenTimer();
    this.openTimer = window.setTimeout(() => {
      this.openTimer = null;
      this.open();
    }, this.options.openDelay);
  }

  private scheduleClose(): void {
    this.clearOpenTimer();

    if (!this.isOpen && this.closeTimer === null) {
      return;
    }

    if (this.options.closeDelay <= 0) {
      this.close();
      return;
    }

    this.clearCloseTimer();
    this.closeTimer = window.setTimeout(() => {
      this.closeTimer = null;
      this.close();
    }, this.options.closeDelay);
  }

  private clearOpenTimer(): void {
    if (this.openTimer !== null) {
      window.clearTimeout(this.openTimer);
      this.openTimer = null;
    }
  }

  private clearCloseTimer(): void {
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearOpenTimer();
    this.clearCloseTimer();
  }

  private isMovingBetweenPopoverElements(event: PointerEvent): boolean {
    const nextTarget = event.relatedTarget;

    if (!(nextTarget instanceof Node)) {
      return false;
    }

    return this.options.trigger.contains(nextTarget) || this.options.content.contains(nextTarget);
  }

  private measureContent(): Size {
    const rect = this.options.content.getBoundingClientRect();

    return {
      width: rect.width,
      height: rect.height,
    };
  }

  private computePosition(triggerRect: DOMRect, size: Size): Position {
    const preferredPlacement = this.resolvePlacement(triggerRect, size);
    const basePosition = this.calculateCoordinates(triggerRect, size, preferredPlacement);

    return {
      top: clamp(
        basePosition.top,
        VIEWPORT_PADDING,
        window.innerHeight - size.height - VIEWPORT_PADDING,
      ),
      left: clamp(
        basePosition.left,
        VIEWPORT_PADDING,
        window.innerWidth - size.width - VIEWPORT_PADDING,
      ),
      placement: preferredPlacement,
    };
  }

  private resolvePlacement(triggerRect: DOMRect, size: Size): PopoverPlacement {
    const preferred = this.options.placement;

    if (this.fitsPlacement(triggerRect, size, preferred)) {
      return preferred;
    }

    const opposite = getOppositePlacement(preferred);

    if (this.fitsPlacement(triggerRect, size, opposite)) {
      return opposite;
    }

    return preferred;
  }

  private fitsPlacement(triggerRect: DOMRect, size: Size, placement: PopoverPlacement): boolean {
    switch (placement) {
      case 'top':
        return triggerRect.top >= size.height + this.options.offset + VIEWPORT_PADDING;
      case 'bottom':
        return (
          window.innerHeight - triggerRect.bottom >=
          size.height + this.options.offset + VIEWPORT_PADDING
        );
      case 'left':
        return triggerRect.left >= size.width + this.options.offset + VIEWPORT_PADDING;
      case 'right':
        return (
          window.innerWidth - triggerRect.right >=
          size.width + this.options.offset + VIEWPORT_PADDING
        );
    }
  }

  private calculateCoordinates(
    triggerRect: DOMRect,
    size: Size,
    placement: PopoverPlacement,
  ): Omit<Position, 'placement'> {
    switch (placement) {
      case 'top':
        return {
          top: triggerRect.top - size.height - this.options.offset,
          left: this.computeCrossAxisOffset(triggerRect, size, 'horizontal'),
        };
      case 'bottom':
        return {
          top: triggerRect.bottom + this.options.offset,
          left: this.computeCrossAxisOffset(triggerRect, size, 'horizontal'),
        };
      case 'left':
        return {
          top: this.computeCrossAxisOffset(triggerRect, size, 'vertical'),
          left: triggerRect.left - size.width - this.options.offset,
        };
      case 'right':
        return {
          top: this.computeCrossAxisOffset(triggerRect, size, 'vertical'),
          left: triggerRect.right + this.options.offset,
        };
    }
  }

  private computeCrossAxisOffset(
    triggerRect: DOMRect,
    size: Size,
    axis: 'horizontal' | 'vertical',
  ): number {
    if (axis === 'horizontal') {
      switch (this.options.align) {
        case 'start':
          return triggerRect.left;
        case 'center':
          return triggerRect.left + (triggerRect.width - size.width) / 2;
        case 'end':
          return triggerRect.right - size.width;
      }
    }

    switch (this.options.align) {
      case 'start':
        return triggerRect.top;
      case 'center':
        return triggerRect.top + (triggerRect.height - size.height) / 2;
      case 'end':
        return triggerRect.bottom - size.height;
    }
  }
}

export function createPopover(options: PopoverOptions): Popover {
  return new Popover(options);
}
