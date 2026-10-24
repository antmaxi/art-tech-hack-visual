import { useEffect, useRef, type RefObject } from "react";
import environment from "@/assets/forest-immersion-environment.jpg";
import surfaceMask from "@/assets/forest-surface-mask.jpg";

type Props = { source: RefObject<HTMLCanvasElement | null>; container: RefObject<HTMLDivElement | null> };
type Point = readonly [number, number];
type Surface = { corners: readonly [Point, Point, Point, Point]; strength: number };

// Coordinates belong to the photograph, not the viewport. Both artworks share
// this one projection texture, retaining their existing screen-blended overlap.
const surfaces: Surface[] = [
  { corners: [[.27,.65],[.78,.65],[1.12,1.08],[-.12,1.08]], strength: 1 },
  { corners: [[0,0],[.38,0],[.42,.47],[0,.58]], strength: .75 },
  { corners: [[.35,.14],[.73,.15],[.79,.58],[.29,.6]], strength: .65 },
  { corners: [[.68,0],[1,0],[1,.61],[.66,.54]], strength: .8 },
  { corners: [[.116,0],[.156,0],[.055,.74],[.015,.72]], strength: 1 },
  { corners: [[.16,.31],[.182,.3],[.16,.65],[.138,.65]], strength: 1 },
  { corners: [[.197,.34],[.215,.34],[.213,.66],[.192,.66]], strength: .9 },
  { corners: [[.345,.36],[.359,.35],[.367,.66],[.347,.66]], strength: .9 },
  { corners: [[.708,.33],[.73,.32],[.722,.68],[.701,.67]], strength: 1 },
  { corners: [[.647,.42],[.66,.42],[.657,.67],[.641,.66]], strength: .95 },
  { corners: [[.975,0],[1,0],[1,.76],[.978,.73]], strength: .9 },
];

export function ImmersiveForestProjection({ source, container }: Props) {
  const output = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = output.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const width = 1376, height = 768;
    canvas.width = width; canvas.height = height;
    const texture = document.createElement("canvas");
    texture.width = 960; texture.height = 540;
    const tx = texture.getContext("2d");
    const mask = document.createElement("canvas");
    mask.width = width; mask.height = height;
    const mx = mask.getContext("2d");
    if (!tx || !mx) return;
    const image = new Image();
    let ready = false;
    image.onload = () => {
      mx.drawImage(image,0,0,width,height);
      const pixels = mx.getImageData(0,0,width,height);
      for (let i=0; i<pixels.data.length; i+=4) {
        pixels.data[i+3] = pixels.data[i] ?? 0;
      }
      mx.putImageData(pixels,0,0); ready = true;
    };
    image.src = surfaceMask;
    const point = (s: Surface,u: number,v: number): Point => {
      const [a,b,c,d] = s.corners;
      return [width*(a[0]*(1-u)*(1-v)+b[0]*u*(1-v)+c[0]*u*v+d[0]*(1-u)*v),
        height*(a[1]*(1-u)*(1-v)+b[1]*u*(1-v)+c[1]*u*v+d[1]*(1-u)*v)];
    };
    const triangle = (s: Surface,u: number,v: number,lower: boolean) => {
      const du=1/10,dv=1/6;
      const p=point(s,u,v),q=point(s,u+du,v),r=point(s,u,v+dv),t=point(s,u+du,v+dv);
      const sx=u*texture.width,sy=v*texture.height,sw=du*texture.width,sh=dv*texture.height;
      const a=lower?(t[0]-r[0])/sw:(q[0]-p[0])/sw;
      const b=lower?(t[1]-r[1])/sw:(q[1]-p[1])/sw;
      const c=lower?(t[0]-q[0])/sh:(r[0]-p[0])/sh;
      const d=lower?(t[1]-q[1])/sh:(r[1]-p[1])/sh;
      ctx.save(); ctx.beginPath();
      const points=lower?[q,t,r]:[p,q,r];
      points.forEach((pt,i)=>i?ctx.lineTo(pt[0],pt[1]):ctx.moveTo(pt[0],pt[1]));
      ctx.closePath(); ctx.clip();
      ctx.setTransform(a,b,c,d,lower?q[0]-a*(sx+sw)-c*sy:p[0]-a*sx-c*sy,
        lower?q[1]-b*(sx+sw)-d*sy:p[1]-b*sx-d*sy);
      ctx.drawImage(texture,0,0); ctx.restore();
    };
    let frame=0,previous=0;
    const draw=(time: number) => {
      const field=source.current;
      const canopy=container.current?.querySelector<HTMLCanvasElement>(".forest-sheet-canopy canvas");
      if (ready && field && field.width>0 && time-previous>65) {
        tx.globalCompositeOperation="source-over";
        tx.drawImage(field,0,0,texture.width,texture.height);
        if (canopy && canopy.width>0) {
          tx.globalCompositeOperation="screen";
          tx.drawImage(canopy,0,0,texture.width,texture.height);
        }
        ctx.clearRect(0,0,width,height);
        ctx.globalCompositeOperation="screen";
        for (const surface of surfaces) {
          ctx.globalAlpha=surface.strength;
          for (let row=0;row<6;row++) for (let col=0;col<10;col++) {
            triangle(surface,col/10,row/6,false); triangle(surface,col/10,row/6,true);
          }
        }
        ctx.globalAlpha=1;
        ctx.globalCompositeOperation="destination-in";
        ctx.drawImage(mask,0,0);
        ctx.globalCompositeOperation="source-over";
        previous=time;
      }
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); image.onload=null; };
  },[source,container]);
  return <div className="immersive-forest-environment" aria-hidden="true">
    <div className="immersive-forest-stage">
      <img src={environment} className="immersive-forest-photo" alt="" />
      <canvas ref={output} className="immersive-forest-light" />
    </div>
  </div>;
}