import { createFileRoute } from "@tanstack/react-router";
import { ForestInstallation } from "@/components/ForestInstallation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forest, 1991–2025 — annual Swiss forest health" },
      {
        name: "description",
        content: "An experimental artwork exploring annual vegetation health across 38 Swiss regions, from 1991 to 2025.",
      },
      { property: "og:title", content: "Forest, 1991–2025 — annual Swiss forest health" },
      {
        property: "og:description",
        content: "Explore Switzerland’s regions and a breathing landscape driven by annual means of supplied monthly VHI observations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForestInstallation,
});
