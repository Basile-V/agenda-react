import 'react';

declare module 'react' {
  // Allows CSS custom properties in the style prop: style={{ '--index': 3 }}.
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined;
  }
}
