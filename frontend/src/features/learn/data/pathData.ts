export type SkillType =
  | 'reading'
  | 'speaking'
  | 'shadowing'
  | 'comprehension'
  | 'checkpoint'
  | 'exam';

export type NodeState = 'completed' | 'current' | 'available' | 'locked';
export type PosX = 'left' | 'center' | 'right';

export interface LessonNode {
  id: string;
  title: string;
  skill: SkillType;
  state: NodeState;
  xpMax: number;
  posX: PosX;
}

export interface CEFRSection {
  level: string;
  label: string;
  description: string;
  accent: 'emerald' | 'cyan' | 'sky' | 'indigo' | 'violet' | 'pink';
  xpRange: [number, number];
  nodes: LessonNode[];
}

export const LEARN_PATH: CEFRSection[] = [
  {
    level: 'A1',
    label: 'Beginner',
    description: 'Vocabulario esencial y estructuras básicas',
    accent: 'emerald',
    xpRange: [0, 200],
    nodes: [
      { id: 'a1-1', title: 'Greetings & Introductions',  skill: 'reading',       state: 'completed', xpMax: 10, posX: 'center' },
      { id: 'a1-2', title: 'Personal Pronouns',           skill: 'speaking',      state: 'completed', xpMax: 10, posX: 'right'  },
      { id: 'a1-3', title: 'Numbers & Colors',             skill: 'reading',       state: 'completed', xpMax: 10, posX: 'center' },
      { id: 'a1-4', title: 'A1 Checkpoint',                skill: 'checkpoint',    state: 'completed', xpMax: 20, posX: 'left'   },
      { id: 'a1-5', title: 'Listen: Daily Routine',        skill: 'shadowing',     state: 'current',   xpMax: 20, posX: 'center' },
      { id: 'a1-6', title: 'Home Vocabulary',              skill: 'comprehension', state: 'available', xpMax: 20, posX: 'right'  },
      { id: 'a1-7', title: 'Present Simple Verbs',         skill: 'speaking',      state: 'locked',    xpMax: 20, posX: 'center' },
      { id: 'a1-8', title: 'A1 Final Exam',                skill: 'exam',          state: 'locked',    xpMax: 50, posX: 'left'   },
    ],
  },
  {
    level: 'A2',
    label: 'Elementary',
    description: 'Expresión simple y comprensión situacional',
    accent: 'cyan',
    xpRange: [200, 500],
    nodes: [
      { id: 'a2-1', title: 'Simple Past Tense',            skill: 'reading',       state: 'locked', xpMax: 20, posX: 'center' },
      { id: 'a2-2', title: 'Daily Routines',               skill: 'speaking',      state: 'locked', xpMax: 20, posX: 'right'  },
      { id: 'a2-3', title: 'Listen: At the Restaurant',    skill: 'shadowing',     state: 'locked', xpMax: 20, posX: 'center' },
      { id: 'a2-4', title: 'A2 Checkpoint',                skill: 'checkpoint',    state: 'locked', xpMax: 30, posX: 'left'   },
      { id: 'a2-5', title: 'Describing Places',            skill: 'comprehension', state: 'locked', xpMax: 30, posX: 'center' },
      { id: 'a2-6', title: 'A2 Final Exam',                skill: 'exam',          state: 'locked', xpMax: 50, posX: 'right'  },
    ],
  },
  {
    level: 'B1',
    label: 'Intermediate',
    description: 'Comunicación en situaciones cotidianas complejas',
    accent: 'sky',
    xpRange: [500, 1000],
    nodes: [
      { id: 'b1-1', title: 'Present Perfect',              skill: 'reading',       state: 'locked', xpMax: 20, posX: 'center' },
      { id: 'b1-2', title: 'Opinions & Debates',           skill: 'speaking',      state: 'locked', xpMax: 30, posX: 'right'  },
      { id: 'b1-3', title: 'News Shadowing',               skill: 'shadowing',     state: 'locked', xpMax: 30, posX: 'center' },
      { id: 'b1-4', title: 'B1 Checkpoint',                skill: 'checkpoint',    state: 'locked', xpMax: 30, posX: 'left'   },
      { id: 'b1-5', title: 'Conditionals',                 skill: 'comprehension', state: 'locked', xpMax: 30, posX: 'center' },
      { id: 'b1-6', title: 'B1 Final Exam',                skill: 'exam',          state: 'locked', xpMax: 50, posX: 'right'  },
    ],
  },
  {
    level: 'B2',
    label: 'Upper-Intermediate',
    description: 'Fluidez y comprensión de textos complejos + TOEFL',
    accent: 'indigo',
    xpRange: [1000, 2000],
    nodes: [
      { id: 'b2-1', title: 'Advanced Reading Comp.',       skill: 'reading',       state: 'locked', xpMax: 30, posX: 'center' },
      { id: 'b2-2', title: 'Fluency & Pronunciation',      skill: 'speaking',      state: 'locked', xpMax: 30, posX: 'right'  },
      { id: 'b2-3', title: 'Academic Lecture Shadowing',   skill: 'shadowing',     state: 'locked', xpMax: 30, posX: 'center' },
      { id: 'b2-4', title: 'B2 Checkpoint',                skill: 'checkpoint',    state: 'locked', xpMax: 30, posX: 'left'   },
      { id: 'b2-5', title: 'Complex Listening',            skill: 'comprehension', state: 'locked', xpMax: 30, posX: 'center' },
      { id: 'b2-6', title: 'TOEFL Simulacro',              skill: 'exam',          state: 'locked', xpMax: 100, posX: 'right' },
    ],
  },
];
