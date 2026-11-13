import type { LabMeta } from '../labs/types';
import { defaultParams } from '../labs/defaults';

export const LESSON_PHASES = [
  { name: 'Observe' },
  { name: 'Tinker' },
  { name: 'Explain' },
  { name: 'Check' },
] as const;

/**
 * Start each shared lesson from the same paused, inspectable state. With the full lesson the link
 * also spells out the default settings; without it (a list of labs) the lab applies the same
 * defaults when it opens.
 */
export function lessonLink(lab: Pick<LabMeta, 'slug'> & Partial<Pick<LabMeta, 'controls'>>, step = 0) {
  const q = new URLSearchParams({ layout: 'projector', lesson: '1', step: String(step), t: '.4', labels: '1' });
  if (lab.controls) {
    for (const [key, value] of Object.entries(defaultParams({ controls: lab.controls }))) q.set(key, String(value));
    if (lab.controls.slice) q.set('slice', '.42');
  }
  return `/lab/${lab.slug}?${q}`;
}

export function lessonOutline(lab: LabMeta, origin: string) {
  const exit = lab.questions[0];
  return [
    `${lab.title} — Geolens lesson notes`, `Aim: ${lab.objective}`,
    ...LESSON_PHASES.flatMap((phase, i) => [
      `${i + 1}. ${phase.name}`, lab.steps[i]?.body ?? '', `${origin}${lessonLink(lab, i)}`,
    ]),
    'Guide the demonstration', lab.teacher.script,
    'Misconceptions', ...lab.misconceptions.map(m => `Claim: ${m.claim}\nCorrection: ${m.truth}`),
    'Teaching notes', ...lab.teacher.pitfalls,
    ...(exit ? ['Exit question', exit.prompt, ...exit.choices.map((c, i) => `${i + 1}. ${c}`), `Answer: ${exit.answer + 1}. ${exit.explain}`] : []),
    'Sources', ...lab.sources.map(s => `${s.label}${s.href ? ` — ${s.href}` : ''}`),
    'The model helps explain a process. Use the linked sources when you need measurements from a particular place.',
  ].filter(Boolean).join('\n\n');
}
