<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the Zauberpark concept in a scoped modal that mirrors the existing field canvas rather than remounting the installation, so the timeline, evolving animation and shared audio survive opening and closing it.
- Mount the concept portal inside the Forest wall and let its dialog own keyboard dismissal while open, so it also works within document fullscreen without exiting the underlying immersive mode.
- Keep the Zauberpark static proposal board confined to its existing dialog component and CSS module, using the unchanged photograph and a secondary static sketch without sampled canvases; this isolates presentation changes from the installation and preserves Immersion Mode.
- Panel 2 retains the original Canopy on pure black and regional annual VHI outside immersion; canopy-scope selects the existing national annual mean only during immersion. Keep the same Canopy mounted with its entry terrain region fixed, screen-blended above the breathing canvas only under .is-immersive, so regional selection and animation survive mode changes.
- Canopy health-field generation uses a region-independent seed in national scope and reads its initial health after terrain loading; this prevents regional patterns and stale asynchronous health from overriding immersive national data without changing terrain or drawing logic.
- Keep map framing independent of river-station data, so removing river features does not change geographical context or raster layers.
- Use map-framing to fit the Place map to the selected region (or Switzerland) on selection and actual map-element resize, observing the map itself and ignoring hidden immersive sizes; stop pending map motion before fitting so layout transitions cannot leave stale framing, while playback preserves manual zoom and pan.
- The Canopy is not a planting surface: clicking it must never add trees, so no blue planted crowns may appear; hover wake and drag gust remain the only pointer responses. Keep planting removed unless the user asks for it back.
- The chronological timeline is a canvas strip inside .forest-bar (drawn in the same rAF loop as the field); keep year selection, playback and keyboard stepping wired through the shared `index` state.
- While sound is enabled, derive automatic year changes from the continuous recording clock; only explicit year selection seeks audio, so rendering delays cannot interrupt playback and pause/resume preserves position.
- Preserve the supplied monthly CSV as source of truth; annual-vhi owns parsing, bounded same-region month interpolation, coverage counts and equal-weight national aggregation so map, Canopy and timeline cannot diverge.
- Convert existing Swiss-grid region rings with proj4 in forest-regions; map polygons encode annual regional means rather than misrepresenting a single dated raster as annual data, and preserve the aerial and contour basemaps.
- Keep immersive topographic quality in field-resolution with bounded offscreen sample budgets; entering immersion always restores the highest quality via `resolutionOnImmersiveEnter`, switching quality resizes buffers without remounting animation, Canopy or audio, and leaves normal-panel resolution unchanged.
- Drive field contour/breath/particle increments by real elapsed time via `frameTimeScale` in field-resolution, so high and low resolution move the lines at the same speed; never advance the field by per-frame increments alone, since high resolution renders fewer frames per second.
- Region menus list names alphabetically via `REGION_IDS_BY_NAME` (German collation, so umlaut names stay in place); keep "All of Switzerland" pinned first and never order a user-facing region list by id.
