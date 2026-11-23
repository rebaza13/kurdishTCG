"use client";

import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, MapPin, Store } from "lucide-react";
import { IRAQ_MAP, KURDISTAN_MAP, type MapGeometry } from "./geo-data";
import { KURDISTAN_CITIES, cityName, type CityCode } from "@/lib/iraq-cities";
import { cn } from "@/lib/utils";

type Scope = "iraq" | "kurdistan";

/**
 * Interactive governorate picker drawn from real borders. Hovering a region
 * lights its border in the accent colour and floats its name over it; the
 * picked region stays lit. When `origin` is given (the seller's city) a pin
 * marks it and an animated route arcs to the picked destination.
 *
 * The Sorani storefront starts on the Kurdistan Region map (bigger, more
 * detailed); a quiet toggle still lets someone outside it switch to Iraq.
 * Labels are HTML positioned by percentage over an aspect-locked SVG, so
 * they get real text shaping (Arabic script, RTL) and CSS transitions.
 *
 * Keyboard: the regions form a radiogroup — Tab in, arrows move, Enter or
 * Space picks.
 */
export function CityMap({
  value,
  onChange,
  origin,
  readOnly = false,
  invalid = false,
  className,
  "aria-label": ariaLabel,
}: {
  value: CityCode | null;
  onChange?: (city: CityCode) => void;
  origin?: CityCode | null;
  readOnly?: boolean;
  invalid?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("map");
  const uid = useId().replace(/:/g, "");

  const inKurdistan = (c: CityCode | null | undefined) => !c || KURDISTAN_CITIES.includes(c);
  const [scope, setScope] = useState<Scope>(() =>
    locale === "ckb" && inKurdistan(value) && inKurdistan(origin) ? "kurdistan" : "iraq"
  );
  const geo: MapGeometry = scope === "kurdistan" ? KURDISTAN_MAP : IRAQ_MAP;
  const [, , vw, vh] = geo.viewBox.split(" ").map(Number);

  const [hovered, setHovered] = useState<CityCode | null>(null);
  const regions = geo.regions as { id: CityCode; d: string; label: [number, number] }[];
  const byId = useMemo(() => new Map(regions.map((r) => [r.id, r])), [regions]);

  const at = (code: CityCode | null | undefined) => (code ? byId.get(code)?.label : undefined);
  const pct = ([x, y]: [number, number]): CSSProperties => ({
    left: `${(x / vw) * 100}%`,
    top: `${(y / vh) * 100}%`,
  });

  const route = useMemo(() => {
    const a = at(origin);
    const b = at(value);
    if (!a || !b || origin === value) return null;
    const [x1, y1] = a;
    const [x2, y2] = b;
    const len = Math.hypot(x2 - x1, y2 - y1);
    // Bow the arc to one side, proportional to its length.
    const mx = (x1 + x2) / 2 - ((y2 - y1) / len) * len * 0.22;
    const my = (y1 + y2) / 2 + ((x2 - x1) / len) * len * 0.22;
    return { d: `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, len: len * 1.15 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, value, byId]);

  function pick(code: CityCode) {
    if (!readOnly) onChange?.(code);
  }

  function onKey(e: KeyboardEvent<SVGPathElement>, index: number) {
    if (readOnly) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(regions[index].id);
      return;
    }
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (index + step + regions.length) % regions.length;
    const svg = e.currentTarget.ownerSVGElement;
    (svg?.querySelectorAll<SVGPathElement>("[data-region]")[next])?.focus();
    pick(regions[next].id);
  }

  const lit = new Set([hovered, value].filter(Boolean) as CityCode[]);
  const scale = vw / 600; // stroke widths are authored for the ~600-unit Iraq map
  const showToggle = locale === "ckb" && !readOnly;
  const hint = hovered ?? value;

  return (
    <div className={cn("kt-map", className)} data-scope={scope} data-invalid={invalid || undefined}>
      {showToggle && (
        <div className="kt-map__scope" role="group" aria-label={t("scopeLabel")}>
          {(["kurdistan", "iraq"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => {
                setScope(s);
                setHovered(null);
              }}
            >
              {t(s)}
            </button>
          ))}
        </div>
      )}

      <div className="kt-map__frame">
      <div className="kt-map__stage" style={{ aspectRatio: `${vw} / ${vh}` }}>
        <svg
          key={scope}
          viewBox={geo.viewBox}
          className="kt-map__svg"
          role={readOnly ? "img" : "radiogroup"}
          aria-label={ariaLabel ?? t("label")}
          onPointerLeave={() => setHovered(null)}
          style={{ "--map-scale": scale } as CSSProperties}
        >
          <defs>
            <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={3 * scale} result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className="kt-map__regions">
            {regions.map((r, i) => {
              const selected = r.id === value;
              return (
                <path
                  key={r.id}
                  d={r.d}
                  data-region={r.id}
                  data-selected={selected || undefined}
                  data-hovered={r.id === hovered || undefined}
                  data-origin={r.id === origin || undefined}
                  className="kt-map__region"
                  style={{ "--i": i } as CSSProperties}
                  role={readOnly ? undefined : "radio"}
                  aria-checked={readOnly ? undefined : selected}
                  aria-label={cityName(r.id, locale)}
                  tabIndex={readOnly ? -1 : selected || (!value && i === 0) ? 0 : -1}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(r.id)}
                  onFocus={() => setHovered(r.id)}
                  onBlur={() => setHovered(null)}
                  onClick={() => pick(r.id)}
                  onKeyDown={(e) => onKey(e, i)}
                />
              );
            })}
          </g>

          {/* Lit borders drawn last so neighbours never cover them. */}
          <g className="kt-map__outlines" aria-hidden filter={`url(#glow-${uid})`}>
            {[...lit].map((id) => {
              const r = byId.get(id);
              return r ? (
                <path key={id} d={r.d} className="kt-map__outline" data-selected={id === value || undefined} />
              ) : null;
            })}
          </g>

          {route && (
            <g aria-hidden className="kt-map__route">
              <path d={route.d} className="kt-map__route-shadow" />
              <path
                key={`${origin}-${value}`}
                d={route.d}
                className="kt-map__route-line"
                style={{ "--len": route.len } as CSSProperties}
              />
            </g>
          )}

          <g aria-hidden>
            {regions.map((r) => (
              <circle
                key={r.id}
                cx={r.label[0]}
                cy={r.label[1]}
                r={2.2 * scale}
                className="kt-map__dot"
                data-on={lit.has(r.id) || r.id === origin || undefined}
              />
            ))}
          </g>
        </svg>

        {/* Floating names */}
        <div className="kt-map__labels" aria-hidden>
          {regions.map((r) => {
            const state =
              r.id === value ? "selected" : r.id === hovered ? "hover" : r.id === origin ? "origin" : null;
            return (
              <span
                key={r.id}
                className="kt-map__label"
                data-state={state ?? undefined}
                style={pct(r.label)}
              >
                {r.id === origin && <Store className="size-3" strokeWidth={2.4} />}
                {r.id === value && r.id !== origin && <Check className="size-3" strokeWidth={3} />}
                {cityName(r.id, locale)}
              </span>
            );
          })}
        </div>

        {at(origin) && <span className="kt-map__pin" style={pct(at(origin)!)} aria-hidden />}
        {at(value) && value !== origin && (
          <span key={value} className="kt-map__ping" style={pct(at(value)!)} aria-hidden />
        )}
      </div>
      </div>

      <div className="kt-map__caption" aria-live="polite">
        <MapPin className="size-4 shrink-0" strokeWidth={2} />
        {hint ? (
          <span>
            {origin && value && hovered == null && origin !== value ? (
              <>
                {t("routeFrom", { from: cityName(origin, locale) })}{" "}
                <strong>{cityName(value, locale)}</strong>
              </>
            ) : (
              <strong>{cityName(hint, locale)}</strong>
            )}
          </span>
        ) : (
          <span className="text-[var(--color-text-muted)]">{readOnly ? t("label") : t("hint")}</span>
        )}
      </div>
    </div>
  );
}
