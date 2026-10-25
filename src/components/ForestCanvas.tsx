import { useEffect, useRef, useState } from "react";
import { wmsUrlFor } from "@/lib/map-geo";
import { getRegion, regionFrame, regionLabel } from "@/lib/vhi-source";
import { canopyHealthSource } from "@/lib/canopy-scope";
import { breathRate, vhiColor } from "@/lib/forest-art";
import { normalizeVhi } from "@/lib/annual-vhi";

function cssVar(n: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// oklch -> "r,g,b", so the foliage sprites can fade out properly
function rgb(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  x.fillRect(0, 0, 1, 1);
  const d = x.getImageData(0, 0, 1, 1).data;
  return `${d[0]},${d[1]},${d[2]}`;
}

// one irregular crown: shadow, body and highlights, so a stamp has depth inside it
function foliage(color: string, seed: number) {
  const S = 220;
  const s = document.createElement("canvas");
  s.width = s.height = S;
  const c = s.getContext("2d")!;
  const base = rgb(color);
  const dark = rgb(cssVar("--forest-shadow"));
  // highlights tinted from the crown's own colour, warmed — never a foreign white
  const [br, bg, bb] = base.split(",").map(Number);
  const light = [br, bg, bb]
    .map((c, k) => Math.round(c! + ([238, 230, 198][k]! - c!) * 0.55))
    .join(",");
  const rand = rng(seed);
  const puff = (x: number, y: number, r: number, tone: string, a: number) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${tone},${a.toFixed(3)})`);
    g.addColorStop(0.6, `rgba(${tone},${(a * 0.35).toFixed(3)})`);
    g.addColorStop(1, `rgba(${tone},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  };
  const n = 13 + ((rand() * 9) | 0);
  // the underside, thrown a little down and right
  for (let i = 0; i < n; i++)
    puff(
      S / 2 + (rand() - 0.5) * S * 0.5 + S * 0.05,
      S / 2 + (rand() - 0.5) * S * 0.4 + S * 0.07,
      S * (0.1 + rand() * 0.17),
      dark,
      0.3,
    );
  // the body of the crown
  for (let i = 0; i < n; i++)
    puff(
      S / 2 + (rand() - 0.5) * S * 0.54,
      S / 2 + (rand() - 0.5) * S * 0.44,
      S * (0.11 + rand() * 0.19),
      base,
      0.3 + rand() * 0.36,
    );
  // the light catching the top
  for (let i = 0; i < 6; i++)
    puff(
      S / 2 + (rand() - 0.5) * S * 0.32 - S * 0.07,
      S / 2 + (rand() - 0.5) * S * 0.26 - S * 0.09,
      S * (0.05 + rand() * 0.1),
      light,
      0.24,
    );
  return s;
}

type Tree = {
  hx: number;
  hy: number;
  x: number;
  y: number;
  ox: number;
  oy: number;
  rot: number;
  squash: number;
  phase: number;
  base: number;
  health: number;
  tone: number;
  variant: number;
  growth: number;
  planted: boolean;
};

type Speck = { x: number; y: number; phase: number };

export function ForestCanvas({
  rain,
  airTemp,
  flow,
  regionId,
  vhi,
  dataScope = "regional",
  frozen = false,
}: {
  regionId: number;
  rain: number;
  airTemp: number;
  flow: number;
  /** Annual VHI (0..100) in the active data scope; null/undefined = no observation. */
  vhi?: number | null;
  dataScope?: "regional" | "national";
  frozen?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const live = useRef({ rain, airTemp, flow, vhi, dataScope });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    live.current = { rain, airTemp, flow, vhi, dataScope };
  }, [rain, airTemp, flow, vhi, dataScope]);

  useEffect(() => {
    let raf = 0;
    let alive = true;
    let cleanup = () => {};
    const region = getRegion(regionId);
    const { bbox, W, H, toPx } = regionFrame(region);
    setReady(false);
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let sc = 1;
    let offx = 0;
    let offy = 0;

    // the painting fills the screen; the map is scaled up to cover it, never stretched
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      sc = Math.max(w / W, h / H);
      offx = (w - W * sc) / 2;
      offy = (h - H * sc) / 2;
      ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * offx, dpr * offy);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    (async () => {
      const cover = await loadImg(wmsUrlFor("ch.swisstopo.vec200-landcover", bbox, W, H));
      if (!alive) return;
      // Read health after the asynchronous terrain load; scope/year may have changed while waiting.
      const initialHealth = live.current;
      const vhiSrc = canopyHealthSource(region.id, initialHealth.vhi, initialHealth.dataScope);

      const sheet = (img: HTMLImageElement) => {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const cc = c.getContext("2d")!;
        cc.drawImage(img, 0, 0);
        return cc.getImageData(0, 0, W, H).data;
      };
      const lc = sheet(cover);
      // the region's outline, rasterised: only ground inside it grows
      const mc = document.createElement("canvas");
      mc.width = W;
      mc.height = H;
      const mx = mc.getContext("2d")!;
      mx.beginPath();
      for (const ring of region.rings)
        ring.forEach(([e, n], k) => {
          const [px, py] = toPx(e!, n!);
          if (k) mx.lineTo(px, py);
          else mx.moveTo(px, py);
        });
      mx.fill();
      const mask = mx.getImageData(0, 0, W, H).data;

      // where anything actually grows, and how healthy the satellite finds it
      const cells: number[] = [];
      const health = new Float32Array(W * H).fill(0.5);
      // expressive health: calibrated against the observed record (worst year → 0, best → 1)
      const healthN = new Float32Array(W * H).fill(normalizeVhi(50));
      for (let i = 0; i < W * H; i++) {
        if (mask[i * 4 + 3]! < 128 || lc[i * 4 + 3]! < 40) continue;
        const r = lc[i * 4]!;
        const g = lc[i * 4 + 1]!;
        const b = lc[i * 4 + 2]!;
        if (!(g > r + 10 && g > b + 10)) continue;
        cells.push(i);
        const h = vhiSrc.field((i % W) / W, ((i / W) | 0) / H);
        health[i] = h;
        healthN[i] = normalizeVhi(h * 100);
      }
      if (!cells.length) return;

      const deepC = cssVar("--forest-deep");
      const wakeC = cssVar("--river-warm");
      const mineC = cssVar("--hydro");
      const ink = cssVar("--drain");

      // six crowns per tone, so no two trees share a silhouette
      const set = (color: string, seed: number) =>
        Array.from({ length: 6 }, (_, k) => foliage(color, seed + k * 977));
      // continuous palette: scorched rust at health 0 grading to deep emerald at health 1
      const TONES = 9;
      const toneCss = Array.from(
        { length: TONES },
        (_, l) => `rgb(${vhiColor((l / (TONES - 1)) * 100).join(",")})`,
      );
      const toneSets = toneCss.map((color, l) => set(color, 4000 + l * 7919));
      const toneOf = (h: number) => Math.round(Math.min(1, Math.max(0, h)) * (TONES - 1));
      const wakeS = set(wakeC, 23000);
      const mineS = set(mineC, 31000);

      // the vegetated ground, as a watercolour wash the crowns sit inside
      const ground = document.createElement("canvas");
      ground.width = W;
      ground.height = H;
      const gc = ground.getContext("2d")!;
      // the canopy grows out of pure black
      gc.fillStyle = "#000";
      gc.fillRect(0, 0, W, H);
      gc.globalAlpha = 0.16;
      gc.fillStyle = deepC;
      for (const i of cells) gc.fillRect(i % W, (i / W) | 0, 1, 1);
      gc.globalAlpha = 1;
      ctx.globalAlpha = 1;
      ctx.drawImage(ground, 0, 0);

      const tree = (i: number, planted = false, px?: number, py?: number): Tree => {
        const x = px ?? i % W;
        const y = py ?? (i / W) | 0;
        const h = healthN[((y | 0) * W + (x | 0)) | 0] ?? 0.5;
        return {
          hx: x,
          hy: y,
          x,
          y,
          ox: (Math.random() - 0.5) * 34,
          oy: (Math.random() - 0.5) * 34,
          rot: Math.random() * Math.PI * 2,
          squash: 0.7 + Math.random() * 0.4,
          phase: x * 0.006 + Math.random() * 0.7,
          base: planted ? 12 + Math.random() * 14 : 20 + Math.random() * 30,
          health: h,
          tone: Math.random(),
          variant: (Math.random() * 6) | 0,
          growth: planted ? 0 : 1,
          planted,
        };
      };

      const trees: Tree[] = [];
      const target = () => Math.min(700, 300 + live.current.rain * 120 + live.current.flow * 8);
      const topUp = () => {
        const t = target();
        while (trees.length < t) trees.push(tree(cells[(Math.random() * cells.length) | 0]!));
        for (let k = trees.length - 1; k >= 0 && trees.length > t + 80; k--)
          if (!trees[k]!.planted) trees.splice(k, 1);
      };
      topUp();

      // fine foliage: the small leaves that make a crown look like leaves
      const specks: Speck[] = Array.from({ length: 1800 }, () => {
        const i = cells[(Math.random() * cells.length) | 0]!;
        return {
          x: i % W,
          y: (i / W) | 0,
          phase: (i % W) * 0.006 + Math.random() * 0.7,
        };
      });

      // pointer: hover wakes the canopy, drag is a gust
      let pointer: { x: number; y: number; down: boolean; moved: boolean } | null = null;
      const toLocal = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left - offx) / sc, y: (e.clientY - r.top - offy) / sc };
      };
      const down = (e: PointerEvent) => {
        pointer = { ...toLocal(e), down: true, moved: false };
        canvas.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        const l = toLocal(e);
        if (pointer?.down && Math.hypot(l.x - pointer.x, l.y - pointer.y) > 4)
          pointer.moved = true;
        pointer = { ...l, down: pointer?.down ?? false, moved: pointer?.moved ?? false };
      };
      const up = () => {
        if (pointer) pointer.down = false;
      };
      const leave = () => (pointer = null);
      cleanup = () => {
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointerleave", leave);
      };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointerleave", leave);


      let t = 0;
      let f = 0;
      let healthVhi = initialHealth.vhi;
      let healthScope = initialHealth.dataScope;
      setReady(true);

      const loop = () => {
        if (frozenRef.current) {
          raf = requestAnimationFrame(loop);
          return;
        }
        t += 0.016;
        f++;
        if (f % 120 === 0) topUp();

        // watercolour memory: the ground shows through again each frame
        ctx.globalAlpha = 0.05;
        ctx.drawImage(ground, 0, 0);
        ctx.globalAlpha = 1;

        const s = live.current;
        if (healthVhi !== s.vhi || healthScope !== s.dataScope) {
          healthVhi = s.vhi;
          healthScope = s.dataScope;
          const source = canopyHealthSource(region.id, s.vhi, s.dataScope);
          for (const i of cells) {
            health[i] = source.field((i % W) / W, ((i / W) | 0) / H);
            healthN[i] = normalizeVhi(health[i]! * 100);
          }
          for (const tr of trees) tr.health = healthN[((tr.hy | 0) * W + (tr.hx | 0)) | 0] ?? 0.5;
        }
        const rainDeep = Math.min(0.35, s.rain * 0.18);
        const gust = !!pointer && pointer.down && pointer.moved;

        // small leaves first, so crowns sit on top of them
        for (const sp of specks) {
          const h = healthN[((sp.y | 0) * W + (sp.x | 0)) | 0] ?? 0.5;
          const b = (Math.sin(t * breathRate(h) * 60 + sp.phase) + 1) / 2;
          ctx.globalAlpha = 0.06 + b * 0.18;
          ctx.fillStyle = toneCss[toneOf(h)]!;
          const k = 1 + b * 1.8;
          ctx.fillRect(sp.x, sp.y, k, k);
        }

        for (const tr of trees) {
          if (tr.growth < 1) tr.growth = Math.min(1, tr.growth + 0.008);

          // a healthy tree breathes deep and slow; a thirsty one pants shallow and fast —
          // the same shared tempo as the breathing field, so they move as one in immersion
          const rate = breathRate(tr.health) * 60;
          const b = (Math.sin(t * rate + tr.phase) + 1) / 2;
          const depth = 0.18 + tr.health * 0.55 + rainDeep;

          // wind off the river, and the spring back to where it grew
          tr.x += (tr.hx - tr.x) * 0.05 + Math.sin(t * 0.35 + tr.hy * 0.008) * (0.2 + s.flow * 0.012);
          tr.y += (tr.hy - tr.y) * 0.05;

          if (gust && pointer) {
            const dx = tr.x - pointer.x;
            const dy = tr.y - pointer.y;
            const dd = Math.hypot(dx, dy);
            if (dd < 160 && dd > 0.1) {
              const k = (1 - dd / 160) * 3;
              tr.x += (dx / dd) * k;
              tr.y += (dy / dd) * k;
            }
          }

          // crown surface follows health: lush and wide at peak, shrunken in drought
          let r = tr.base * (0.55 + tr.health * 0.85) * (0.5 + b * depth) * tr.growth;
          let a = (0.09 + b * 0.3) * (tr.planted ? 0.85 : 0.6 + tr.health * 0.4);
          let sheet2 = tr.planted
            ? mineS[tr.variant]!
            : toneSets[toneOf(tr.health)]![tr.variant]!;

          if (pointer && !pointer.down) {
            const dd = Math.hypot(tr.x - pointer.x, tr.y - pointer.y);
            if (dd < 150) {
              const k = 1 - dd / 150;
              r *= 1 + k * 0.85;
              a += k * 0.32;
              sheet2 = wakeS[tr.variant]!;
            }
          }

          ctx.save();
          ctx.globalAlpha = Math.min(0.8, a);
          ctx.translate(tr.x, tr.y);
          ctx.rotate(tr.rot);
          ctx.drawImage(sheet2, -r, -r * tr.squash, r * 2, r * 2 * tr.squash);
          ctx.restore();

          const r2 = r * 0.55;
          ctx.globalAlpha = Math.min(0.55, a * 0.7);
          ctx.drawImage(sheet2, tr.x + tr.ox - r2, tr.y + tr.oy - r2, r2 * 2, r2 * 2);

          // the trunk of a tree someone planted
          if (tr.planted) {
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = ink;
            ctx.fillRect(tr.hx - 1.5, tr.hy - 1.5, 3, 3);
          }
        }
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      cleanup();
    };
  }, [regionId]);

  return (
    <>
      <canvas
        ref={ref}
        className="forest-canvas absolute inset-0 h-full w-full"
        tabIndex={0}
        aria-label={`Interactive painting of ${dataScope === "national" ? "Switzerland’s" : regionLabel(regionId)} forests, breathing.`}
        data-region-id={regionId}
        data-scope={dataScope}
        data-annual-vhi={vhi ?? 'missing'}
        onPointerDown={() => ref.current?.focus({ preventScroll: true })}
      />
      {!ready && (
        <p className="forest-loading font-display text-xl italic">
          The canopy is drawing breath…
        </p>
      )}
    </>
  );
}
