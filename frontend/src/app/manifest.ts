import type { MetadataRoute } from "next";

// Colors pulled from the light-theme tokens in src/app/globals.css
// (--color-bg / --color-accent) — keep in sync if those change.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KurdishTCG",
    short_name: "KurdishTCG",
    description: "Real trading card releases, sourced and shipped from Erbil.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f2f2",
    theme_color: "#ec3013",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
