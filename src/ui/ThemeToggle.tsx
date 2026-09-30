import { useState } from 'react';
import { useMessages } from '../i18n/useLocale';
import { IconButton } from './IconButton';
import { DarkModeIcon, LightModeIcon } from './icons';

// Also read by the inline script of index.html, which applies the theme before the first paint.
const STORAGE_KEY = 'theme';

function isDarkApplied() {
  return document.documentElement.dataset.theme === 'dark';
}

/** Light / dark switch. The <html data-theme> attribute is the source of truth. */
export function ThemeToggle() {
  const t = useMessages();
  const [isDark, setIsDark] = useState(isDarkApplied);

  function toggle() {
    const dark = !isDark;
    if (dark) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      // Storage unavailable: the choice simply lasts until the page is reloaded.
    }
    setIsDark(dark);
  }

  return (
    <IconButton aria-label={t.common.darkTheme} aria-pressed={isDark} onClick={toggle}>
      {isDark ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  );
}
