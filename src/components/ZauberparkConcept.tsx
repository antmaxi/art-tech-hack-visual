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
    target.height = 1131;
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
    // Surface mask from the photograph: foliage receives light through its own leaf texture
    // (bright leaves catch it, gaps between them fall dark); the smooth path receives it fully.
    const surfaceMask = document.createElement("canvas");
    surfaceMask.width = 1800;
    surfaceMask.height = 1131;
    const maskContext = surfaceMask.getContext("2d", { willReadFrequently: true });
    let maskReady = false;
    const photo = new Image();
    photo.onload = () => {
      if (!maskContext) return;
      maskContext.drawImage(photo, 0, 0, 1800, 1131);
      const px = maskContext.getImageData(0, 0, 1800, 1131);
      for (let i = 0; i < px.data.length; i += 4) {
        const lum = (px.data[i] ?? 0) * 0.3 + (px.data[i+1] ?? 0) * 0.6 + (px.data[i+2] ?? 0) * 0.1;
        px.data[i+3] = Math.round(255 * (0.3 + 0.7 * Math.min(1, lum / 70)));
      }
      maskContext.putImageData(px, 0, 0);
      maskContext.globalCompositeOperation = "source-over";
      maskContext.fillStyle = "#fff";
      maskContext.beginPath();
      maskContext.moveTo(772, 726); maskContext.lineTo(922, 726); maskContext.lineTo(1800, 1131); maskContext.lineTo(0, 1131);
      maskContext.closePath(); maskContext.fill();
      maskReady = true;
    };
    photo.src = setting;
    const threshold = (plate: CanvasRenderingContext2D, original: HTMLCanvasElement, floor: number) => {
      plate.drawImage(original, 0, 0, plate.canvas.width, plate.canvas.height);
      const pixels = plate.getImageData(0, 0, plate.canvas.width, plate.canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const luminance = (pixels.data[i] ?? 0) * 0.2126 + (pixels.data[i+1] ?? 0) * 0.7152 + (pixels.data[i+2] ?? 0) * 0.0722;
        pixels.data[i+3] = Math.max(0, Math.min(255, (luminance - floor) * 7));
      }
      plate.putImageData(pixels, 0, 0);
    };
    // Geometry belongs only to this reference mockup, never to the shared artwork.
    type Surface = { corners: number[][]; alpha: number; bend: number; plate: "canopy" | "field" };
    const surfaces: Surface[] = [
      // Smooth path and ground, widening from the vanishing point toward the camera: topographic field.
      { corners: [[772, 726], [922, 726], [1800, 1131], [0, 1131]], alpha: 1, bend: 4, plate: "field" },
      // Shrub walls on both sides of the path: Canopy light following the foliage.
      { corners: [[0, 0], [720, 430], [800, 738], [0, 1120]], alpha: 1, bend: 26, plate: "canopy" },
      { corners: [[895, 430], [1800, 0], [1800, 1131], [1520, 1131]], alpha: 1, bend: 26, plate: "canopy" },
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
      const edge = Math.min(1, (u + du / 2) * 12, (1 - u - du / 2) * 12, (v + dv / 2) * 8);
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
    const draw = (time: number) => {
      const original = source.current;
      const canopyCanvas = canopyHost?.current?.querySelector("canvas");
      if (original && original.width > 0 && original.height > 0 && time - previous >= 50) {
        ctx.clearRect(0,0,target.width,target.height);
        threshold(fieldContext, original, 6);
        const hasCanopy = canopyCanvas && canopyCanvas.width > 0 && canopyCanvas.height > 0;
        if (hasCanopy) threshold(canopyContext, canopyCanvas, 5);
        for (const patch of surfaces) {
          ctx.globalAlpha = patch.alpha;
          for (let row=0; row<12; row++) for (let column=0; column<20; column++) {
            const u = column/20, v = row/12, du = 1/20, dv = 1/12;
            const plate = patch.plate === "canopy" && hasCanopy ? canopyLight : fieldLight;
            const v0 = 0, vScale = 1;
            tile(plate,patch,u,v,du,dv,false,v0,vScale);
            tile(plate,patch,u,v,du,dv,true,v0,vScale);
          }
        }
        ctx.globalAlpha = 1;
        if (maskReady) {
          ctx.globalCompositeOperation = "destination-in";
          ctx.drawImage(surfaceMask, 0, 0);
          ctx.globalCompositeOperation = "source-over";
        }
        // Keep the physical festival sign and foreground visitors free of projected lines.
        ctx.globalCompositeOperation = "destination-out";
        const exclusions = [
          // The physical Zauberpark sign stays free of projected light.
          [[1462,318],[1680,318],[1680,850],[1462,850]],
          // Visitors walking the path remain unprojected silhouettes.
          [[603,614],[633,614],[644,660],[671,683],[674,785],[644,796],[639,901],[580,901],[585,796],[564,765],[572,671],[596,658]],
          [[755,635],[778,635],[793,664],[795,719],[782,730],[779,793],[750,793],[746,730],[737,719],[740,664]],
          [[843,655],[857,655],[870,676],[870,712],[862,719],[860,767],[839,767],[836,719],[828,712],[829,676]],
        ];
        ctx.filter = "blur(2px)"; // soft occlusion edge, like real shadows cast by the visitors
        for (const polygon of exclusions) {
          ctx.beginPath();
          polygon.forEach((point,i) => { const x = point[0] ?? 0, y = point[1] ?? 0; if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
          ctx.closePath(); ctx.fill();
        }
        ctx.filter = "none";
        ctx.globalCompositeOperation = "source-over";
        previous = time;
      }
      if (animated) frame = requestAnimationFrame(draw);
    };
    // Switching to still preserves the last rendered frame without resetting the artwork.
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [source, canopyHost, animated]);
  return <canvas ref={canvas} className={`zauber-projection ${styles['projection']}`} aria-label="Live Forest artwork projected in an illustrative festival mockup: the Canopy visualisation on the shrubs beside the path, the topographic field across the path" />;
}

function ConceptScene({ source, canopyHost, sound, onToggleSound, year }: Props) {
  const [animated, setAnimated] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [stillYear, setStillYear] = useState(year);
  return (
    <>
      <div className="zauber-environment" aria-hidden="true">
        <div className={`zauber-stage ${styles['stage']}`}>
          <img src={setting} width={1800} height={1131} alt="" className="zauber-setting" />
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