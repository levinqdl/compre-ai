import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SelectionActionManager } from '../src/helpers/selectionActionManager';
import { JSDOM } from 'jsdom';

describe('SelectionActionManager', () => {
  let manager;
  let onSelectionReadyMock;
  let dom;
  let originalSetTimeout;
  let originalClearTimeout;

  beforeEach(() => {
    vi.useFakeTimers();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document;
    
    onSelectionReadyMock = vi.fn();
    manager = new SelectionActionManager(onSelectionReadyMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialize', () => {
    it('should bind event listeners', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      manager.initialize();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function));
    });
  });

  describe('shouldBlockSelection', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should return true when mouse is down', () => {
      document.dispatchEvent(new dom.window.Event('mousedown'));
      expect(manager.shouldBlockSelection()).toBe(true);
    });

    it('should return true when context menu is open', () => {
      document.dispatchEvent(new dom.window.Event('contextmenu'));
      expect(manager.shouldBlockSelection()).toBe(true);
    });

    it('should return false when neither condition is met', () => {
      expect(manager.shouldBlockSelection()).toBe(false);
    });
  });

  describe('isActiveSelection', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should return true when mouse is down', () => {
      document.dispatchEvent(new dom.window.Event('mousedown'));
      expect(manager.isActiveSelection()).toBe(true);
    });

    it('should return false when mouse is up', () => {
      expect(manager.isActiveSelection()).toBe(false);
    });

    it('should return false after mouse up', () => {
      document.dispatchEvent(new dom.window.Event('mousedown'));
      document.dispatchEvent(new dom.window.Event('mouseup'));
      expect(manager.isActiveSelection()).toBe(false);
    });
  });

  describe('isContextMenuOpen', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should return true after contextmenu event', () => {
      document.dispatchEvent(new dom.window.Event('contextmenu'));
      expect(manager.isContextMenuOpen()).toBe(true);
    });

    it('should return false by default', () => {
      expect(manager.isContextMenuOpen()).toBe(false);
    });

    it('should return false after timeout', () => {
      document.dispatchEvent(new dom.window.Event('contextmenu'));
      expect(manager.isContextMenuOpen()).toBe(true);
      
      vi.advanceTimersByTime(500);
      expect(manager.isContextMenuOpen()).toBe(false);
    });
  });

  describe('cancelPendingSelection', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should cancel pending selection timeout', () => {
      document.dispatchEvent(new dom.window.Event('mousedown'));
      document.dispatchEvent(new dom.window.Event('selectionchange'));
      document.dispatchEvent(new dom.window.Event('mouseup'));
      
      manager.cancelPendingSelection();
      
      vi.advanceTimersByTime(300);
      expect(onSelectionReadyMock).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should reset all internal state', () => {
      document.dispatchEvent(new dom.window.Event('mousedown'));
      document.dispatchEvent(new dom.window.Event('contextmenu'));
      
      manager.reset();
      
      expect(manager.isActiveSelection()).toBe(false);
      expect(manager.isContextMenuOpen()).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should handle normal text selection flow', () => {
      document.dispatchEvent(new dom.window.Event('mousedown'));
      document.dispatchEvent(new dom.window.Event('selectionchange'));
      document.dispatchEvent(new dom.window.Event('selectionchange'));
      document.dispatchEvent(new dom.window.Event('mouseup'));
      
      vi.advanceTimersByTime(300);
      
      expect(onSelectionReadyMock).toHaveBeenCalledTimes(1);
    });

    it('should handle normal click without selection', () => {
      document.dispatchEvent(new dom.window.Event('mousedown'));
      document.dispatchEvent(new dom.window.Event('mouseup'));
      
      vi.advanceTimersByTime(300);
      
      expect(onSelectionReadyMock).not.toHaveBeenCalled();
    });

    it('should block selection events during mouse drag', () => {
      document.dispatchEvent(new dom.window.Event('mousedown'));
      
      expect(manager.shouldBlockSelection()).toBe(true);
      
      document.dispatchEvent(new dom.window.Event('selectionchange'));
      vi.advanceTimersByTime(300);
      
      expect(onSelectionReadyMock).not.toHaveBeenCalled();
    });

    it('should handle context menu blocking', () => {
      document.dispatchEvent(new dom.window.Event('contextmenu'));
      document.dispatchEvent(new dom.window.Event('selectionchange'));
      
      vi.advanceTimersByTime(300);
      
      expect(onSelectionReadyMock).not.toHaveBeenCalled();
    });

    it('should debounce multiple selection changes', () => {
      document.dispatchEvent(new dom.window.Event('selectionchange'));
      vi.advanceTimersByTime(100);
      
      document.dispatchEvent(new dom.window.Event('selectionchange'));
      vi.advanceTimersByTime(100);
      
      document.dispatchEvent(new dom.window.Event('selectionchange'));
      vi.advanceTimersByTime(300);
      
      expect(onSelectionReadyMock).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple selection actions', () => {
      document.dispatchEvent(new dom.window.Event('mousedown'));
      document.dispatchEvent(new dom.window.Event('selectionchange'));
      document.dispatchEvent(new dom.window.Event('mouseup'));
      vi.advanceTimersByTime(300);
      
      document.dispatchEvent(new dom.window.Event('mousedown'));
      document.dispatchEvent(new dom.window.Event('selectionchange'));
      document.dispatchEvent(new dom.window.Event('mouseup'));
      vi.advanceTimersByTime(300);
      
      expect(onSelectionReadyMock).toHaveBeenCalledTimes(2);
    });
  });
});
