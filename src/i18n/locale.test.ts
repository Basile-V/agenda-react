import { afterEach, expect, test, vi } from 'vitest';
import { getLocale, setLocale, subscribeToLocale } from './locale';

afterEach(() => localStorage.clear());

test('French unless <html lang> says English', () => {
  expect(getLocale()).toBe('fr');
  document.documentElement.lang = 'en';
  expect(getLocale()).toBe('en');
  document.documentElement.lang = 'de';
  expect(getLocale()).toBe('fr');
});

test('setLocale updates <html lang>, remembers the choice and notifies', () => {
  const listener = vi.fn();
  const unsubscribe = subscribeToLocale(listener);

  setLocale('en');
  expect(document.documentElement).toHaveAttribute('lang', 'en');
  expect(localStorage.getItem('locale')).toBe('en');
  expect(listener).toHaveBeenCalledTimes(1);

  unsubscribe();
  setLocale('fr');
  expect(getLocale()).toBe('fr');
  expect(listener).toHaveBeenCalledTimes(1);
});

test('still switches when the storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError');
  });
  setLocale('en');
  expect(getLocale()).toBe('en');
});
