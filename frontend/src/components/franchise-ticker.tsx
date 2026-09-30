import type { Franchise } from "@tcg/types";

/** Infinite-scroll strip of franchise names, tilted across the page like a price tag. */
export function FranchiseTicker({ franchises }: { franchises: Franchise[] }) {
  const loop = [...franchises, ...franchises, ...franchises, ...franchises];

  return (
    <div className="ticker -rotate-[1.6deg] py-4.5" aria-hidden>
      <div className="ticker__track">
        {loop.map((f, i) => (
          <div key={`${f.slug}-${i}`} className="flex items-center gap-7 pe-7">
            <span className="whitespace-nowrap text-[clamp(26px,3vw,40px)] font-heading font-[var(--font-heading-weight)] tracking-tight">
              {f.name}
            </span>
            <span className="h-3.5 w-3.5 rotate-45" style={{ background: f.accent }} />
          </div>
        ))}
      </div>
    </div>
  );
}
