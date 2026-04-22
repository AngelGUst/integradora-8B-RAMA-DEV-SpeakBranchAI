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

// xpRange for A1-B2 are placeholders; real values come from /system/levels/ at runtime.
// C1-C2 are not yet in SystemConfig so their ranges are kept here as static references.
export const LEARN_PATH: CEFRSection[] = [
  { level: 'A1', label: 'Beginner',           description: 'Essential vocabulary and basic structures',               accent: 'emerald', xpRange: [0, 0],       nodes: [] },
  { level: 'A2', label: 'Elementary',         description: 'Simple expression and situational comprehension',               accent: 'cyan',    xpRange: [0, 0],       nodes: [] },
  { level: 'B1', label: 'Intermediate',       description: 'Communication in complex everyday situations',          accent: 'sky',     xpRange: [0, 0],       nodes: [] },
  { level: 'B2', label: 'Upper-Intermediate', description: 'Fluency and comprehension of complex texts',                accent: 'indigo',  xpRange: [0, 0],       nodes: [] },
  { level: 'C1', label: 'Advanced',           description: 'Fluent expression and comprehension of specialized texts',   accent: 'violet',  xpRange: [2000, 4000], nodes: [] },
  { level: 'C2', label: 'Proficient',         description: 'Full command of the language at native level',               accent: 'pink',    xpRange: [4000, 8000], nodes: [] },
];

