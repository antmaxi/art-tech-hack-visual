import type { RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Instagram, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { container: RefObject<HTMLDivElement | null> };

const team = [
  ["Silvia Forcina Barrero", "Statistics & Computational Systems", "Data architecture, algorithmic evolution, and engineering of visual and acoustic systems, with project coordination."],
  ["Manuela Pita Vidal", "Artistic Direction & Curation", "Exhibition concept, artistic direction, visual identity, and website design, including AI-assisted audiovisual production and visual archive curation."],
  ["Anton Maksimov", "Sound Design & Composition", "Synthesis of breath fragments via ElevenLabs and custom data-driven sound design, with refinement of the visual components and set-up of the tools."],
  ["Tamari Karkhnishvili", "Data Analytics in the Humanities", "Canopy algorithmic evolution and interactive real-time visuals."],
];

function GithubMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function AboutDialog({ container }: Props) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="forest-zauber-entry forest-about-entry">ABOUT</Button>
      </Dialog.Trigger>
      <Dialog.Portal container={container.current}>
        <Dialog.Content className="about-view" onEscapeKeyDown={(e) => e.stopPropagation()}>
          <article className="about-body">
            <Dialog.Title asChild><h1>The Forest’s Breath</h1></Dialog.Title>
            <p className="about-sub">A Somatic Archive of Swiss Forest Resilience (1991–2026)</p>
            <p>Every minute, a human body breathes between twelve and sixteen times. In sickness or fever, our breath turns rapid, shallow, and strained. In health, it eases into an expansive, calming rhythm.</p>
            <p>We share this biology with the forest. Trees are the external lungs of our planet, breathing carbon, water, and oxygen into the atmosphere. Yet when climate distress strikes, the data that tracks their suffering remains buried in spreadsheets and technical reports.</p>
            <p><em>The Forest’s Breath</em> translates 36 years of Swiss satellite observations into a living, sensory experience—letting you feel ecological health and distress through <strong>sound, colour, and movement</strong>.</p>
            <h2>Experiencing Vitality</h2>
            <dl>
              <dt>Movement</dt><dd>The installation’s pulse mirrors the forest’s biological stress. In periods of severe drought, the respiration becomes frantic, rapid, and shallow. As the landscape recovers, the wave slows into a deep, meditative rhythm.</dd>
              <dt>Colour</dt><dd>The visual palette follows the living state of chlorophyll: deep alpine emerald during periods of peak vitality, fading into dry ochre and feverish copper-rust against dark voids as distress sets in.</dd>
              <dt>Sound</dt><dd>An original acoustic score is locked directly to time and data. Moving from historical droughts to peak recovery and into today’s uncertain climate trajectory, the sound shifts between acoustic tension and warm, resonant harmony.</dd>
              <dt>Physical Space</dt><dd>Conceived for public light installations and festivals (such as Zauberpark at Zurich Airport), the work is designed to project the living breath of data directly onto real canopies and forest pathways—turning climate science into an immediate, communal encounter.</dd>
            </dl>
            <p className="about-moments"><em>Key moments to explore:</em> <strong>1992</strong> (vegetation stress), <strong>2017</strong> (peak vitality), and <strong>2025–2026</strong> (emerging climate pressure).</p>
            <h2>The Team</h2>
            <p><em>The Forest’s Breath</em> was created at the intersection of four disciplines:</p>
            <dl>
              {team.map(([n, r, d, study]) => (
                <div key={n}>
                  <dt>{n} — <em>{r}</em></dt>
                  {study && <dd><em>{study}</em></dd>}
                  <dd>{d}</dd>
                  {n === "Manuela Pita Vidal" && (
                    <dd>
                      <a href="https://www.instagram.com/pitart__/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs">
                        <Instagram size={12} aria-hidden="true" />
                        @pitart__
                      </a>
                    </dd>
                  )}
                </div>
              ))}
            </dl>
            <p className="about-source">Data source: Federal Office for the Environment (FOEN) &amp; swisstopo (swissEO Vegetation Health Index, 1991–2026).</p>
            <p className="about-repo">
              <a href="https://github.com/antmaxi/art-tech-hack-visual" target="_blank" rel="noopener noreferrer" aria-label="View the project source code on GitHub">
                <GithubMark />
                github.com/antmaxi/art-tech-hack-visual
              </a>
            </p>
          </article>
          <Dialog.Close asChild>
            <Button variant="ghost" size="icon" className="zauber-close" aria-label="Close About" title="Close"><X /></Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
