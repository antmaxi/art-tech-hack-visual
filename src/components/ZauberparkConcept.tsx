import { useEffect, useRef, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import setting from "@/assets/zauberpark-airport-park.jpg.asset.json";

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
    target.width = 1800;
    target.height = 1200;
    // Photo-space corners of the clear grassy slope, not a new screen.
    const corners = [[490, 1030], [1760, 890], [1775, 1140], [850, 1180]];
    const surface = (u: number, v: number) => {
      const [a, b, c, d] = corners;
      if (!a || !b || !c || !d) return [0, 0];
      return [
        (a[0] ?? 0) * (1-u)*(1-v) + (b[0] ?? 0)*u*(1-v) + (c[0] ?? 0)*u*v + (d[0] ?? 0)*(1-u)*v,
        (a[1] ?? 0) * (1-u)*(1-v) + (b[1] ?? 0)*u*(1-v) + (c[1] ?? 0)*u*v + (d[1] ?? 0)*(1-u)*v,
      ];
    };
    const tile = (original: HTMLCanvasElement, u: number, v: number, du: number, dv: number, lower: boolean) => {
      const p = surface(u, v), q = surface(u+du, v), r = surface(u, v+dv), s = surface(u+du, v+dv);
      const sx = u*original.width, sy = v*original.height;
      const sw = du*original.width, sh = dv*original.height;
      const x = p[0] ?? 0, y = p[1] ?? 0;
      const qx = q[0] ?? 0, qy = q[1] ?? 0, rx = r[0] ?? 0, ry = r[1] ?? 0, tx = s[0] ?? 0, ty = s[1] ?? 0;
      ctx.save();
      ctx.beginPath();
      if (lower) { ctx.moveTo(qx,qy); ctx.lineTo(tx,ty); ctx.lineTo(rx,ry); }
      else { ctx.moveTo(x,y); ctx.lineTo(qx,qy); ctx.lineTo(rx,ry); }
      ctx.closePath(); ctx.clip();
      const a = lower ? (tx-rx)/sw : (qx-x)/sw;
      const b = lower ? (ty-ry)/sw : (qy-y)/sw;
      const c = lower ? (tx-qx)/sh : (rx-x)/sh;
      const d = lower ? (ty-qy)/sh : (ry-y)/sh;
      const ox = lower ? qx-a*(sx+sw)-c*sy : x-a*sx-c*sy;
      const oy = lower ? qy-b*(sx+sw)-d*sy : y-b*sx-d*sy;
      ctx.setTransform(a,b,c,d,ox,oy);
      ctx.drawImage(original,0,0);
      ctx.restore();
    };
    let frame = 0;
    let previous = -100;
    const draw = (time: number) => {
      const original = source.current;
      if (original && original.width > 0 && original.height > 0 && time - previous >= 50) {
        ctx.clearRect(0,0,target.width,target.height);
        for (let row=0; row<8; row++) for (let column=0; column<16; column++) {
          tile(original,column/16,row/8,1/16,1/8,false);
          tile(original,column/16,row/8,1/16,1/8,true);
        }
        // Feather the lit footprint so contours illuminate grass, not a hard rectangle.
        ctx.globalCompositeOperation = "destination-in";
        const fade = ctx.createLinearGradient(0,890,0,1200);
        fade.addColorStop(0,"transparent");
        fade.addColorStop(0.22,"white");
        fade.addColorStop(0.78,"white");
        fade.addColorStop(1,"transparent");
        ctx.fillStyle=fade; ctx.fillRect(0,0,target.width,target.height);
        ctx.save();
        ctx.translate(1160,1045); ctx.scale(1,0.25);
        const footprint = ctx.createRadialGradient(0,0,0,0,0,630);
        footprint.addColorStop(0,"white");
        footprint.addColorStop(0.6,"white");
        footprint.addColorStop(1,"transparent");
        ctx.fillStyle=footprint; ctx.fillRect(-1800,-4800,3600,9600);
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
        previous = time;
      }
      if (animated) frame = requestAnimationFrame(draw);
    };
    // Switching to still preserves the last rendered frame without resetting the artwork.
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [source, animated]);
  return <canvas ref={canvas} className="zauber-projection" aria-label="The existing Forest artwork proposed as a light projection onto the real Airport Park hillside" />;
}

function ConceptScene({ source, sound, onToggleSound, year }: Props) {
  const [animated, setAnimated] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [stillYear, setStillYear] = useState(year);
  return (
    <>
      <div className="zauber-environment" aria-hidden="true">
        <div className="zauber-stage">
          <img src={setting.url} width={1800} height={1200} alt="" className="zauber-setting" />
          <Projection source={source} animated={animated} />
        </div>
      </div>
      <header className="zauber-heading">
        <p className="zauber-eyebrow">Forest · outside the screen</p>
        <Dialog.Title className="zauber-title">Imagine this at Zauberpark</Dialog.Title>
        <p className="zauber-location">Airport Park · behind The Circle · Zurich Airport, Kloten</p>
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
           <p className="zauber-disclaimer">Conceptual projection on an authentic Zauberpark venue photograph. Not an existing installation; not commissioned or approved by Zauberpark. The artwork uses unverified prototype values. Photo: (C) Flughafen Zürich AG · <a href="https://newsroom.flughafen-zuerich.ch/en/photos-zauberpark/" target="_blank" rel="noreferrer">official gallery</a>.</p>
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