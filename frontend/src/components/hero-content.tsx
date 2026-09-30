import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { Franchise } from "@tcg/types";

type Stat = {
  value: string;
  label: string;
};

export function HeroContent({
  kicker,
  title,
  subtitle,
  franchises,
  shopNowLabel,
  browseFranchisesLabel,
  stats,
}: {
  kicker: string;
  title: ReactNode;
  subtitle: string;
  franchises: Franchise[];
  shopNowLabel: string;
  browseFranchisesLabel: string;
  stats: Stat[];
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-[440px] flex-col gap-5 md:gap-6">
      <HeroKicker text={kicker} />
      <HeroHeading>{title}</HeroHeading>

      <p
        className="reveal m-0 max-w-[54ch] text-sm text-[var(--color-text-muted)] md:text-base"
        style={{ animationDelay: "0.16s" }}
      >
        {subtitle}
      </p>

      <HeroFranchisePills franchises={franchises} />
      <HeroCtas shopNowLabel={shopNowLabel} browseFranchisesLabel={browseFranchisesLabel} />
      <HeroStats stats={stats} />
    </div>
  );
}

function HeroKicker({ text }: { text: string }) {
  return (
    <div
      className="reveal flex items-center gap-2.5 font-mono text-xs font-bold tracking-[0.12em] text-[var(--color-text-muted)]"
      style={{ animationDelay: "0s" }}
    >
      <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" style={{ animation: "dot-pulse 1.6s infinite" }} />
      <span>{text.toUpperCase()}</span>
    </div>
  );
}

function HeroHeading({ children }: { children: ReactNode }) {
  return (
    <h1
      className="reveal m-0 text-[34px] sm:text-[46px] md:text-[64px] lg:text-[80px] xl:text-[96px]"
      style={{ animationDelay: "0.08s" }}
    >
      {children}
    </h1>
  );
}

export function HeroTitleAccent({ children }: { children: ReactNode }) {
  return (
    <span className="gradient-text inline-flex items-center gap-2">
      {children}
      <span className="relative inline-block h-[0.86em] w-[0.62em] flex-none rotate-[12deg] overflow-hidden rounded-[0.08em] bg-[var(--color-text)] align-middle">
        <span aria-hidden className="pack-holo absolute inset-0" style={{ animation: "holo-sweep 2.8s linear infinite" }} />
      </span>
    </span>
  );
}

function HeroFranchisePills({ franchises }: { franchises: Franchise[] }) {
  return (
    <div className="reveal flex flex-wrap gap-2" style={{ animationDelay: "0.24s" }}>
      {franchises.map((f) => (
        <Link
          key={f.slug}
          href={`/franchises/${f.slug}`}
          className="flex h-[30px] items-center gap-2 rounded-[var(--radius-full)] border-[length:var(--border-width)] border-[var(--color-border)] py-0 ps-2.5 pe-3.5 text-xs font-semibold transition-[transform,border-color] hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] sm:h-[34px] sm:text-sm"
        >
          <span className="h-2 w-2 rotate-45 rounded-[2px]" style={{ background: f.accent }} />
          <span>{f.name}</span>
        </Link>
      ))}
    </div>
  );
}

function HeroCtas({
  shopNowLabel,
  browseFranchisesLabel,
}: {
  shopNowLabel: string;
  browseFranchisesLabel: string;
}) {
  return (
    <div className="reveal flex flex-wrap gap-2.5 sm:gap-3" style={{ animationDelay: "0.32s" }}>
      <Link href="/franchises">
        <Button size="lg" className="h-11 px-5 text-sm sm:h-[54px] sm:px-7 sm:text-base">
          {shopNowLabel}
        </Button>
      </Link>
      <Link href="/franchises">
        <Button size="lg" variant="secondary" className="h-11 px-5 text-sm sm:h-[54px] sm:px-7 sm:text-base">
          {browseFranchisesLabel}
        </Button>
      </Link>
    </div>
  );
}

function HeroStats({ stats }: { stats: Stat[] }) {
  return (
    <div
      className="reveal mt-1 grid grid-cols-3 border-t-[length:var(--border-width)] border-[var(--color-border)]"
      style={{ animationDelay: "0.4s" }}
    >
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`py-4 sm:py-5 ${i > 0 ? "border-s-[length:var(--border-width)] border-[var(--color-border)] ps-4 sm:ps-5" : ""}`}
        >
          <div className="font-heading font-[var(--font-heading-weight)] text-2xl leading-none sm:text-3xl">
            {stat.value}
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
