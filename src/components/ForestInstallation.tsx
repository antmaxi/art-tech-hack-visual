import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  PROTOTYPE_YEARS,
  SOURCE,
  band,
  baselineMean,
  loadYears,
  statusLabel,
  type YearRecord,
} from "@/lib/forest-data";
import { noise, rgb, vhiColor } from "@/lib/forest-art";
import { ZauberparkConcept } from "@/components/ZauberparkConcept";
import { ForestCanvas } from "@/components/ForestCanvas";

// Preserve the existing geographical framing independently of station markers.
const PLACE_BOUNDS: [[number, number], [number, number]] = [
  [47.133042, 8.3094],
  [47.4757, 8.756556],
];

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function ForestInstallation() {
  const [years, setYears] = useState<YearRecord[]>(PROTOTYPE_YEARS);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [immersive, setImmersive] = useState(false);
  const [sound, setSound] = useState(false);
  const [idle, setIdle] = useState(false);
  const [legend, setLegend] = useState(false);
  const [zauberpark, setZauberpark] = useState(false);
  const conceptOpen = useRef(false);
  conceptOpen.current = zauberpark;

  const mean = baselineMean(years);
  const year = years[index] ?? years[0]!;

  // live values for the animation loop
  const live = useRef({ years, index, mean, immersive });
  live.current = { years, index, mean, immersive };

  const wallRef = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const tlEl = useRef<HTMLCanvasElement>(null);
  const fieldEl = useRef<HTMLCanvasElement>(null);
  const mapApi = useRef<{ show: (y: YearRecord) => void; resize: () => void } | null>(null);
  const audio = useRef<{ ctx: AudioContext; set: (vhi: number, breath: number, stress: number) => void } | null>(null);

  useEffect(() => {
    loadYears().then(setYears);
  }, []);

  // ---------- PANEL 1: map ----------
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      if (disposed || !mapEl.current) return;
      map = L.map(mapEl.current, { zoomControl: false, attributionControl: false });
      L.tileLayer(
        "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg",
        { maxZoom: 18, className: "forest-basemap" },
      ).addTo(map);
      L.tileLayer(
        "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg",
        { maxZoom: 18, opacity: 0.18, className: "forest-contours" },
      ).addTo(map);
      const bounds = L.latLngBounds(PLACE_BOUNDS);
      let paint: import("leaflet").Layer | null = null;
      mapApi.current = {
        show: (y) => {
          if (!map) return;
          if (paint) map.removeLayer(paint);
          paint = null;
          if (y.status === "not-yet") return;
          paint = L.tileLayer
            .wms("https://wms.geo.admin.ch/", {
              layers: SOURCE.layer,
              format: "image/png",
              transparent: true,
              version: "1.3.0",
              // swisstopo time-enabled layer
              ...({ item: y.day + "T235959" } as object),
              opacity: 0.72,
            })
            .addTo(map);
        },
        resize: () => map?.invalidateSize(),
      };
      setTimeout(() => {
        map?.invalidateSize();
        map?.fitBounds(bounds, { padding: [28, 28] });
        mapApi.current?.show(live.current.years[live.current.index]!);
      }, 120);
    });
    return () => {
      disposed = true;
      map?.remove();
      mapApi.current = null;
    };
  }, []);

  useEffect(() => {
    mapApi.current?.show(year);
  }, [year]);

  // ---------- playback ----------
  useEffect(() => {
    if (!playing) return;
    const wait = year.vhi == null ? 700 : 2600;
    const t = setTimeout(() => setIndex((i) => (i + 1) % years.length), wait);
    return () => clearTimeout(t);
  }, [playing, index, years.length, year.vhi]);

  // ---------- animation: bottom timeline + PANEL 3 ----------
  useEffect(() => {
    const tl = tlEl.current!;
    const field = fieldEl.current!;
    const tlctx = tl.getContext("2d")!;
    const fctx = field.getContext("2d")!;
    const low = document.createElement("canvas");
    const lctx = low.getContext("2d")!;
    let buffer: ImageData | null = null;

    const fit = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      const lr = tl.getBoundingClientRect();
      tl.width = Math.max(2, Math.floor(lr.width * dpr));
      tl.height = Math.max(2, Math.floor(lr.height * dpr));
      const fr = field.getBoundingClientRect();
      field.width = Math.max(2, Math.floor(fr.width * dpr));
      field.height = Math.max(2, Math.floor(fr.height * dpr));
      // generative buffer: capped pixel budget for projector laptops
      const budget = 70000;
      const s = Math.min(0.5, Math.sqrt(budget / Math.max(1, fr.width * fr.height)));
      low.width = Math.max(2, Math.floor(fr.width * s));
      low.height = Math.max(2, Math.floor(fr.height * s));
      buffer = lctx.createImageData(low.width, low.height);
    };
    fit();
    const ro = new ResizeObserver(() => {
      fit();
      mapApi.current?.resize();
    });
    ro.observe(tl);
    ro.observe(field);

    // particles
    const P = 900;
    const px = new Float32Array(P);
    const py = new Float32Array(P);
    const pl = new Float32Array(P);
    for (let i = 0; i < P; i++) {
      px[i] = Math.random();
      py[i] = Math.random();
      pl[i] = Math.random();
    }

    let shown = live.current.mean;
    let motion = live.current.mean;
    let clock = 0;
    let phase = 0;
    let raf = 0;

    // chronological timeline along the bottom: one band per year, left to right
    const drawTimeline = (t: number) => {
      const { years: ys, index: idx, mean: m } = live.current;
      const w = tl.width;
      const h = tl.height;
      const n = ys.length;
      tlctx.clearRect(0, 0, w, h);
      const bw = w / n;
      const labelH = Math.max(13, h * 0.3);
      const bh = h - labelH - 4;
      const fs = Math.max(9, Math.min(11, bw * 1.2));
      tlctx.font = `${fs}px "IBM Plex Mono", monospace`;
      tlctx.textBaseline = "alphabetic";
      ys.forEach((y, i) => {
        const x0 = i * bw;
        const sel = i === idx;
        if (y.vhi == null) {
          // missing: dark band with fine hatching
          tlctx.fillStyle = "#0d100e";
          tlctx.fillRect(x0, 2, bw - 1, bh);
          tlctx.save();
          tlctx.beginPath();
          tlctx.rect(x0, 2, bw - 1, bh);
          tlctx.clip();
          tlctx.strokeStyle = "rgba(200,210,200,0.14)";
          tlctx.lineWidth = 1;
          tlctx.beginPath();
          for (let x = x0 - bh; x < x0 + bw; x += 7) {
            tlctx.moveTo(x, 2 + bh);
            tlctx.lineTo(x + bh, 2);
          }
          tlctx.stroke();
          tlctx.restore();
          if (y.status === "not-yet") {
            tlctx.setLineDash([2, 5]);
            tlctx.strokeStyle = "rgba(120,220,160,0.5)";
            tlctx.strokeRect(x0 + 0.5, 2.5, bw - 2, bh - 1);
            tlctx.setLineDash([]);
          }
        } else {
          const base = vhiColor(y.vhi);
          const g = tlctx.createLinearGradient(0, 2, 0, 2 + bh);
          g.addColorStop(0, rgb(base.map((c) => Math.min(255, c + 30))));
          g.addColorStop(1, rgb(base, 0.45));
          tlctx.fillStyle = g;
          tlctx.fillRect(x0, 2, bw - 1, bh);
          // flowing line: amplitude = distance from mean
          const dev = (y.vhi - m) / 30;
          tlctx.strokeStyle = "rgba(235,250,240,0.35)";
          tlctx.lineWidth = 1;
          tlctx.beginPath();
          for (let x = x0; x <= x0 + bw - 1; x += 3) {
            const yy =
              2 +
              bh / 2 +
              Math.sin(x * 0.05 + i * 0.7 + t * 0.0006) * bh * 0.22 * (0.3 + Math.abs(dev)) +
              noise(x * 0.02, i + t * 0.0002) * bh * 0.12;
            if (x === x0) tlctx.moveTo(x, yy);
            else tlctx.lineTo(x, yy);
          }
          tlctx.stroke();
        }
        // year markers: every five years, plus the endpoints and the selection,
        // skipping any that would collide with a neighbour
        const nearSel = Math.abs(i - idx) < 3;
        const nearEnd = Math.abs(i - (n - 1)) < 3;
        if (sel || (!nearSel && (i === n - 1 || (!nearEnd && i % 5 === 0)))) {
          tlctx.fillStyle = sel ? "#d9f7e3" : "rgba(200,220,205,0.55)";
          tlctx.fillText(String(y.year), x0 + 1, h - 3);
        }
        if (sel) {
          tlctx.strokeStyle = "#d9f7e3";
          tlctx.lineWidth = Math.max(1, devicePixelRatio);
          tlctx.strokeRect(x0 + 0.5, 1.5, bw - 2, bh + 1);
        }
      });
    };

    const drawField = () => {
      if (!buffer) return;
      const { years: ys, index: idx, mean: m } = live.current;
      const y = ys[idx]!;
      // VHI → colour/intensity; VCI → motion (falls back to VHI until connected)
      const target = y.vhi ?? m;
      const motionTarget = y.vci ?? y.vhi ?? m;
      shown += (target - shown) * 0.02;
      motion += (motionTarget - motion) * 0.02;
      const health = clamp(shown / 100);
      const stress = clamp((m - shown) / 30);
      const vigor = clamp((shown - m) / 25);
      const mStress = clamp((m - motion) / 30);

      // breathing: calm & deep when healthy, shallow, faster and irregular under stress
      const rate = 0.006 + mStress * 0.012;
      phase += rate * (1 + mStress * 0.9 * noise(clock * 2, 3.3));
      const hold = mStress > 0.3 ? clamp(noise(clock * 3, 9.1) * 3 * mStress) : 0; // interruptions
      const breath = Math.sin(phase) * (1 - hold) * (0.55 + vigor * 0.45 - mStress * 0.3);
      clock += 0.0022 + mStress * 0.004;

      const w = low.width;
      const h = low.height;
      const data = buffer.data;
      const zoom = 1 - breath * 0.06;
      const warp = 1.1 + mStress * 2.6;
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const u = ((i / w - 0.5) * zoom + 0.5) * (w / h);
          const v = (j / h - 0.5) * zoom + 0.5;
          const q = noise(u * 2.2 + clock, v * 2.2);
          const r = noise(u * 2.2 + 4.1, v * 2.2 + clock * 0.8);
          const e = (noise(u * 1.6 + q * warp, v * 1.6 + r * warp + clock * 0.5) + 1) * 0.5;
          const fine = (noise(u * 9 + 8, v * 9 + clock) + 1) * 0.5;
          // topographic contours
          const c = (e * 14 + clock * 0.6) % 1;
          const contour = Math.max(0, 1 - Math.abs(c - 0.5) * 2 * (6 + stress * 4));
          // fragmentation under stress
          const frag = stress > 0.15 && fine < stress * 0.45 ? 0.15 : 1;
          const lum = (0.08 + e * e * 0.9) * (0.45 + health * 0.75) * (1 + breath * 0.25) * frag;
          let R = 6 + lum * 40;
          let G = 14 + lum * 170 + fine * 18;
          let B = 10 + lum * 90;
          // earth tones bleed in with stress
          R += stress * lum * 150;
          G -= stress * lum * 70;
          B -= stress * lum * 60;
          const cl = contour * (0.35 + health * 0.6) * frag;
          R += cl * (90 + stress * 80);
          G += cl * 200;
          B += cl * 130;
          const o = (j * w + i) * 4;
          data[o] = R;
          data[o + 1] = G;
          data[o + 2] = B;
          data[o + 3] = 255;
        }
      }
      lctx.putImageData(buffer, 0, 0);
      const W = field.width;
      const H = field.height;
      fctx.imageSmoothingEnabled = true;
      fctx.drawImage(low, 0, 0, W, H);

      // luminous particles
      fctx.globalCompositeOperation = "lighter";
      const speed = 0.0006 + clamp(motion / 100) * 0.0012;
      const pulse = 0.55 + breath * 0.45;
      const sz = Math.max(1.5, W / 600);
      for (let k = 0; k < P; k++) {
        const a = noise(px[k]! * 3 + clock, py[k]! * 3) * Math.PI * (2 + mStress * 3);
        px[k] = px[k]! + Math.cos(a) * speed * (1 + breath * 0.5);
        py[k] = py[k]! + Math.sin(a) * speed * (1 + breath * 0.5);
        pl[k] = pl[k]! - (0.004 + mStress * 0.01);
        if (pl[k]! <= 0 || px[k]! < 0 || px[k]! > 1 || py[k]! < 0 || py[k]! > 1) {
          px[k] = Math.random();
          py[k] = Math.random();
          pl[k] = 1;
        }
        if (mStress > 0.4 && Math.random() < mStress * 0.3) continue; // flicker
        const al = Math.sin(pl[k]! * Math.PI) * pulse * (0.25 + health * 0.6);
        fctx.fillStyle = stress > vigor ? `rgba(230,170,110,${al})` : `rgba(150,255,190,${al})`;
        fctx.fillRect(px[k]! * W, py[k]! * H, sz, sz);
      }
      fctx.globalCompositeOperation = "source-over";
      // vignette for depth
      const vg = fctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.75)");
      fctx.fillStyle = vg;
      fctx.fillRect(0, 0, W, H);

      audio.current?.set(shown, breath, stress);
    };

    const loop = (t: number) => {
      drawTimeline(t);
      drawField();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // ---------- sound (synthesised interpretation) ----------
  useEffect(() => {
    if (!sound) {
      if (audio.current) {
        audio.current.ctx.close();
        audio.current = null;
      }
      return;
    }
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.setTargetAtTime(0.35, ctx.currentTime, 1.5);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.connect(master);
    master.connect(ctx.destination);
    const oscs = [55, 82.4, 110.6].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 1 ? "triangle" : "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.18;
      o.connect(g).connect(filter);
      o.start();
      return o;
    });
    // breath noise
    const len = ctx.sampleRate * 2;
    const nb = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = nb;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800;
    bp.Q.value = 0.7;
    const air = ctx.createGain();
    air.gain.value = 0;
    src.connect(bp).connect(air).connect(master);
    src.start();
    audio.current = {
      ctx,
      set: (vhi, breath, stress) => {
        const now = ctx.currentTime;
        filter.frequency.setTargetAtTime(250 + vhi * 14, now, 0.4);
        air.gain.setTargetAtTime(0.04 + Math.max(0, breath) * 0.12, now, 0.15);
        bp.frequency.setTargetAtTime(500 + (breath + 1) * 400, now, 0.2);
        oscs[1]!.detune.setTargetAtTime(stress * 45, now, 0.5);
        oscs[2]!.detune.setTargetAtTime(-stress * 30, now, 0.5);
      },
    };
    return () => {
      ctx.close();
      audio.current = null;
    };
  }, [sound]);

  // ---------- immersive ----------
  const enterImmersive = useCallback(() => {
    setImmersive(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);
  const exitImmersive = useCallback(() => {
    setImmersive(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (conceptOpen.current) return;
      if (e.key === "Escape") exitImmersive();
      if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        setPlaying((p) => !p);
      }
      if (e.key === "ArrowRight") setIndex((i) => Math.min(live.current.years.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    const onFs = () => {
      if (!document.fullscreenElement && live.current.immersive) setImmersive(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [exitImmersive]);

  useEffect(() => {
    if (!immersive) {
      setIdle(false);
      return;
    }
    let t = setTimeout(() => setIdle(true), 2500);
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), 2500);
    };
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [immersive]);

  const pickYear = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setIndex(clamp(Math.floor(((e.clientX - r.left) / r.width) * years.length), 0, years.length - 1));
  };

  const first = years[0]!.year;
  const last = years[years.length - 1]!.year;

  return (
    <div ref={wallRef} className={`forest-wall ${immersive ? "is-immersive" : ""} ${idle ? "is-idle" : ""}`}>
      <div className="forest-panels">
        <section className="forest-sheet forest-sheet-side" aria-label="Place">
          <div className="forest-map" ref={mapEl} />
          <div className="forest-spine">01 · Place</div>
        </section>

        <section className="forest-sheet forest-sheet-side forest-sheet-canopy" aria-label="Canopy">
          <ForestCanvas regionId={39} vhi={year.vhi} rain={0} airTemp={10} flow={0} />
          <div className="forest-spine">02 · Canopy</div>
        </section>

        <section className="forest-sheet forest-sheet-field" aria-label="The forest breathes">
          <canvas ref={fieldEl} className="forest-canvas" />
          <div className="forest-brand">
            Forest
            <br />
            {first} — {last}
          </div>
          <div className="forest-spine">03 · The forest breathes</div>
          <div className="forest-imm-year" aria-live="polite">
            <span>{year.year}</span>
            <small>{year.vhi != null ? `VHI ${year.vhi} · ${band(year.vhi)}` : statusLabel(year)}</small>
          </div>
        </section>
      </div>

      <footer className="forest-bar">
        <canvas
          ref={tlEl}
          className="forest-tl forest-clickable"
          onClick={pickYear}
          aria-label={`Timeline ${first} to ${last}, one band per August; click a year`}
        />
        <div className="forest-bar-row">
          <button type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : "Play"}
          </button>
          <span className="forest-year">{year.year}</span>
          <button type="button" onClick={() => setSound((s) => !s)} aria-pressed={sound}>
            Sound {sound ? "on" : "off"}
          </button>
          <button type="button" onClick={() => setLegend((l) => !l)} aria-expanded={legend} className="forest-only-panels">
            Legend
          </button>
          <a className="forest-source forest-only-panels" href={SOURCE.url} target="_blank" rel="noreferrer">
            Source: swissEO VHI
          </a>
          {immersive ? (
            <button type="button" onClick={exitImmersive}>
              Exit · Esc
            </button>
          ) : (
            <button type="button" className="forest-enter" onClick={enterImmersive}>
              Enter immersive mode
            </button>
          )}
          <ZauberparkConcept
            source={fieldEl}
            container={wallRef}
            open={zauberpark}
            onOpenChange={setZauberpark}
            sound={sound}
            onToggleSound={() => setSound((s) => !s)}
            year={year.year}
          />
        </div>
      </footer>

      {legend && !immersive && (
        <aside className="forest-legend">
          <p>
            <b>VHI</b> Vegetation Health Index · colour & intensity of the landscape
          </p>
          <p>
            <b>VCI</b> Vegetation Condition Index · movement & flow — <em>not connected yet; movement follows VHI</em>
          </p>
          <p>
            <b>TCI</b> Temperature Condition Index · sound rhythm — <em>not connected yet</em>
          </p>
          <p className="forest-legend-note">
            Values shown are carried over from the prototype and are not yet verified against the official source. Grey
            hatched years have no valid observation; 2026 is not yet observed. The breathing and the sound are artistic
            interpretations — the data does not measure respiration, and no forest sound is recorded.
          </p>
        </aside>
      )}
    </div>
  );
}
