export class SelectionActionManager {
  private isMouseDown = false;
  private selectionChangeFired = false;
  private contextMenuOpen = false;
  private contextMenuTimeout: ReturnType<typeof setTimeout> | null = null;
  private selectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private onSelectionReady: (() => void) | null = null;
  private readonly CONTEXT_MENU_DELAY = 500;
  private readonly SELECTION_DEBOUNCE_DELAY = 300;

  constructor(onSelectionReady: () => void) {
    this.onSelectionReady = onSelectionReady;
  }

  initialize(): void {
    this.bindListeners();
  }

  private bindListeners(): void {
    document.addEventListener('mousedown', () => this.handleMouseDown());
    document.addEventListener('mouseup', () => this.handleMouseUp());
    document.addEventListener('contextmenu', () => this.handleContextMenu());
    document.addEventListener('selectionchange', () => this.handleSelectionChange());
  }

  private handleMouseDown(): void {
    this.isMouseDown = true;
    this.selectionChangeFired = false;
  }

  private handleMouseUp(): void {
    this.isMouseDown = false;
    if (this.selectionChangeFired && this.onSelectionReady) {
      this.debounceSelection();
    }
    this.selectionChangeFired = false;
  }

  private handleContextMenu(): void {
    this.contextMenuOpen = true;
    
    if (this.contextMenuTimeout) {
      clearTimeout(this.contextMenuTimeout);
    }
    
    this.contextMenuTimeout = setTimeout(() => {
      this.contextMenuOpen = false;
    }, this.CONTEXT_MENU_DELAY);
  }

  private handleSelectionChange(): void {
    if (this.isMouseDown) {
      this.selectionChangeFired = true;
      return;
    }

    if (this.contextMenuOpen) {
      return;
    }

    this.debounceSelection();
  }

  private debounceSelection(): void {
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }

    this.selectionTimeout = setTimeout(() => {
      if (this.onSelectionReady) {
        this.onSelectionReady();
      }
    }, this.SELECTION_DEBOUNCE_DELAY);
  }

  shouldBlockSelection(): boolean {
    return this.isMouseDown || this.contextMenuOpen;
  }

  isActiveSelection(): boolean {
    return this.isMouseDown;
  }

  isContextMenuOpen(): boolean {
    return this.contextMenuOpen;
  }

  cancelPendingSelection(): void {
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
      this.selectionTimeout = null;
    }
  }

  reset(): void {
    this.isMouseDown = false;
    this.selectionChangeFired = false;
    this.contextMenuOpen = false;
    this.cancelPendingSelection();
    
    if (this.contextMenuTimeout) {
      clearTimeout(this.contextMenuTimeout);
      this.contextMenuTimeout = null;
    }
  }

  destroy(): void {
    this.reset();
  }
}
