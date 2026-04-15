import type { Checkpoint } from '../types/game.types';

export const CHECKPOINTS: Checkpoint[] = [
  // ── ZONA ATMÓSFERA (A1) ────────────────────────────────────────────
  {
    id: 1,
    altitudePct: 11,
    zone: 'atmosfera',
    cleared: false,
    exercise: {
      id: 'e1',
      skill: 'vocabulary',
      prompt: 'What is the English word for "perro"?',
      options: [
        { id: 'a', text: 'Cat',  correct: false },
        { id: 'b', text: 'Dog',  correct: true  },
        { id: 'c', text: 'Bird', correct: false },
        { id: 'd', text: 'Fish', correct: false },
      ],
    },
  },
  {
    id: 2,
    altitudePct: 22,
    zone: 'atmosfera',
    cleared: false,
    exercise: {
      id: 'e2',
      skill: 'grammar',
      prompt: 'Choose the correct sentence:',
      options: [
        { id: 'a', text: 'She go to school every day.',   correct: false },
        { id: 'b', text: 'She goes to school every day.', correct: true  },
        { id: 'c', text: 'She going to school every day.', correct: false },
        { id: 'd', text: 'She goed to school every day.', correct: false },
      ],
    },
  },
  {
    id: 3,
    altitudePct: 33,
    zone: 'atmosfera',
    cleared: false,
    exercise: {
      id: 'e3',
      skill: 'reading',
      prompt: '"The sky is clear and the stars are bright tonight." — What is the weather like?',
      options: [
        { id: 'a', text: 'Rainy',   correct: false },
        { id: 'b', text: 'Cloudy',  correct: false },
        { id: 'c', text: 'Clear',   correct: true  },
        { id: 'd', text: 'Stormy',  correct: false },
      ],
    },
  },

  // ── ZONA ÓRBITA (A2) ──────────────────────────────────────────────
  {
    id: 4,
    altitudePct: 44,
    zone: 'orbita',
    cleared: false,
    exercise: {
      id: 'e4',
      skill: 'grammar',
      prompt: 'Which sentence uses the Past Simple correctly?',
      options: [
        { id: 'a', text: 'I have visited Paris last year.',   correct: false },
        { id: 'b', text: 'I visited Paris last year.',        correct: true  },
        { id: 'c', text: 'I was visit Paris last year.',      correct: false },
        { id: 'd', text: 'I am visiting Paris last year.',    correct: false },
      ],
    },
  },
  {
    id: 5,
    altitudePct: 55,
    zone: 'orbita',
    cleared: false,
    exercise: {
      id: 'e5',
      skill: 'vocabulary',
      prompt: 'What does "ambitious" mean in Spanish?',
      options: [
        { id: 'a', text: 'Tímido',    correct: false },
        { id: 'b', text: 'Ambicioso', correct: true  },
        { id: 'c', text: 'Curioso',   correct: false },
        { id: 'd', text: 'Paciente',  correct: false },
      ],
    },
  },
  {
    id: 6,
    altitudePct: 66,
    zone: 'orbita',
    cleared: false,
    exercise: {
      id: 'e6',
      skill: 'reading',
      prompt: '"Despite the heavy rain, he decided to continue his journey." — Why is the situation remarkable?',
      options: [
        { id: 'a', text: 'He stopped because of the rain.',       correct: false },
        { id: 'b', text: 'He continued even though it was raining.', correct: true },
        { id: 'c', text: 'He enjoyed the rain very much.',         correct: false },
        { id: 'd', text: 'He called for help during the journey.', correct: false },
      ],
    },
  },

  // ── ZONA EL VACÍO (B1+) ───────────────────────────────────────────
  {
    id: 7,
    altitudePct: 77,
    zone: 'vacio',
    cleared: false,
    exercise: {
      id: 'e7',
      skill: 'grammar',
      prompt: 'Complete: "If I ___ more time, I would learn a new language."',
      options: [
        { id: 'a', text: 'have',    correct: false },
        { id: 'b', text: 'will have', correct: false },
        { id: 'c', text: 'had',     correct: true  },
        { id: 'd', text: 'has',     correct: false },
      ],
    },
  },
  {
    id: 8,
    altitudePct: 88,
    zone: 'vacio',
    cleared: false,
    exercise: {
      id: 'e8',
      skill: 'vocabulary',
      prompt: 'Choose the word that best completes: "The scientist made a groundbreaking ___ that changed our understanding of physics."',
      options: [
        { id: 'a', text: 'mistake',   correct: false },
        { id: 'b', text: 'discovery', correct: true  },
        { id: 'c', text: 'journey',   correct: false },
        { id: 'd', text: 'proposal',  correct: false },
      ],
    },
  },
  {
    id: 9,
    altitudePct: 97,
    zone: 'vacio',
    cleared: false,
    exercise: {
      id: 'e9',
      skill: 'reading',
      prompt: '"The phenomenon, although widely observed, remains poorly understood due to its inherently stochastic nature." — What is the main challenge?',
      options: [
        { id: 'a', text: 'It cannot be observed.',              correct: false },
        { id: 'b', text: 'Its random nature makes it hard to understand.', correct: true },
        { id: 'c', text: 'It has been studied too many times.', correct: false },
        { id: 'd', text: 'Scientists disagree on its existence.', correct: false },
      ],
    },
  },
];
