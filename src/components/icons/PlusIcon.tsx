import type { SVGProps } from "react";

export interface PlusIconProps extends SVGProps<SVGSVGElement> {
  /** Adds a group outline around the add symbol. */
  group?: boolean;
}

/** Decorative add icon with optional group treatment. */
export function PlusIcon({
  group = false,
  className,
  ...props
}: PlusIconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`size-4 ${className ?? ""}`}
    >
      {group && (
        <path
          d="M3 5.5h5l1.5 2H17v8H3z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      )}
      <path
        d="M10 9v5M7.5 11.5h5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
