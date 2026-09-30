import { setLocale, type Locale } from '../i18n/locale';
import { useLocale } from '../i18n/useLocale';
import { IconButton } from './IconButton';
import styles from './LanguageToggle.module.scss';

// Written in the language it switches to: whoever needs the button cannot read the current one.
const OTHER: Record<Locale, { locale: Locale; label: string }> = {
  fr: { locale: 'en', label: 'Switch to English' },
  en: { locale: 'fr', label: 'Passer en français' },
};

/** French / English switch. */
export function LanguageToggle() {
  const other = OTHER[useLocale()];

  return (
    <IconButton
      aria-label={other.label}
      lang={other.locale}
      className={styles.language}
      onClick={() => setLocale(other.locale)}
    >
      {other.locale}
    </IconButton>
  );
}
