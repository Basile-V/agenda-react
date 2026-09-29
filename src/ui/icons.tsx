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

export function AddIcon(props: IconProps) {
  return <Icon d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" {...props} />;
}

export function EditIcon(props: IconProps) {
  return (
    <Icon
      d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"
      {...props}
    />
  );
}

export function DeleteIcon(props: IconProps) {
  return (
    <Icon
      d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"
      {...props}
    />
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon
      d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"
      {...props}
    />
  );
}

export function DarkModeIcon(props: IconProps) {
  return (
    <Icon
      d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Z"
      {...props}
    />
  );
}

export function LightModeIcon(props: IconProps) {
  return (
    <Icon
      d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Z"
      {...props}
    />
  );
}
