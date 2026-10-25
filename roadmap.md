# Main-interface forest mockup
- [x] Refine only the concept environment using the supplied annotated reference; retain live/still projection and add the physical festival sign.
- [x] Verify concept controls and unchanged Immersion Mode.

# Map navigation correction
- [x] Observe the actual map size and replace timing-based framing; retain Leaflet zoom and pan.
- [x] Verify menu selection, manual navigation, layout changes and immersion return.

# Immersive national Canopy
- [x] Decouple immersive health-field data from region identity and prevent stale health during terrain loading.
- [x] Verify all-region national values, selection independence during immersion, and regional restoration.
- [x] Layer the existing Canopy with the breathing artwork only in Immersion Mode, using national annual VHI.
- [x] Verify national scope, unchanged timeline, and restoration of the original regional interface.

# Zauberpark extension
- [x] Add discreet entry and full-screen concept view without replacing the existing artwork.
- [x] Translate the existing canvas into an illustrative outdoor setting with still/animation and optional shared sound.
- [x] Verify desktop/mobile, close/Escape, and existing timeline, legend and immersive controls.

# Authentic venue refinement
- [x] Find an authentic Zauberpark / Airport Park photograph or request one if unavailable.
- [x] Replace only the environment and integrate the live projection into the real setting.
- [x] Verify the concept and preserved controls.

# Canopy integration + bottom timeline
- [x] Copy Canopy (ForestCanvas) code and its data/geo libs into the project; add its colour tokens.
- [x] Replace panel 2 (time/memory) with the Canopy, preserving its design and pure black background.
- [x] Rebuild the footer as a chronological bottom timeline with year markers and click selection.
- [x] Sync selected year into the Canopy (real VHI only; missing years keep the labelled hypothetical field).
- [x] Verify build, tests and browser behaviour (timeline selection, canopy year switch, immersive, Zauberpark).

# Targeted overlay and river-feature cleanup
- [x] Remove the specified panel captions and river markers without changing map framing or data layers.
- [x] Remove Canopy information boxes while retaining planting and focus-scoped Delete/Backspace grove removal.
- [x] Verify timeline, artwork, map layers and existing controls; five existing tests pass and browser checks report no runtime errors.

# Swiss annual and regional data
- [x] Remove only the top-right Forest title and year-range markup from panel 3, preserving the artwork.
- [x] Import supplied monthly data; aggregate annual regional and national VHI with bounded monthly interpolation and provenance.
- [x] Frame all Switzerland, select any supplied region on the map, and synchronise the unchanged Canopy.
- [x] Use national annual means for the breathing field and timeline; play 1991–2025 at five seconds per year.
- [x] Verify data rules, map selection, timeline, Canopy, and preserved controls.

# Authentic Zauberpark photograph mockup
- [x] Replace the mockup background plate with the supplied authentic Zauberpark forest photograph.
- [x] Re-fit projection surfaces (trunks, upper canopy, floor/path) and sign/visitor exclusions to the new composition.
- [x] Verify the mockup in the browser and confirm the immersive website is unchanged.

# Custom soundtrack + low-VHI contrast
- [x] Replace the synthesised drone with the supplied 108 s track, synced one-to-one with the timeline (3 s per year).
- [x] Low VHI: vibrant thin rust contour lines over near-black with only a slight residual gradient.
- [x] Verify tests, audio loading, and drought-vs-peak contrast in the browser.

# Static photograph mockup
- [x] Replace the projected mockup entirely with the supplied photograph as a single static image at original proportions and quality.
- [x] Remove projections, sampled canvases, Still/Breathing and sound controls, captions, disclaimers, borders, gradients and motion.
- [x] Verify the photograph is served unaltered, the mockup closes, and the three-panel interface plus Immersion Mode are unchanged.

# GitHub presence
- [x] Add a clickable GitHub logo link to the repository at the end of the About text.
- [ ] Connect the project to https://github.com/antmaxi/art-tech-hack-visual — blocker: Git sync can only create a new private repository, it cannot link one that already exists; needs the user's choice in Project settings → Git.

# README rewrite
- [x] Replace the placeholder title with the project name; describe the three panels, Immersion Mode and the soundtrack.
- [x] Document the FOEN/swisstopo VHI pipeline with figures verified against the supplied CSV; list the team as in the About section.

# README picture examples
- [x] Store the three supplied screenshots in docs/ and link them from the README: general overview, Immersion Mode, and the light-festival mockup.

# Round restart pause
- [x] Keep the final picture moving very slowly during the 1-second silent break before restarting at 1991.
- [x] Verify slow picture motion and silence in the live preview, return to 1991, and unchanged 1000 ms restart timer in tests.
