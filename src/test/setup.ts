import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { resetDb } from './db';
import { clearXsrfCookie } from './handlers';
import { installResizeObserver, resetResizeObserver } from './resizeObserver';
import { server } from './server';

// jsdom implements neither <dialog> modality nor ResizeObserver.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  if (!this.open) return;
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

installResizeObserver();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => resetDb());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  clearXsrfCookie();
  resetResizeObserver();
});
afterAll(() => server.close());
