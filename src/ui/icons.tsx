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
