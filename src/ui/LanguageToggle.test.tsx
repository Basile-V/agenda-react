import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';

test('offers the other language, in that language', async () => {
  const user = userEvent.setup();
  render(<LanguageToggle />);

  const toEnglish = screen.getByRole('button', { name: 'Switch to English' });
  expect(toEnglish).toHaveTextContent('en');
  expect(toEnglish).toHaveAttribute('lang', 'en');

  await user.click(toEnglish);
  expect(document.documentElement).toHaveAttribute('lang', 'en');
  const toFrench = screen.getByRole('button', { name: 'Passer en français' });
  expect(toFrench).toHaveAttribute('lang', 'fr');

  await user.click(toFrench);
  expect(document.documentElement).toHaveAttribute('lang', 'fr');
  expect(screen.getByRole('button', { name: 'Switch to English' })).toBeVisible();
});

test('translates the components already on screen', async () => {
  const user = userEvent.setup();
  render(
    <>
      <LanguageToggle />
      <ThemeToggle />
    </>,
  );
  expect(screen.getByRole('button', { name: 'Thème sombre' })).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Switch to English' }));
  expect(screen.getByRole('button', { name: 'Dark theme' })).toBeVisible();
});
