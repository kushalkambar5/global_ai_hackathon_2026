import React from "react";

export interface MaterialIconProps {
  name: string;
  className?: string;
  fill?: boolean;
  weight?: number;
  grade?: number;
  opticalSize?: number;
  style?: React.CSSProperties;
}

export function MaterialIcon({
  name,
  className = "",
  fill = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  style,
}: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined select-none inline-flex items-center justify-center shrink-0 leading-none align-middle ${className}`}
      style={{
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
