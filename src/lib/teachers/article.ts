import type { LabMeta } from '@/lib/labs/types';

export type ArticleSection = { heading: string; paragraphs: string[] };

export function teacherArticle(lab: LabMeta) {
  const myths = lab.misconceptions?.length ? lab.misconceptions : [lab.misconception];
  const sections: ArticleSection[] = [
    { heading: 'Before the lesson', paragraphs: [
      lab.objective,
      'Open the model before the lesson and choose a view that makes the important feature easy to see. Drag to rotate, and use the on-screen controls to change one variable at a time. The Shortcuts button lists the keyboard shortcuts.',
      lab.controls.playback === false
        ? 'Ask students to predict the result before you change a setting. Compare the new view with the starting state.'
        : 'Pause the animation at a useful moment. Ask students what should happen next, then play it to test their explanation.',
    ] },
    { heading: 'Guide the demonstration', paragraphs: lab.teacher.script.split(/\n+/).filter(Boolean) },
    { heading: 'Discuss a common misconception', paragraphs: myths.map(m => `“${m.claim}” ${m.truth}`) },
    { heading: 'Build the explanation', paragraphs: lab.why },
    { heading: 'Teaching notes', paragraphs: lab.teacher.pitfalls },
    { heading: 'Check understanding', paragraphs: [
      `Open Check for ${lab.questions.length} questions. Ask students to explain their choice before revealing the answer.`,
      'Return to the opening photograph. Ask students to identify one visible feature and explain which part of the model helps account for it.',
    ] },
  ];
  return { title: lab.title, kicker: 'A lesson for your classroom or geography club', sections,
    wordCount: sections.flatMap(s => s.paragraphs).join(' ').trim().split(/\s+/).length };
}
