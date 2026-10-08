import Link from "next/link";

export default function HomeButton() {
  return (
    <Link
      href="/"
      aria-label="Home"
      title="Home"
      className="fixed left-6 top-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border bg-black transition hover:bg-white/10"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
        <path d="M9 20v-6h6v6" />
      </svg>
    </Link>
  );
}