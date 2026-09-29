import { act } from '@testing-library/react';

// jsdom has no layout: this stand-in reports a fixed size, which tests can change.
// 1200px high, like the kata example: one hour = 100px.
const DEFAULT_SIZE = { width: 600, height: 1200 };

let size = DEFAULT_SIZE;
const observers = new Set<FakeResizeObserver>();

class FakeResizeObserver implements ResizeObserver {
  private readonly targets = new Set<Element>();
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.targets.add(target);
    observers.add(this);
    // Like the real one, report the initial size as soon as observation starts.
    this.notify([target]);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
    observers.delete(this);
  }

  notify(targets: Iterable<Element> = this.targets) {
    // Test double: only the fields our code reads are provided.
    const entries = [...targets].map(
      (target) => ({ target, contentRect: { ...size } }) as unknown as ResizeObserverEntry,
    );
    if (entries.length > 0) this.callback(entries, this);
  }
}

export function installResizeObserver() {
  globalThis.ResizeObserver = FakeResizeObserver;
}

export function resetResizeObserver() {
  size = DEFAULT_SIZE;
  observers.clear();
}

/** Simulates a resize of every observed element. */
export function resizeTo(width: number, height: number) {
  size = { width, height };
  act(() => {
    for (const observer of observers) observer.notify();
  });
}
