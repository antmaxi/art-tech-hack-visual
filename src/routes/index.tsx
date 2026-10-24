import { createFileRoute } from "@tanstack/react-router";
import { ForestInstallation } from "@/components/ForestInstallation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forest, 1991–2026 — the breathing of Swiss forests" },
      {
        name: "description",
        content: "An experimental artwork translating Swiss vegetation health data into colour, movement, light and sound.",
      },
      { property: "og:title", content: "Forest, 1991–2026" },
      {
        property: "og:description",
        content: "Place, memory and a breathing generative landscape built from swissEO vegetation data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForestInstallation,
});
