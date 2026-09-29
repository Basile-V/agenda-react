import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

afterEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});

test('light by default', () => {
  render(<ThemeToggle />);
  expect(screen.getByRole('button', { name: 'Thème sombre' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(document.documentElement).not.toHaveAttribute('data-theme');
});

test('switches to dark and back, remembering the choice', async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);
  const toggle = screen.getByRole('button', { name: 'Thème sombre' });

  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(localStorage.getItem('theme')).toBe('dark');

  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(document.documentElement).not.toHaveAttribute('data-theme');
  expect(localStorage.getItem('theme')).toBe('light');
});

test('reflects a dark theme applied before React started', () => {
  document.documentElement.dataset.theme = 'dark';
  render(<ThemeToggle />);
  expect(screen.getByRole('button', { name: 'Thème sombre' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
