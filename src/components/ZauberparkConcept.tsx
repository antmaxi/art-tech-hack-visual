import type { RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import photograph from "@/assets/zauberpark-photograph.png.asset.json";
import styles from "./ZauberparkConcept.module.css";

type Props = {
  container: RefObject<HTMLDivElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Static proposal board with the unchanged photograph and a secondary concept sketch.
 * No sampled canvases or motion. It stays a dialog
 * mounted inside the Forest wall so opening it never exits Immersion Mode.
 */
export function ZauberparkConcept(props: Props) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="forest-zauber-entry">IMAGINE THIS AT ZAUBERPARK ↗</Button>
      </Dialog.Trigger>
      <Dialog.Portal container={props.container.current}>
        <Dialog.Content className={`zauber-view ${styles["boardDialog"]}`} aria-describedby={undefined} onEscapeKeyDown={(event) => event.stopPropagation()}>
          <Dialog.Title className="zauber-title-sr">Zauberpark</Dialog.Title>
          <div className={styles["board"]}>
            <header className={styles["heading"]}>
              <h2 className={styles["title"]}>A WORLD RUNNING OUT OF BREATH</h2>
              <p className={styles["subtitle"]}>An immersive light installation</p>
              <p className={styles["venue"]}>ZAUBERPARK · ZURICH AIRPORT · 2026</p>
            </header>
          <img
            className={`zauber-photograph ${styles["photograph"]}`}
            src={photograph.url}
            width={1672}
            height={941}
            alt="Zauberpark light festival forest path at dusk, with light patterns projected across the ground and the surrounding foliage"
          />
            <footer className={styles["footer"]}>
              <svg className={styles["sketch"]} viewBox="0 0 220 100" role="img" aria-label="Pencil concept sketch of a forest path with canopy and contour projection layers">
                <g opacity="0.65">
                  <path d="M17 90 99 35 115 34 204 89M24 92 102 38M115 38 195 93M99 35 108 31 119 35" />
                  <path d="M14 81q-8-10 3-17-5-12 9-14-2-12 12-12 1-11 15-9 1-10 13-7 2-9 14-5 4-7 13-4M127 14q10-5 16 3 13-3 16 7 15-3 19 10 15-2 16 12 13 0 14 14 13 4 7 16" />
                  <path d="M23 78q7-7 13-3m-3-12q5-6 13-3m0-12q8-4 12 1m0-14 12 2m5-12 9 3M136 26l8 4m5 10q8-7 15 0m2 13q9-5 15 3m2 10q8-5 14 2M9 93l32 1m137 0 34-1" />
                  <path d="m36 71 8-15m17-13 5-12m90 13-2-14m30 39-6-14" />
                </g>
                <path d="M20 68c-8-14 14-20 20-10 6-17 26-15 26-2 15-8 22 2 13 10M42 49c-5-10 10-15 15-8 4-11 18-12 21-2M146 43c-5-12 11-17 18-6 10-7 19 1 15 10M162 65c-8-15 9-24 20-12 10-14 26-3 21 9" />
                <path className={styles["canopyMarks"]} d="M25 66c-3-7 8-11 13-5m14-8c2-7 13-6 15 0M153 42c0-7 10-9 14-3m7 23c-3-7 9-13 15-8" />
                <path d="M95 45c10 3 19-6 28 1M85 53c16-7 25 9 48 0M72 61c13-9 21 8 36 5s24-11 37-5M58 71c19-13 28 9 49 6s35-13 52-4M41 83c20-11 29 3 46 2s24-9 41-6 22 15 47 4M53 90c21-7 30 6 51 1s27-6 45 1" />
                <path className={styles["contourMarks"]} d="M80 58c13-3 18 8 33 3s17-5 25-3M54 77c17-5 20 7 37 5m26 3c14-7 24 5 39 3" />
              </svg>
              <div className={styles["note"]}>
                <h3>LIGHT AS DATA</h3>
                <p>Vegetation · Temperature · Landscape</p>
              </div>
            </footer>
          </div>
          <Dialog.Close asChild>
            <Button variant="ghost" size="icon" className="zauber-close" aria-label="Back to Forest" title="Back to Forest">
              <X />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
