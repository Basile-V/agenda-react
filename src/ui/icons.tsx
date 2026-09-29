import type { ComponentProps } from 'react';

// Material Symbols paths (Apache 2.0), inlined: no icon font to download.
function Icon({ d, ...props }: ComponentProps<'svg'> & { d: string }) {
  return (
    <svg
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={d} />
    </svg>
  );
}

type IconProps = ComponentProps<'svg'>;

export function ChevronLeftIcon(props: IconProps) {
  return <Icon d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z" {...props} />;
}

export function ChevronRightIcon(props: IconProps) {
  return <Icon d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" {...props} />;
}

export function LogoutIcon(props: IconProps) {
  return (
    <Icon
      d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"
      {...props}
    />
  );
}
