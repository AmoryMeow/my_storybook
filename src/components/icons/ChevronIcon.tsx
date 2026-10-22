import type { SVGProps } from "react";

export interface ChevronIconProps extends SVGProps<SVGSVGElement> {
  /** Rotates the chevron to indicate an expanded state. */
  expanded?: boolean;
}

/** Decorative chevron used by disclosure controls. */
export function ChevronIcon({
  expanded = false,
  className,
  ...props
}: ChevronIconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`size-4 transition-transform motion-reduce:transition-none ${
        expanded ? "rotate-90" : "rotate-0"
      } ${className ?? ""}`}
    >
      <path
        d="m7.5 4.5 5 5.5-5 5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}
