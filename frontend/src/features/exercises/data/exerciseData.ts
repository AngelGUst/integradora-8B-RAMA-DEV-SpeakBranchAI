// ─── Types ────────────────────────────────────────────────────────────────────

export interface MCQQuestion {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface ReadingExercise {
  id: string;
  type: 'reading';
  skill: 'reading';
  level: string;
  title: string;
  passage: string;
  questions: MCQQuestion[];
  maxXP: number;
}

export interface SpeakingExercise {
  id: string;
  type: 'speaking';
  skill: 'speaking' | 'shadowing';
  level: string;
  title: string;
  instruction: string;
  phrase: string;
  translation: string;
  audioUrl?: string;
  maxXP: number;
}

export interface ComprehensionExercise {
  id: string;
  type: 'comprehension';
  skill: 'comprehension';
  level: string;
  title: string;
  /** Read aloud via browser TTS. Hidden from user during quiz. */
  audioText: string;
  audioUrl?: string;
  maxReplays: number;
  questions: MCQQuestion[];
  maxXP: number;
}

export interface WritingExercise {
  id: string;
  type: 'writing';
  skill: 'writing';
  level: string;
  title: string;
  prompt: string;
  maxXP: number;
}

export type AnyExercise = ReadingExercise | SpeakingExercise | ComprehensionExercise | WritingExercise;

// ─── A1 Exercises ─────────────────────────────────────────────────────────────

const a1_1: ReadingExercise = {
  id: 'a1-1',
  type: 'reading',
  skill: 'reading',
  level: 'A1',
  title: 'Greetings & Introductions',
  passage:
    "My name is Sarah. I am from Canada. I am 25 years old. I like music and sports. " +
    "My favorite color is blue. I have a dog named Max. My friend's name is Tom. " +
    "Tom is from England. He is a teacher. We meet every Monday at the park.",
  questions: [
    {
      id: 'q1',
      text: 'Where is Sarah from?',
      options: ['Mexico', 'Canada', 'England', 'France'],
      correctIndex: 1,
      explanation: 'The text says "I am from Canada."',
    },
    {
      id: 'q2',
      text: 'How old is Sarah?',
      options: ['20 years old', '22 years old', '25 years old', '30 years old'],
      correctIndex: 2,
      explanation: 'The text says "I am 25 years old."',
    },
    {
      id: 'q3',
      text: "What is Sarah's favorite color?",
      options: ['Red', 'Green', 'Blue', 'Yellow'],
      correctIndex: 2,
      explanation: 'The text says "My favorite color is blue."',
    },
    {
      id: 'q4',
      text: "What is Sarah's dog named?",
      options: ['Lucky', 'Max', 'Buddy', 'Tom'],
      correctIndex: 1,
      explanation: 'The text says "I have a dog named Max."',
    },
  ],
  maxXP: 10,
};

const a1_2: SpeakingExercise = {
  id: 'a1-2',
  type: 'speaking',
  skill: 'speaking',
  level: 'A1',
  title: 'Personal Pronouns',
  instruction: 'Read the following sentence out loud in English clearly.',
  phrase: 'My name is Maria. I am a student. She is my teacher. We are friends.',
  translation: 'My name is Maria. I am a student. She is my teacher. We are friends.',
  maxXP: 10,
};

const a1_3: ReadingExercise = {
  id: 'a1-3',
  type: 'reading',
  skill: 'reading',
  level: 'A1',
  title: 'Numbers & Colors',
  passage:
    "There are five red apples and three blue books on the table. " +
    "Two green bags are near the door. The classroom has twenty chairs. " +
    "There are twelve windows and one large blackboard on the wall.",
  questions: [
    {
      id: 'q1',
      text: 'How many red apples are there?',
      options: ['Three', 'Five', 'Seven', 'Twelve'],
      correctIndex: 1,
      explanation: '"Five red apples" — the number five is correct.',
    },
    {
      id: 'q2',
      text: 'What color are the bags near the door?',
      options: ['Blue', 'Red', 'Green', 'Yellow'],
      correctIndex: 2,
      explanation: '"Two green bags are near the door."',
    },
    {
      id: 'q3',
      text: 'How many chairs are in the classroom?',
      options: ['Twelve', 'Five', 'Twenty', 'Three'],
      correctIndex: 2,
      explanation: '"The classroom has twenty chairs."',
    },
  ],
  maxXP: 10,
};

const a1_4: ReadingExercise = {
  id: 'a1-4',
  type: 'reading',
  skill: 'reading',
  level: 'A1',
  title: 'A1 Checkpoint',
  passage:
    "Lisa is a doctor. She works at a big hospital in New York. Every day she wakes up at six o'clock. " +
    "She drinks coffee and reads the news. Her hospital has fifty doctors and one hundred nurses. " +
    "Lisa has two children: a boy named Peter and a girl named Anna. They are seven and nine years old.",
  questions: [
    {
      id: 'q1',
      text: "What is Lisa's job?",
      options: ['Teacher', 'Nurse', 'Doctor', 'Engineer'],
      correctIndex: 2,
      explanation: '"Lisa is a doctor."',
    },
    {
      id: 'q2',
      text: 'What time does Lisa wake up?',
      options: ['Five o\'clock', 'Six o\'clock', 'Seven o\'clock', 'Eight o\'clock'],
      correctIndex: 1,
      explanation: '"She wakes up at six o\'clock."',
    },
    {
      id: 'q3',
      text: 'How many nurses does the hospital have?',
      options: ['Fifty', 'Sixty', 'One hundred', 'Two hundred'],
      correctIndex: 2,
      explanation: '"one hundred nurses"',
    },
    {
      id: 'q4',
      text: 'How old is Peter?',
      options: ['Five', 'Six', 'Seven', 'Nine'],
      correctIndex: 2,
      explanation: 'The text says Peter and Anna are seven and nine years old — Peter is the boy so seven.',
    },
  ],
  maxXP: 20,
};

const a1_5: SpeakingExercise = {
  id: 'a1-5',
  type: 'speaking',
  skill: 'shadowing',
  level: 'A1',
  title: 'Listen: Daily Routine',
  instruction:
    'Listen to the audio carefully and repeat exactly what you hear. ' +
    'You will not see the text while recording.',
  phrase:
    "Every morning I wake up at seven. I eat breakfast and go to work at eight thirty.",
  translation:
    'Every morning I wake up at seven. I have breakfast and go to work at eight thirty.',
  maxXP: 20,
};

const a1_6: ComprehensionExercise = {
  id: 'a1-6',
  type: 'comprehension',
  skill: 'comprehension',
  level: 'A1',
  title: 'Home Vocabulary',
  audioText:
    "Welcome to my home. This is the living room. There is a big sofa and a television. " +
    "The kitchen has a refrigerator, a stove, and a small table with four chairs. " +
    "My bedroom has one bed, two lamps, and a large window. " +
    "The bathroom has a shower and a mirror.",
  maxReplays: 3,
  questions: [
    {
      id: 'q1',
      text: 'What is in the living room?',
      options: [
        'A bed and a mirror',
        'A sofa and a television',
        'A stove and a refrigerator',
        'Four chairs and a lamp',
      ],
      correctIndex: 1,
      explanation: '"There is a big sofa and a television."',
    },
    {
      id: 'q2',
      text: 'How many chairs are in the kitchen?',
      options: ['Two', 'Three', 'Four', 'Five'],
      correctIndex: 2,
      explanation: '"a small table with four chairs"',
    },
    {
      id: 'q3',
      text: 'What does the bathroom have?',
      options: [
        'A bathtub and a television',
        'A sofa and a mirror',
        'A shower and a mirror',
        'A stove and a lamp',
      ],
      correctIndex: 2,
      explanation: '"The bathroom has a shower and a mirror."',
    },
  ],
  maxXP: 20,
};

// ─── Export map ───────────────────────────────────────────────────────────────

export const EXERCISES: Record<string, AnyExercise> = {
  'a1-1': a1_1,
  'a1-2': a1_2,
  'a1-3': a1_3,
  'a1-4': a1_4,
  'a1-5': a1_5,
  'a1-6': a1_6,
};
