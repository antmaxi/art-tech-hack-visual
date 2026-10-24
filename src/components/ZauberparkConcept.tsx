import type { RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import photograph from "@/assets/zauberpark-photograph.png.asset.json";

type Props = {
  container: RefObject<HTMLDivElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The Zauberpark mockup is the supplied photograph and nothing else: no projections,
 * no sampled canvases, no controls, no captions and no motion. It stays a dialog
 * mounted inside the Forest wall so opening it never exits Immersion Mode.
 */
export function ZauberparkConcept(props: Props) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="forest-zauber-entry">IMAGINE THIS AT ZAUBERPARK ↗</Button>
      </Dialog.Trigger>
      <Dialog.Portal container={props.container.current}>
        <Dialog.Content className="zauber-view" onEscapeKeyDown={(event) => event.stopPropagation()}>
          <Dialog.Title className="zauber-title-sr">Zauberpark</Dialog.Title>
          <img
            className="zauber-photograph"
            src={photograph.url}
            width={1672}
            height={941}
            alt="Zauberpark light festival forest path at dusk, with light patterns projected across the ground and the surrounding foliage"
          />
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
