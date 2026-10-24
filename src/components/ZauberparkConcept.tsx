import { useEffect, useRef, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import setting from "@/assets/forest-mockup-setting.jpg";
import styles from "./ZauberparkConcept.module.css";

type Props = {
  source: RefObject<HTMLCanvasElement | null>;
  /** Host of the live Canopy panel; its canvas feeds the upper projection band. */
  canopyHost?: RefObject<HTMLElement | null> | undefined;
  container: RefObject<HTMLDivElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sound: boolean;
  onToggleSound: () => void;
  year: number;
};

function Projection({ source, canopyHost, animated }: Pick<Props, "source" | "canopyHost"> & { animated: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    const ctx = target?.getContext("2d");
    if (!target || !ctx) return;
    target.width = 1800;
    target.height = 1200;
    // Two thresholded light plates: the Canopy (upper band) and the breathing field (lower band).
    const fieldLight = document.createElement("canvas");
    fieldLight.width = 720;
    fieldLight.height = 480;
    const fieldContext = fieldLight.getContext("2d", { willReadFrequently: true });
    const canopyLight = document.createElement("canvas");
    canopyLight.width = 720;
    canopyLight.height = 480;
    const canopyContext = canopyLight.getContext("2d", { willReadFrequently: true });
    if (!fieldContext || !canopyContext) return;
    const threshold = (plate: CanvasRenderingContext2D, original: HTMLCanvasElement, floor: number) => {
      plate.drawImage(original, 0, 0, plate.canvas.width, plate.canvas.height);
      const pixels = plate.getImageData(0, 0, plate.canvas.width, plate.canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const luminance = (pixels.data[i] ?? 0) * 0.2126 + (pixels.data[i+1] ?? 0) * 0.7152 + (pixels.data[i+2] ?? 0) * 0.0722;
        pixels.data[i+3] = Math.max(0, Math.min(255, (luminance - floor) * 3.5));
      }
      plate.putImageData(pixels, 0, 0);
    };
    // Geometry belongs only to this reference mockup, never to the shared artwork.
    type Surface = { corners: number[][]; alpha: number; bend: number };
    const surfaces: Surface[] = [
      { corners: [[610, 780], [1320, 780], [1780, 1198], [0, 1198]], alpha: 1, bend: 20 },
      { corners: [[500, 0], [560, 0], [375, 830], [280, 830]], alpha: 0.95, bend: 9 },
      { corners: [[1440, 0], [1520, 0], [1630, 920], [1540, 920]], alpha: 0.8, bend: 8 },
      { corners: [[830, 425], [863, 420], [823, 780], [787, 790]], alpha: 0.8, bend: 4 },
      { corners: [[1160, 510], [1190, 510], [1210, 790], [1172, 790]], alpha: 0.75, bend: 4 },
      { corners: [[580, 15], [1390, 0], [1420, 610], [650, 645]], alpha: 0.55, bend: 35 },
      { corners: [[0, 0], [430, 20], [375, 580], [0, 650]], alpha: 0.3, bend: 24 },
    ];
    const surface = (corners: number[][], u: number, v: number, bend: number) => {
      const [a, b, c, d] = corners;
      if (!a || !b || !c || !d) return [0, 0];
      return [
        (a[0] ?? 0) * (1-u)*(1-v) + (b[0] ?? 0)*u*(1-v) + (c[0] ?? 0)*u*v + (d[0] ?? 0)*(1-u)*v + Math.sin(v * Math.PI) * Math.sin(u * Math.PI * 2) * bend,
        (a[1] ?? 0) * (1-u)*(1-v) + (b[1] ?? 0)*u*(1-v) + (c[1] ?? 0)*u*v + (d[1] ?? 0)*(1-u)*v + Math.sin(u * Math.PI) * Math.sin(v * Math.PI * 2) * bend,
      ];
    };
    const tile = (original: HTMLCanvasElement, patch: Surface, u: number, v: number, du: number, dv: number, lower: boolean, v0: number, vScale: number) => {
      const p = surface(patch.corners,u,v,patch.bend), q = surface(patch.corners,u+du,v,patch.bend), r = surface(patch.corners,u,v+dv,patch.bend), s = surface(patch.corners,u+du,v+dv,patch.bend);
      const sx = u*original.width, sy = (v0 + v*vScale)*original.height;
      const sw = du*original.width, sh = dv*vScale*original.height;
      const x = p[0] ?? 0, y = p[1] ?? 0;
      const qx = q[0] ?? 0, qy = q[1] ?? 0, rx = r[0] ?? 0, ry = r[1] ?? 0, tx = s[0] ?? 0, ty = s[1] ?? 0;
      ctx.save();
      // Soft surface boundaries avoid rectangular light sheets over natural textures.
      const edge = Math.min(1, (u + du / 2) * 12, (1 - u - du / 2) * 12, (v + dv / 2) * 12, (1 - v - dv / 2) * 12);
      ctx.globalAlpha *= Math.max(0, edge);
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
    // Vertical split of every projection surface: Canopy above, breathing field below, dark seam between.
    const BAND_END = 0.45;
    const BAND_START = 0.47;
    const draw = (time: number) => {
      const original = source.current;
      const canopyCanvas = canopyHost?.current?.querySelector("canvas");
      if (original && original.width > 0 && original.height > 0 && time - previous >= 50) {
        ctx.clearRect(0,0,target.width,target.height);
        threshold(fieldContext, original, 45);
        const hasCanopy = canopyCanvas && canopyCanvas.width > 0 && canopyCanvas.height > 0;
        if (hasCanopy) threshold(canopyContext, canopyCanvas, 48);
        for (const patch of surfaces) {
          ctx.globalAlpha = patch.alpha;
          for (let row=0; row<12; row++) for (let column=0; column<20; column++) {
            const u = column/20, v = row/12, du = 1/20, dv = 1/12;
            const mid = v + dv/2;
            let plate = fieldLight, v0 = 0, vScale = 1;
            if (mid < BAND_END) { plate = hasCanopy ? canopyLight : fieldLight; v0 = 0; vScale = 1/BAND_END; }
            else if (mid > BAND_START) { plate = fieldLight; v0 = -BAND_START/(1-BAND_START); vScale = 1/(1-BAND_START); }
            else continue; // the seam stays unlit, separating the two stacked projections
            tile(plate,patch,u,v,du,dv,false,v0,vScale);
            tile(plate,patch,u,v,du,dv,true,v0,vScale);
          }
        }
        ctx.globalAlpha = 1;
        // Keep the physical festival sign and foreground visitors free of projected lines.
        ctx.globalCompositeOperation = "destination-out";
        const exclusions = [
          [[1590,355],[1800,275],[1800,990],[1635,970]],
          [[850,650],[905,635],[942,720],[940,895],[875,940],[842,900],[839,765]],
          [[0,585],[125,570],[220,710],[156,1070],[0,1160]],
          [[1105,715],[1137,715],[1170,765],[1172,855],[1120,861],[1100,785]],
          [[1210,710],[1240,710],[1267,765],[1263,850],[1219,853],[1205,775]],
        ];
        for (const polygon of exclusions) {
          ctx.beginPath();
          polygon.forEach((point,i) => { const x = point[0] ?? 0, y = point[1] ?? 0; if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
          ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
        previous = time;
      }
      if (animated) frame = requestAnimationFrame(draw);
    };
    // Switching to still preserves the last rendered frame without resetting the artwork.
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [source, canopyHost, animated]);
  return <canvas ref={canvas} className={`zauber-projection ${styles['projection']}`} aria-label="Live Forest artwork projected across the forest floor, tree trunks and canopy in an illustrative festival mockup: the Canopy visualisation above, the breathing topographic field below" />;
}

function ConceptScene({ source, canopyHost, sound, onToggleSound, year }: Props) {
  const [animated, setAnimated] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [stillYear, setStillYear] = useState(year);
  return (
    <>
      <div className="zauber-environment" aria-hidden="true">
        <div className={`zauber-stage ${styles['stage']}`}>
          <img src={setting} width={1800} height={1200} alt="" className="zauber-setting" />
          <Projection source={source} canopyHost={canopyHost} animated={animated} />
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
            <p className="zauber-disclaimer">Illustrative forest setting adapted from the supplied reference. The festival sign is part of the mockup, not an event announcement. Not an existing installation; not commissioned or approved by Zauberpark.</p>
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
        <Dialog.Content className={`zauber-view ${styles['mockup']}`} onEscapeKeyDown={(event) => event.stopPropagation()}>
          <ConceptScene {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}