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
- Keep authentic concept photographs as CDN asset pointers and map the shared artwork canvas into photograph-space terrain geometry; this preserves venue landmarks and the exact evolving artwork without generating substitute scenery.
- Panel 2 is the Canopy (src/components/ForestCanvas.tsx, copied from the zurich-water-and-watts project) on a pure black ground; it receives the selected year's observed August VHI via getRegionVhi(id, vhi) — missing years keep the hypothetical field, never interpolate.
- Keep map framing independent of river-station data, so removing river features does not change geographical context or raster layers.
- The Canopy owns focus-scoped Delete/Backspace grove removal after its information boxes are removed, so planting and clearing remain available without replacement overlays.
- The chronological timeline is a canvas strip inside .forest-bar (drawn in the same rAF loop as the field); keep year selection, playback and keyboard stepping wired through the shared `index` state.
