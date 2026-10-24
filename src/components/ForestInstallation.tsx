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

const STATIONS = [
  { name: "Einsiedeln", id: "MeteoSwiss EIN", lat: 47.133042, lon: 8.756556, note: "Rain at Sihlsee." },
  { name: "Fluntern", id: "MeteoSwiss SMA", lat: 47.381003, lon: 8.567194, note: "Rain in the city." },
  { name: "Sihl, Sihlhölzli", id: "BAFU 2176", lat: 47.3677, lon: 8.5262, note: "Sihl before it joins the Limmat." },
  { name: "Lake, Zürichhorn", id: "BAFU 2209", lat: 47.3548, lon: 8.5505, note: "Level of Lake Zurich." },
  { name: "Letten weir", id: "ewz / canton", lat: 47.385628, lon: 8.535359, weir: true, note: "The weir that releases the lake." },
  { name: "Limmat, Unterhard", id: "BAFU 2099", lat: 47.3906, lon: 8.5254, note: "Limmat below the weir and the Sihl." },
  { name: "Limmat, Baden", id: "BAFU 2243", lat: 47.4757, lon: 8.3094, note: "Limmat further downstream." },
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

  const mean = baselineMean(years);
  const year = years[index] ?? years[0]!;

  // live values for the animation loop
  const live = useRef({ years, index, mean, immersive });
  live.current = { years, index, mean, immersive };

  const wallRef = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const timeEl = useRef<HTMLCanvasElement>(null);
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
      STATIONS.forEach((s) => {
        L.circleMarker([s.lat, s.lon], {
          radius: s.weir ? 5 : 3,
          color: "#e8f5ec",
          weight: 1,
          fillColor: s.weir ? "#b5703a" : "#0b120e",
          fillOpacity: 1,
        })
          .addTo(map!)
          .bindPopup(`<strong>${s.name}</strong><br>${s.id}<br>${s.note}`);
      });
      const bounds = L.latLngBounds(STATIONS.map((s) => [s.lat, s.lon] as [number, number]));
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

  // ---------- animation: PANEL 2 + PANEL 3 ----------
  useEffect(() => {
    const time = timeEl.current!;
    const field = fieldEl.current!;
    const tctx = time.getContext("2d")!;
    const fctx = field.getContext("2d")!;
    const low = document.createElement("canvas");
    const lctx = low.getContext("2d")!;
    let buffer: ImageData | null = null;

    const fit = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      const tr = time.getBoundingClientRect();
      time.width = Math.max(2, Math.floor(tr.width * dpr));
      time.height = Math.max(2, Math.floor(tr.height * dpr));
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
    ro.observe(time);
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

    const drawTime = (t: number) => {
      const { years: ys, index: idx } = live.current;
      const w = time.width;
      const h = time.height;
      const n = ys.length;
      const gutter = Math.round(w * 0.16);
      tctx.fillStyle = "#070a08";
      tctx.fillRect(0, 0, w, h);
      const fs = Math.max(9, Math.min(13, (h / n) * 0.42));
      tctx.font = `${fs}px "IBM Plex Mono", monospace`;
      tctx.textBaseline = "middle";
      ys.forEach((y, i) => {
        const y0 = Math.floor((i / n) * h);
        const y1 = Math.floor(((i + 1) / n) * h);
        const mid = (y0 + y1) / 2;
        const rh = y1 - y0;
        if (y.vhi == null) {
          // missing: dark band with fine hatching
          tctx.fillStyle = "#0d100e";
          tctx.fillRect(gutter, y0, w - gutter, rh);
          tctx.strokeStyle = "rgba(200,210,200,0.14)";
          tctx.lineWidth = 1;
          tctx.beginPath();
          for (let x = gutter - rh; x < w; x += 7) {
            tctx.moveTo(x, y1);
            tctx.lineTo(x + rh, y0);
          }
          tctx.stroke();
          if (y.status === "not-yet") {
            tctx.setLineDash([2, 5]);
            tctx.strokeStyle = "rgba(120,220,160,0.5)";
            tctx.strokeRect(gutter + 0.5, y0 + 1.5, w - gutter - 1, rh - 3);
            tctx.setLineDash([]);
          }
        } else {
          const base = vhiColor(y.vhi);
          const g = tctx.createLinearGradient(gutter, 0, w, 0);
          g.addColorStop(0, rgb(base, 0.35));
          g.addColorStop(0.5, rgb(base.map((c) => Math.min(255, c + 30))));
          g.addColorStop(1, rgb(base, 0.55));
          tctx.fillStyle = g;
          tctx.fillRect(gutter, y0, w - gutter, rh - 1);
          // flowing line: amplitude = distance from mean
          const dev = (y.vhi - live.current.mean) / 30;
          tctx.strokeStyle = "rgba(235,250,240,0.35)";
          tctx.lineWidth = 1;
          tctx.beginPath();
          for (let x = gutter; x <= w; x += 4) {
            const yy =
              mid + Math.sin(x * 0.025 + i * 0.7 + t * 0.0006) * rh * 0.22 * (0.3 + Math.abs(dev)) +
              noise(x * 0.01, i + t * 0.0002) * rh * 0.15;
            if (x === gutter) tctx.moveTo(x, yy);
            else tctx.lineTo(x, yy);
          }
          tctx.stroke();
        }
        const sel = i === idx;
        tctx.fillStyle = sel ? "#d9f7e3" : y.vhi == null ? "rgba(200,210,200,0.35)" : "rgba(200,220,205,0.7)";
        tctx.fillText(String(y.year), Math.round(w * 0.025), mid);
        if (y.vhi != null) {
          tctx.fillStyle = sel ? "#d9f7e3" : "rgba(200,220,205,0.45)";
          tctx.fillText(String(y.vhi), Math.round(w * 0.025) + fs * 3.2, mid);
        }
        if (sel) {
          tctx.strokeStyle = "#d9f7e3";
          tctx.lineWidth = Math.max(1, devicePixelRatio);
          tctx.strokeRect(gutter + 0.5, y0 + 0.5, w - gutter - 1, rh - 1);
        }
      });
      // mean marker
      tctx.fillStyle = "rgba(217,247,227,0.6)";
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
        px[k] += Math.cos(a) * speed * (1 + breath * 0.5);
        py[k] += Math.sin(a) * speed * (1 + breath * 0.5);
        pl[k] -= 0.004 + mStress * 0.01;
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
      drawTime(t);
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
    setIndex(clamp(Math.floor(((e.clientY - r.top) / r.height) * years.length), 0, years.length - 1));
  };

  const delta = year.vhi == null ? null : year.vhi - mean;
  const first = years[0]!.year;
  const last = years[years.length - 1]!.year;

  return (
    <div ref={wallRef} className={`forest-wall ${immersive ? "is-immersive" : ""} ${idle ? "is-idle" : ""}`}>
      <div className="forest-panels">
        <section className="forest-sheet forest-sheet-side" aria-label="Place">
          <div className="forest-map" ref={mapEl} />
          <div className="forest-spine">01 · Place</div>
          <div className="forest-cap">
            <b>
              {year.year} · {year.vhi != null ? `VHI ${year.vhi}` : "—"}
            </b>
            {year.vhi != null ? band(year.vhi) : statusLabel(year)}
            <span className="forest-sub">Limmat forest region · August</span>
          </div>
        </section>

        <section className="forest-sheet forest-sheet-side" aria-label="Time and memory">
          <canvas ref={timeEl} className="forest-canvas forest-timeline forest-clickable" onClick={pickYear} />
          <div className="forest-spine">02 · Time / Memory</div>
          <div className="forest-cap">
            <b>
              {first} – {last}
            </b>
            every August, one band each · click a year
            <span className="forest-sub forest-key">
              <i className="k-data" /> observed <i className="k-miss" /> no valid data <i className="k-next" /> not yet
            </span>
          </div>
        </section>

        <section className="forest-sheet forest-sheet-field" aria-label="The forest breathes">
          <canvas ref={fieldEl} className="forest-canvas" />
          <div className="forest-brand">
            Forest
            <br />
            {first} — {last}
          </div>
          <div className="forest-spine">03 · The forest breathes</div>
          <div className="forest-cap">
            <b>{delta == null ? "·" : `${delta > 0 ? "+" : ""}${delta}`}</b>
            {delta == null ? statusLabel(year) : `from the mean August (${mean}, 1991–2020)`}
          </div>
          <div className="forest-imm-year" aria-live="polite">
            <span>{year.year}</span>
            <small>{year.vhi != null ? `VHI ${year.vhi} · ${band(year.vhi)}` : statusLabel(year)}</small>
          </div>
        </section>
      </div>

      <footer className="forest-bar">
        <button type="button" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <input
          className="forest-range"
          type="range"
          min={0}
          max={years.length - 1}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          aria-label="Year"
        />
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
