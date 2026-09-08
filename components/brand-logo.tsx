export function BrandLogo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        aria-hidden="true"
        className="size-8 shrink-0 overflow-visible sm:size-[2.125rem]"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="36" height="36" rx="10" fill="var(--accent)" />
        <path
          d="M8.75 12.25 17.75 8.5v19l-9-3.75v-11.5Z"
          stroke="var(--on-accent)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="m18.25 8.5 9 3.75v11.5l-9 3.75v-19Z"
          fill="var(--on-accent)"
          fillOpacity=".96"
          className="origin-center transition-transform duration-200 ease-out group-hover:translate-x-[1px]"
        />
        <path
          d="m20.75 13.25 3.9 1.55v6.4l-3.9 1.55v-9.5Z"
          fill="var(--accent)"
        />
        <circle cx="21.8" cy="18" r="1" fill="#D8845F" />
      </svg>
      <span className="hidden text-xl font-black tracking-[-0.025em] sm:inline">
        RoomFacelift<span className="text-[var(--accent)]">.</span>
      </span>
      <span className="sr-only sm:hidden">RoomFacelift</span>
    </span>
  );
}
