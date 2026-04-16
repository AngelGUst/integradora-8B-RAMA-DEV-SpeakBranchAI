export type SkillType =
  | 'reading'
  | 'speaking'
  | 'shadowing'
  | 'comprehension'
  | 'writing'
  | 'checkpoint'
  | 'exam';

export type NodeState = 'completed' | 'current' | 'available' | 'locked' | 'replay';
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

// xpRange for A1–B2 are placeholders; real values come from /system/levels/ at runtime.
// C1–C2 are not yet in SystemConfig so their ranges are kept here as static references.
export const LEARN_PATH: CEFRSection[] = [
  { level: 'A1', label: 'Beginner',           description: 'Vocabulario esencial y estructuras básicas',               accent: 'emerald', xpRange: [0, 0],       nodes: [] },
  { level: 'A2', label: 'Elementary',         description: 'Expresión simple y comprensión situacional',               accent: 'cyan',    xpRange: [0, 0],       nodes: [] },
  { level: 'B1', label: 'Intermediate',       description: 'Comunicación en situaciones cotidianas complejas',          accent: 'sky',     xpRange: [0, 0],       nodes: [] },
  { level: 'B2', label: 'Upper-Intermediate', description: 'Fluidez y comprensión de textos complejos',                accent: 'indigo',  xpRange: [0, 0],       nodes: [] },
  { level: 'C1', label: 'Advanced',           description: 'Expresión fluida y comprensión de textos especializados',   accent: 'violet',  xpRange: [2000, 4000], nodes: [] },
  { level: 'C2', label: 'Proficient',         description: 'Dominio completo del idioma a nivel nativo',               accent: 'pink',    xpRange: [4000, 8000], nodes: [] },
];
