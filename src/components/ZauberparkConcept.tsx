import { useEffect, useRef, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import setting from "@/assets/zauberpark-night.jpg";

type Props = {
  source: RefObject<HTMLCanvasElement | null>;
  container: RefObject<HTMLDivElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sound: boolean;
  onToggleSound: () => void;
  year: number;
};

function Projection({ source, animated }: Pick<Props, "source"> & { animated: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    const ctx = target?.getContext("2d");
    if (!target || !ctx) return;
    let frame = 0;
    let previous = -100;
    const draw = (time: number) => {
      const original = source.current;
      if (original && original.width > 0 && original.height > 0 && time - previous >= 50) {
        target.width = 960;
        target.height = 480;
        ctx.drawImage(original, 0, 0, target.width, target.height);
        previous = time;
      }
      if (animated) frame = requestAnimationFrame(draw);
    };
    // Switching to still preserves the last rendered frame without resetting the artwork.
    if (animated || target.width !== 960) frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [source, animated]);
  return <canvas ref={canvas} className="zauber-projection" aria-label="The existing Forest artwork projected onto an imagined outdoor scrim" />;
}

function ConceptScene({ source, sound, onToggleSound, year }: Props) {
  const [animated, setAnimated] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [stillYear, setStillYear] = useState(year);
  return (
    <>
      <div className="zauber-environment" aria-hidden="true">
        <div className="zauber-stage">
          <img src={setting} width={1920} height={1088} alt="" className="zauber-setting" />
          <Projection source={source} animated={animated} />
        </div>
      </div>
      <header className="zauber-heading">
        <p className="zauber-eyebrow">Forest · outside the screen</p>
        <Dialog.Title className="zauber-title">Imagine this at Zauberpark</Dialog.Title>
        <p className="zauber-location">Zurich Airport · an imagined setting</p>
      </header>
      <Dialog.Close asChild>
        <Button variant="ghost" size="icon" className="zauber-close zauber-control" aria-label="Back to Forest" title="Back to Forest">
          <X />
        </Button>
      </Dialog.Close>
      <footer className="zauber-footer">
        <div className="zauber-caption">
          <Dialog.Description>
            An imagined outdoor light installation translating Swiss forest vegetation data into a living landscape of light, movement and sound.
          </Dialog.Description>
          <p className="zauber-disclaimer">Illustrative proposal, not an actual venue photograph. Not commissioned or approved by Zauberpark. The artwork uses unverified prototype values.</p>
        </div>
        <div className="zauber-controls">
          <span className="zauber-year">August {animated ? year : stillYear}</span>
          <div className="zauber-modes" role="group" aria-label="Visualisation mode">
            <Button variant="ghost" className="zauber-control" aria-pressed={!animated} onClick={() => { setStillYear(year); setAnimated(false); }}><Pause /> Still</Button>
            <Button variant="ghost" className="zauber-control" aria-pressed={animated} onClick={() => setAnimated(true)}><Play /> Breathing</Button>
          </div>
          <Button variant="ghost" size="icon" className="zauber-control" aria-label={sound ? "Turn sound off" : "Turn sound on"} title={sound ? "Turn sound off" : "Turn sound on"} aria-pressed={sound} onClick={onToggleSound}>
            {sound ? <Volume2 /> : <VolumeX />}
          </Button>
        </div>
      </footer>
    </>
  );
}

export function ZauberparkConcept(props: Props) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="forest-zauber-entry">IMAGINE THIS AT ZAUBERPARK ↗</Button>
      </Dialog.Trigger>
      <Dialog.Portal container={props.container.current}>
        <Dialog.Content className="zauber-view" onEscapeKeyDown={(event) => event.stopPropagation()}>
          <ConceptScene {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}