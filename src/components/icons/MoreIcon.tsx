import type { SVGProps } from "react";

/** Decorative ellipsis used by controls that reveal additional actions. */
export function MoreIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`size-4 ${className ?? ""}`}
    >
      <circle cx="4" cy="10" r="1.5" fill="currentColor" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="16" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}
