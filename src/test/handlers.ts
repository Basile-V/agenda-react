import type { RequestHandler } from 'msw';

// Shared by the tests (msw/node) and `npm run dev:mock` (msw/browser).
export const handlers: RequestHandler[] = [];
