import type { MetadataRoute } from "next";

/**
 * Web app manifest: makes the site installable ("Add to Home Screen" on iOS,
 * install prompt on Android/desktop). Installed, it opens standalone —
 * full-screen, no browser chrome — with /dashboard as the hub (players,
 * coaches and the owner all land on their own dashboard; logged-out users
 * are routed through login first).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PadelPro Coaching",
    short_name: "PadelPro",
    description:
      "Padel video analysis by professional coaches — upload your match, get personal feedback.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7ef",
    theme_color: "#38181f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
