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
- ImmersiveForestProjection mirrors both continuously mounted artwork canvases into one screen-blended texture mapped onto photograph-space floor, trunks and foliage with a reflectance/occlusion mask; environmental presentation must never alter data, source drawing or playback.
- Mount the concept portal inside the Forest wall and let its dialog own keyboard dismissal while open, so it also works within document fullscreen without exiting the underlying immersive mode.
- Keep authentic concept photographs as CDN asset pointers and map the shared artwork canvas into photograph-space terrain geometry; this preserves venue landmarks and the exact evolving artwork without generating substitute scenery.
- Panel 2 retains the original Canopy on pure black and regional annual VHI outside immersion; canopy-scope selects the existing national annual mean only during immersion. Keep the same Canopy mounted with its entry terrain region fixed, screen-blended above the breathing canvas only under .is-immersive, so regional selection, planted groves and animation survive mode changes.
- Canopy health-field generation uses a region-independent seed in national scope and reads its initial health after terrain loading; this prevents regional patterns and stale asynchronous health from overriding immersive national data without changing terrain or drawing logic.
- Keep map framing independent of river-station data, so removing river features does not change geographical context or raster layers.
- The Canopy owns focus-scoped Delete/Backspace grove removal after its information boxes are removed, so planting and clearing remain available without replacement overlays.
- The chronological timeline is a canvas strip inside .forest-bar (drawn in the same rAF loop as the field); keep year selection, playback and keyboard stepping wired through the shared `index` state.
- Preserve the supplied monthly CSV as source of truth; annual-vhi owns parsing, bounded same-region month interpolation, coverage counts and equal-weight national aggregation so map, Canopy and timeline cannot diverge.
- Convert existing Swiss-grid region rings with proj4 in forest-regions; map polygons encode annual regional means rather than misrepresenting a single dated raster as annual data, and preserve the aerial and contour basemaps.
