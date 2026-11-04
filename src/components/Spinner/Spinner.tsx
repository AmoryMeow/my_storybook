/** Decorative: pair it with visible or announced text such as "Loading…". */
export function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 animate-spin motion-reduce:animate-none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
        className="opacity-90"
      />
    </svg>
  );
}
