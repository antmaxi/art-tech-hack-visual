import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { ANNUAL_YEARS, SOURCE, band, baselineMean, statusLabel, type YearRecord } from "@/lib/forest-data";
import { breathRate, noise, rgb, vhiColor } from "@/lib/forest-art";
import { ZauberparkConcept } from "@/components/ZauberparkConcept";
import { AboutDialog } from "@/components/AboutDialog";
import arthack from "@/assets/arthack.mp3.asset.json";
import { ForestCanvas } from "@/components/ForestCanvas";
import { Button } from "@/components/ui/button";
import { audioTimeForIndex, getAnnualRegion, normalizeVhi, PRELIMINARY_YEARS, YEAR_DURATION_MS } from "@/lib/annual-vhi";
import { ALL_SWITZERLAND, canopyAnnualVhi, DEFAULT_SELECTION, isNationalScope } from "@/lib/canopy-scope";
import { MAP_REGIONS, SWITZERLAND_BOUNDS } from "@/lib/forest-regions";
import { REGION_IDS_BY_NAME, regionLabel } from "@/lib/vhi-source";
import { createMapFraming } from "@/lib/map-framing";
import { indexForAudioTime } from "@/lib/audio-timeline";
import { DEFAULT_FIELD_RESOLUTION, fieldBufferSize, FRAME_INTERVAL_MS, frameTimeScale, type FieldResolution } from "@/lib/field-resolution";

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function ForestInstallation() {
  const years = ANNUAL_YEARS;
  const [regionId, setRegionId] = useState(DEFAULT_SELECTION);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [immersive, setImmersive] = useState(false);
  const [resolution, setResolution] = useState<FieldResolution>(DEFAULT_FIELD_RESOLUTION);
  const fitField = useRef<(() => void) | null>(null);
  const [sound, setSound] = useState(false);
  const [idle, setIdle] = useState(false);
  const [legend, setLegend] = useState(false);
  const [zauberpark, setZauberpark] = useState(false);
  const conceptOpen = useRef(false);
  conceptOpen.current = zauberpark;

  const mean = baselineMean(years);
  const year = years[index] ?? years[0]!;
  const canopyVhi = canopyAnnualVhi(year.year, regionId, immersive);
  const immersiveTerrainRegion = useRef(regionId);

  // live values for the animation loop
  const live = useRef({ years, index, mean, immersive, regionId, playing, resolution });
  live.current = { years, index, mean, immersive, regionId, playing, resolution };

  const wallRef = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const tlEl = useRef<HTMLCanvasElement>(null);
  const fieldEl = useRef<HTMLCanvasElement>(null);
  const mapApi = useRef<{ show: (y: YearRecord, selected: number) => void } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLElement | null>(null);

  const selectYear = useCallback((selected: number) => {
    setIndex(selected);
    // Only deliberate timeline/keyboard navigation seeks the soundtrack.
    if (audio.current) audio.current.currentTime = audioTimeForIndex(selected);
  }, []);

  // Keep the plots clear of the control bar: publish the bar's live height as a CSS variable.
  useEffect(() => {
    const wall = wallRef.current;
    const bar = barRef.current;
    if (!wall || !bar) return;
    const sync = () => wall.style.setProperty("--bar-h", `${Math.round(bar.getBoundingClientRect().height)}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  // ---------- PANEL 1: map ----------

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    let sizeObserver: ResizeObserver | undefined;
    let frameRequest = 0;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      if (disposed || !mapEl.current) return;
      const mapContainer = mapEl.current;
      map = L.map(mapContainer, { zoomControl: false, attributionControl: false, zoomSnap: 0, zoomDelta: 0.25, wheelPxPerZoomLevel: 120 });
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 18,
        className: "forest-basemap",
      }).addTo(map);
      L.tileLayer(
        "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg",
        { maxZoom: 18, opacity: 0.18, className: "forest-contours", bounds: L.latLngBounds([[45.8, 5.95], [47.82, 10.5]]) },
      ).addTo(map);
      const bounds = L.latLngBounds(SWITZERLAND_BOUNDS);
      const outline = getComputedStyle(document.documentElement).getPropertyValue("--forest-ink").trim();
      const polygons = MAP_REGIONS.map((region) => {
        const polygon = L.polygon(region.rings, { weight: 1, fillOpacity: 0.3 }).addTo(map as import("leaflet").Map);
        polygon.on("click", () => setRegionId(region.id));
        return { id: region.id, polygon };
      });
      const frame = createMapFraming(map, selected => polygons.find(({ id }) => id === selected)?.polygon.getBounds() ?? bounds);
      const frameSelection = (selected: number) => {
        if (disposed || live.current.immersive) return;
        frame(selected, mapContainer.clientWidth, mapContainer.clientHeight);
      };
      mapApi.current = {
        show: (y, selected) => {
          if (!map) return;
          frameSelection(selected);
          polygons.forEach(({ id, polygon }) => {
            const annual = getAnnualRegion(y.year, id);
            const color = annual?.vhi != null ? rgb(vhiColor(annual.vhi)) : outline;
            polygon.setStyle({
              color: id === selected ? outline : color,
              fillColor: color,
              weight: id === selected ? 2.5 : 0.7,
              fillOpacity: annual?.vhi != null ? 0.42 : 0,
              dashArray: annual?.vhi == null ? "3 5" : undefined,
            });
            const path = polygon.getElement();
            if (path) {
              path.setAttribute("aria-pressed", String(id === selected));
              if (!path.hasAttribute("role")) {
                path.setAttribute("tabindex", "0");
                path.setAttribute("role", "button");
                path.setAttribute("aria-label", `Select ${regionLabel(id)}`);
                path.addEventListener("keydown", (event) => {
                  if (!(event instanceof KeyboardEvent)) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    setRegionId(id);
                  }
                });
              }
            }
            if (id === selected) polygon.bringToFront();
          });
        },
      };
      sizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(frameRequest);
        frameRequest = requestAnimationFrame(() => frameSelection(live.current.regionId));
      });
      sizeObserver.observe(mapContainer);
      frameRequest = requestAnimationFrame(() => {
        if (disposed) return;
        const currentYear = live.current.years[live.current.index];
        if (currentYear) mapApi.current?.show(currentYear, live.current.regionId);
      });
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frameRequest);
      sizeObserver?.disconnect();
      map?.remove();
      mapApi.current = null;
    };
  }, []);

  useEffect(() => {
    mapApi.current?.show(year, regionId);
  }, [year, regionId]);

  // ---------- playback ----------
  useEffect(() => {
    if (!playing || sound) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % years.length), YEAR_DURATION_MS);
    return () => clearTimeout(t);
  }, [playing, sound, index, years.length, year.vhi]);

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
      // More actual contour samples in immersion, not just a larger output canvas.
      const size = fieldBufferSize(fr.width, fr.height, live.current.immersive, live.current.resolution);
      low.width = size.width;
      low.height = size.height;
      field.dataset["resolution"] = live.current.immersive ? live.current.resolution : "low";
      field.dataset["sampleWidth"] = String(size.width);
      field.dataset["sampleHeight"] = String(size.height);
      buffer = lctx.createImageData(low.width, low.height);
    };
    fitField.current = fit;
    fit();
    const ro = new ResizeObserver(() => {
      fit();
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
          const label = String(y.year);
          tlctx.fillText(label, Math.min(x0 + 1, w - tlctx.measureText(label).width - 1), h - 3);
        }
        if (sel) {
          tlctx.strokeStyle = "#d9f7e3";
          tlctx.lineWidth = Math.max(1, devicePixelRatio);
          tlctx.strokeRect(x0 + 0.5, 1.5, bw - 2, bh + 1);
        }
      });
    };

    // timeScale converts per-frame increments to real time so contour speed is
    // identical in high and low resolution (high costs more compute per frame)
    const drawField = (timeScale: number) => {
      if (!buffer) return;
      const { years: ys, index: idx, mean: m } = live.current;
      const y = ys[idx]!;
      // VHI → colour/intensity; VCI → motion (falls back to VHI until connected)
      const target = y.vhi ?? m;
      const motionTarget = y.vci ?? y.vhi ?? m;
      // gentle easing keeps year-to-year transitions smooth, especially in Immersion Mode
      shown += (target - shown) * 0.012;
      motion += (motionTarget - motion) * 0.012;
      // calibrate against the observed record: worst year → 0, best year → 1
      const health = normalizeVhi(shown);
      const motionHealth = normalizeVhi(motion);
      const stress = 1 - health;
      const mStress = 1 - motionHealth;
      // Immersion Mode only: in low-VHI years the background falls away to black so the lines carry the image
      const blacken = live.current.immersive ? clamp((stress - 0.25) * 1.6, 0, 1) : 0;

      // breathing: very slow and deep at peak health (~23s), fast and shallow in drought (~2s)
      phase += breathRate(motionHealth) * (1 + mStress * 0.9 * noise(clock * 2, 3.3)) * timeScale;
      const hold = clamp((mStress - 0.3) * 2.5, 0, 1) * clamp(noise(clock * 3, 9.1) * 3 * mStress, 0, 1); // interruptions
      const breath = Math.sin(phase) * (1 - hold) * (0.55 + health * 0.45 - mStress * 0.3);
      clock += (0.0012 + mStress * 0.006) * timeScale;

      const w = low.width;
      const h = low.height;
      const data = buffer.data;
      // the inhale/exhale swells the whole field: dramatic at peak health, shallow in drought
      const zoom = 1 - breath * (0.03 + health * 0.15);
      const warp = 1.1 + mStress * 2.6;
      // healthy years form large soft masses; drought breaks into tight agitated detail
      const blobFreq = 1.4 + stress * 1.4;
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const u = ((i / w - 0.5) * zoom + 0.5) * (w / h);
          const v = (j / h - 0.5) * zoom + 0.5;
          const q = noise(u * blobFreq + clock, v * blobFreq);
          const r = noise(u * blobFreq + 4.1, v * blobFreq + clock * 0.8);
          const e = (noise(u * blobFreq * 0.75 + q * warp, v * blobFreq * 0.75 + r * warp + clock * 0.5) + 1) * 0.5;
          const fine = (noise(u * 9 + 8, v * 9 + clock) + 1) * 0.5;
          // topographic contours: few broad rings at peak health, many tight rings in drought
          const c = (e * (9 + stress * 9) + clock * 0.6) % 1;
          // drought sharpens the contours into thin vibrant lines (extra crisp in Immersion Mode)
          const contour = Math.max(0, 1 - Math.abs(c - 0.5) * 2 * (6 + stress * 8 + blacken * 12));
          // fragmentation under stress (continuous, so year transitions never pop);
          // in Immersion Mode the drought lines stay connected so they read as drawn contours
          const frag = 1 - clamp((stress * 0.45 - fine) * 5, 0, 0.85) * clamp((stress - 0.12) * 6, 0, 1) * (1 - blacken * 0.6);
          // in drought the glow between lines falls back to near-black, keeping only a slight gradient
          const lum = (0.08 * (1 - stress * 0.75) - blacken * 0.06 + e * e * (0.9 - stress * 0.55 - blacken * 0.6)) * (0.45 + health * 0.75) * (1 + breath * 0.25) * frag;
          // continuous gradient: deep emerald at peak health, dark scorched rust in drought
          let R = 6 + lum * (34 + stress * 130);
          let G = 12 + lum * (185 - stress * 115) + fine * 18 * (1 - stress * 0.7);
          let B = 10 + lum * (95 - stress * 60);
          const cl = contour * (0.35 + health * 0.6 + stress * 0.3 + blacken * 0.45) * frag;
          R += cl * (90 + stress * 180);
          G += cl * (200 - stress * 100 - blacken * 45);
          B += cl * (130 - stress * 90 - blacken * 55);
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
      fctx.imageSmoothingQuality = "high";
      fctx.drawImage(low, 0, 0, W, H);

      // luminous particles
      fctx.globalCompositeOperation = "lighter";
      const speed = 0.0003 + mStress * 0.003;
      const pulse = 0.55 + breath * 0.45;
      const sz = Math.max(1.5, W / 600);
      for (let k = 0; k < P; k++) {
        const a = noise(px[k]! * 3 + clock, py[k]! * 3) * Math.PI * (2 + mStress * 3);
        px[k] = px[k]! + Math.cos(a) * speed * (1 + breath * 0.5) * timeScale;
        py[k] = py[k]! + Math.sin(a) * speed * (1 + breath * 0.5) * timeScale;
        pl[k] = pl[k]! - (0.004 + mStress * 0.01) * timeScale;
        if (pl[k]! <= 0 || px[k]! < 0 || px[k]! > 1 || py[k]! < 0 || py[k]! > 1) {
          px[k] = Math.random();
          py[k] = Math.random();
          pl[k] = 1;
        }
        if (mStress > 0.4 && Math.random() < mStress * 0.3) continue; // flicker
        const al = Math.sin(pl[k]! * Math.PI) * pulse * (0.25 + health * 0.6);
        // particle tint follows the same emerald → rust gradient as the field
        const pr = Math.round(150 + stress * 85);
        const pg = Math.round(255 - stress * 105);
        const pb = Math.round(190 - stress * 110);
        fctx.fillStyle = `rgba(${pr},${pg},${pb},${al})`;
        fctx.fillRect(px[k]! * W, py[k]! * H, sz, sz);
      }
      fctx.globalCompositeOperation = "source-over";
      // vignette for depth
      const vg = fctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.75)");
      fctx.fillStyle = vg;
      fctx.fillRect(0, 0, W, H);
    };

    let lastFrame = 0;
    const loop = (t: number) => {
      const timeScale = frameTimeScale(lastFrame ? t - lastFrame : FRAME_INTERVAL_MS);
      lastFrame = t;
      drawTimeline(t);
      drawField(timeScale);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      fitField.current = null;
    };
  }, []);

  // Resize only the drawing buffers: do not restart the field, Canopy or soundtrack.
  useEffect(() => {
    fitField.current?.();
  }, [immersive, resolution]);

  // ---------- sound (composed track, synced one-to-one with the timeline: 3 s per year, 108 s loop) ----------
  useEffect(() => {
    if (!sound) {
      audio.current?.pause();
      return;
    }
    if (!audio.current) {
      const track = new Audio(arthack.url);
      track.loop = true;
      track.preload = "auto";
      audio.current = track;
    }
    const track = audio.current;
    track.currentTime = audioTimeForIndex(live.current.index);
    const syncYear = () => {
      if (!live.current.playing) return;
      setIndex(indexForAudioTime(track.currentTime, live.current.years.length));
    };
    track.addEventListener("timeupdate", syncYear);
    return () => track.removeEventListener("timeupdate", syncYear);
  }, [sound]);

  // The recording is the playback clock. Pause/resume without resetting its
  // position; automatic year updates must never seek or restart the audio.
  useEffect(() => {
    const track = audio.current;
    if (!track || !sound) return;
    if (!playing) {
      track.pause();
      return;
    }
    track.play().catch(() => {});
  }, [playing, sound]);

  useEffect(() => {
    return () => {
      audio.current?.pause();
      audio.current = null;
    };
  }, []);

  // ---------- immersive ----------
  const enterImmersive = useCallback(() => {
    immersiveTerrainRegion.current = regionId;
    setImmersive(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, [regionId]);
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
      if ((e.target as HTMLElement)?.closest('select, input, [role="button"]')) return;
      if (e.key === "ArrowRight") selectYear(Math.min(live.current.years.length - 1, live.current.index + 1));
      if (e.key === "ArrowLeft") selectYear(Math.max(0, live.current.index - 1));
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
    selectYear(clamp(Math.floor(((e.clientX - r.left) / r.width) * years.length), 0, years.length - 1));
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
          <ForestCanvas regionId={immersive ? immersiveTerrainRegion.current : regionId} vhi={canopyVhi} rain={0} airTemp={10} flow={0} dataScope={isNationalScope(regionId, immersive) ? "national" : "regional"} />
          <div className="forest-spine">02 · Canopy</div>
        </section>

        <section className="forest-sheet forest-sheet-field" aria-label="The forest breathes">
          <canvas ref={fieldEl} className="forest-canvas" />
          <div className="forest-spine">03 · The forest breathes</div>
          <div className="forest-imm-year" aria-live="polite">
            <small>{year.vhi != null ? `VHI ${year.vhi.toFixed(1)} · ${band(year.vhi)}` : statusLabel(year)}{PRELIMINARY_YEARS[year.year] ? " · preliminary Jan–Oct" : ""}</small>
          </div>
        </section>
      </div>

      <footer className="forest-bar" ref={barRef}>
        <canvas
          ref={tlEl}
          className="forest-tl forest-clickable"
          onClick={pickYear}
          tabIndex={0}
          role="slider"
          aria-valuemin={first}
          aria-valuemax={last}
          aria-valuenow={year.year}
          aria-label={`Timeline ${first} to ${last}, annual Swiss VHI`}
        />
        <div className="forest-bar-row">
          <Button variant="ghost" type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : "Play"}
          </Button>
          <span className="forest-year">{year.year}</span>
          {PRELIMINARY_YEARS[year.year] && <span className="forest-prelim">preliminary · {PRELIMINARY_YEARS[year.year]}</span>}
          <Button variant="ghost" type="button" onClick={() => setSound((s) => !s)} aria-pressed={sound}>
            Sound {sound ? "on" : "off"}
          </Button>
          <select
            className="forest-region forest-only-panels"
            aria-label="Canopy region"
            value={regionId}
            onChange={(event) => setRegionId(Number(event.target.value))}
          >
            <option value={ALL_SWITZERLAND}>All of Switzerland</option>
            {REGION_IDS_BY_NAME.map((id) => (
              <option key={id} value={id}>
                {regionLabel(id)}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setLegend((l) => !l)}
            aria-expanded={legend}
            className="forest-only-panels"
          >
            Legend
          </Button>
          <AboutDialog container={wallRef} />
          {immersive && (
            <Button
              variant="ghost"
              type="button"
              aria-label={`Resolution ${resolution}, switch to ${resolution === "high" ? "low" : "high"}`}
              aria-pressed={resolution === "high"}
              title={resolution === "high" ? "Switch to low resolution for smoother playback" : "Switch to high resolution for sharper contours"}
              onClick={() => setResolution((value) => value === "high" ? "low" : "high")}
            >
              Resolution {resolution}
            </Button>
          )}
          <div className="forest-cta">
            {immersive ? (
              <Button variant="ghost" type="button" onClick={exitImmersive}>
                Exit · Esc
              </Button>
            ) : (
              <Button variant="ghost" type="button" className="forest-enter" onClick={enterImmersive}>
                Enter immersive mode
              </Button>
            )}
          </div>
        </div>
        <div className="forest-foot">
          <a className="forest-source forest-data-source forest-only-panels" href={SOURCE.url} target="_blank" rel="noreferrer">
            Data source
          </a>
          <ZauberparkConcept
            container={wallRef}
            open={zauberpark}
            onOpenChange={setZauberpark}
          />
        </div>

      </footer>

      {legend && !immersive && (
        <aside className="forest-legend">
          <p>
            <b>VHI</b> The Vegetation Health Index is a satellite reading of how well plants are doing. It runs from 0
            to 100: high means green, vigorous and unstressed; low means thirsty and struggling. Every value compares
            this year with the same place's own normal, so it tells you how unusual things feel rather than simply how
            green the map looks.
          </p>
          <p>
            <b>How to read it</b> swisstopo's scale: 60–100 excellent, 50–60 good, 40–50 normal, and below 40 the
            vegetation is under stress — the lower the number, the harsher the drought. Here 1992 sits in the stressed
            band and 2017 in the good band, just below excellent.
          </p>
          <p>
            <b>In this work</b> Monthly swisstopo / swissEO observations for 38 Swiss forest regions, 1991–2026,
            averaged per calendar year. The map and Canopy follow the region you select, or all of Switzerland; the
            breathing field and the timeline follow the national average.
          </p>

        </aside>
      )}
    </div>
  );
}
