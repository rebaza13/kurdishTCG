"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize, Minimize, RotateCw } from "lucide-react";
import { Button, Notice } from "@/components/ui";

export interface CropSpec {
  /** Width / height of the output image. */
  aspect: number;
  /**
   * Fill colour behind the image. `null` = the image must cover the whole
   * frame (single cards fill the storefront card edge to edge); a colour lets
   * the admin zoom out and leave margin (sealed product sits on a white plate).
   */
  background: string | null;
  /** Shown above the frame, e.g. "Card shape (63 × 88)". */
  label: string;
}

const OUT_WIDTH = 1200;

/**
 * Modal crop/position editor: drag to move, slider/wheel to zoom, Fit/Fill
 * presets, rotate 90°. Renders the framed result to a canvas and hands back a
 * new File, so what's uploaded is exactly what the storefront card shows.
 */
export function ImageEditor({
  source,
  spec,
  onCancel,
  onDone,
}: {
  /** A freshly picked file, or the URL of an already-uploaded image. */
  source: File | string;
  spec: CropSpec;
  onCancel: () => void;
  onDone: (file: File) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [frameW, setFrameW] = useState(0);
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [zoom, setZoom] = useState(1); // 1 = "fit" (contain, or cover when no background)
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // fraction of frame size
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);

  // Load the image (object URL for files, CORS-enabled fetch for URLs).
  useEffect(() => {
    // `cancelled` matters: in dev, React runs this effect twice, and the first
    // run's object URL is revoked mid-load — its onerror must not leak out.
    let cancelled = false;
    const el = new Image();
    let objectUrl: string | null = null;
    if (typeof source === "string") {
      // Remote images go through our same-origin relay (R2 sends no CORS
      // headers, which would block reading the canvas back).
      el.src = source.startsWith("/") ? source : `/api/image-proxy?url=${encodeURIComponent(source)}`;
    } else {
      objectUrl = URL.createObjectURL(source);
      el.src = objectUrl;
    }
    el.onload = () => {
      if (!cancelled) setImg(el);
    };
    el.onerror = () => {
      if (cancelled) return;
      const heic = typeof source !== "string" && /hei[cf]/i.test(`${source.type} ${source.name}`);
      setLoadError(
        typeof source === "string"
          ? "This image couldn't be loaded for editing. Upload the original file instead."
          : heic
            ? "iPhone HEIC photos can't be opened in this browser. Export it as JPG/PNG (or take a screenshot) and upload that."
            : "This file couldn't be opened as an image. Try saving it as JPG or PNG."
      );
    };
    return () => {
      cancelled = true;
      el.onload = null;
      el.onerror = null;
      // Revoke after the current load settles so the live <img> isn't broken.
      if (objectUrl) {
        const url = objectUrl;
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    };
  }, [source]);

  // Track the frame's rendered width so math works at any screen size.
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrameW(el.clientWidth));
    ro.observe(el);
    setFrameW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const frameH = frameW / spec.aspect;
  const turned = rotation % 180 !== 0;
  const iw = img ? (turned ? img.naturalHeight : img.naturalWidth) : 1;
  const ih = img ? (turned ? img.naturalWidth : img.naturalHeight) : 1;
  const contain = Math.min(frameW / iw, frameH / ih);
  const cover = Math.max(frameW / iw, frameH / ih);
  const base = spec.background ? contain : cover;
  const minZoom = spec.background ? 0.4 : 1;
  const maxZoom = 4 * (cover / base);
  const scale = base * zoom;
  const dispW = iw * scale; // on-screen size of the (rotated) image
  const dispH = ih * scale;

  /** Without a background colour the image may never expose an empty edge. */
  function clamp(o: { x: number; y: number }, s = scale) {
    if (spec.background || !frameW) return o;
    const maxX = Math.max(0, (iw * s - frameW) / 2) / frameW;
    const maxY = Math.max(0, (ih * s - frameH) / 2) / frameH;
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  }

  function setZoomClamped(z: number) {
    const next = Math.min(maxZoom, Math.max(minZoom, z));
    setZoom(next);
    setOffset((o) => clamp(o, base * next));
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !frameW) return;
    setOffset(clamp({ x: d.ox + (e.clientX - d.x) / frameW, y: d.oy + (e.clientY - d.y) / frameH }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function save() {
    if (!img || !frameW) return;
    setBusy(true);
    try {
      const outW = OUT_WIDTH;
      const outH = Math.round(OUT_WIDTH / spec.aspect);
      const k = outW / frameW;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      if (spec.background) {
        ctx.fillStyle = spec.background;
        ctx.fillRect(0, 0, outW, outH);
      }
      ctx.imageSmoothingQuality = "high";
      // Centre of the image in output pixels, then rotate around it.
      ctx.translate((frameW / 2 + offset.x * frameW) * k, (frameH / 2 + offset.y * frameH) * k);
      ctx.rotate((rotation * Math.PI) / 180);
      const w = img.naturalWidth * scale * k;
      const h = img.naturalHeight * scale * k;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
      const out =
        blob && blob.type === "image/webp"
          ? blob
          : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!out) throw new Error("encode failed");
      const ext = out.type === "image/webp" ? "webp" : "png";
      onDone(new File([out], `edited.${ext}`, { type: out.type }));
    } catch {
      setLoadError(
        "Couldn't save the edited image. If you're adjusting an uploaded image, upload the original file instead."
      );
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit image"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-auto rounded-xl border border-line bg-surface p-4 shadow-xl">
        <div>
          <h2 className="text-sm font-semibold">Position the image</h2>
          <p className="text-xs text-muted">
            {spec.label} — drag to move, scroll or use the slider to zoom. This is exactly what the storefront card
            shows.
          </p>
        </div>

        {loadError && <Notice>{loadError}</Notice>}

        <div
          ref={frameRef}
          className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-lg border border-line active:cursor-grabbing"
          style={{
            aspectRatio: String(spec.aspect),
            maxHeight: "60vh",
            background:
              spec.background ??
              "repeating-conic-gradient(#d4d4d4 0% 25%, #f5f5f5 0% 50%) 50% / 16px 16px",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => setZoomClamped(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
        >
          {img && frameW > 0 && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob / canvas source, not a page image
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                // Size the *unrotated* element; rotation swaps the visual box.
                width: turned ? dispH : dispW,
                height: turned ? dispW : dispH,
                left: frameW / 2 + offset.x * frameW,
                top: frameH / 2 + offset.y * frameH,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}
            />
          )}
          {!img && !loadError && (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">Loading…</span>
          )}
          {/* Rule-of-thirds guide */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="border border-white/25" />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">Zoom</span>
          <input
            type="range"
            min={minZoom}
            max={maxZoom}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            className="flex-1"
            aria-label="Zoom"
            disabled={!img}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!img}
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <Minimize className="size-3.5" /> Fit
          </Button>
          <Button
            size="sm"
            disabled={!img}
            onClick={() => {
              setZoom(cover / base);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <Maximize className="size-3.5" /> Fill
          </Button>
          <Button
            size="sm"
            disabled={!img}
            onClick={() => {
              setRotation((r) => (r + 90) % 360);
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <RotateCw className="size-3.5" /> Rotate
          </Button>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={busy} disabled={!img || !!loadError}>
            Use this image
          </Button>
        </div>
      </div>
    </div>
  );
}
