/** Loading placeholders. Pure markup + CSS shimmer, so they work in loading.tsx (server). */

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="kt-card-grid" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="kt-skel-card">
          <div className="kt-skel kt-skel-card__img" />
          <div className="kt-skel kt-skel-line" style={{ width: "40%" }} />
          <div className="kt-skel kt-skel-line" style={{ width: "85%" }} />
          <div className="kt-skel kt-skel-line" style={{ width: "30%" }} />
        </div>
      ))}
    </div>
  );
}

export function HeadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 mb-6 md:mb-10 max-w-[70ch]" aria-hidden>
      <div className="kt-skel kt-skel-line" style={{ width: "120px" }} />
      <div className="kt-skel" style={{ height: "40px", width: "min(420px, 80%)" }} />
      <div className="kt-skel kt-skel-line" style={{ width: "min(520px, 100%)" }} />
    </div>
  );
}

export function FranchiseTilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="kt-skel" style={{ aspectRatio: "4 / 5", borderRadius: "var(--radius-lg)" }} />
      ))}
    </div>
  );
}

/** Screen-reader announcement shared by every loading.tsx. */
export function LoadingLive({ label }: { label: string }) {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {label}
    </p>
  );
}

/** Home-page shaped placeholder: hero (copy + stage), franchise row, product grid. */
export function HomeSkeleton() {
  return (
    <div className="kt-home" aria-hidden>
      <section className="kt-hero">
        <div className="kt-hero__copy">
          <div className="kt-skel kt-skel-line" style={{ width: "180px" }} />
          <div className="flex flex-col gap-3 my-4">
            <div className="kt-skel" style={{ height: "56px", width: "min(420px, 90%)" }} />
            <div className="kt-skel" style={{ height: "56px", width: "min(360px, 75%)" }} />
            <div className="kt-skel" style={{ height: "56px", width: "min(300px, 60%)" }} />
          </div>
          <div className="kt-skel kt-skel-line" style={{ width: "min(480px, 100%)" }} />
          <div className="kt-skel kt-skel-line mt-2" style={{ width: "min(380px, 80%)" }} />
          <div className="flex flex-wrap gap-2 my-5">
            {[96, 120, 88, 108].map((w, i) => (
              <div key={i} className="kt-skel" style={{ height: "36px", width: `${w}px`, borderRadius: "999px" }} />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="kt-skel" style={{ height: "48px", width: "150px", borderRadius: "999px" }} />
            <div className="kt-skel" style={{ height: "48px", width: "170px", borderRadius: "999px" }} />
          </div>
        </div>
        <div className="kt-hero__stage-wrap">
          <div className="kt-skel" style={{ aspectRatio: "1 / 1", width: "100%", maxWidth: "560px", borderRadius: "var(--radius-lg)" }} />
        </div>
      </section>
      <section className="kt-section">
        <div className="kt-skel kt-skel-line mb-3" style={{ width: "140px" }} />
        <div className="kt-skel mb-6" style={{ height: "36px", width: "min(380px, 80%)" }} />
        <FranchiseTilesSkeleton count={4} />
      </section>
      <section className="kt-section">
        <div className="kt-skel mb-6" style={{ height: "36px", width: "min(320px, 70%)" }} />
        <CardGridSkeleton count={8} />
      </section>
    </div>
  );
}
