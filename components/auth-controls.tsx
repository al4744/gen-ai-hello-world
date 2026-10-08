import Link from "next/link";

export default function AuthControls() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Link
        href="/generate"
        className="rounded-xl border px-6 py-3 font-medium"
      >
        Generate
      </Link>

      <Link
        href="/battle"
        className="rounded-xl border px-6 py-3 font-medium"
      >
        Arena
      </Link>

      <Link
        href="/results"
        className="rounded-xl border px-6 py-3 font-medium"
      >
        Results
      </Link>
    </div>
  );
}