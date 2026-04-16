from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction

from courses.models import Course, Lesson, CourseEnrollment
from exams.models import Exam, ExamQuestion
from questions.models import Question, QuestionVocabulary
from system_config.models import SystemConfig
from users.models import UserProgress
from vocabulary.models import Vocabulary


class Command(BaseCommand):
    help = 'Seed initial data for local development.'

    def handle(self, *args, **options):
        with transaction.atomic():
            admin_user = self._create_admin_user()
            student_user = self._create_student_user()

            self._create_system_config()
            self._create_exams()
            self._create_user_progress(student_user)
            courses = self._create_courses()
            self._create_lessons(courses)
            self._enroll_student(student_user, courses)
            vocab_items = self._create_vocabulary(admin_user)
            questions = self._create_questions(admin_user)
            self._link_question_vocabulary(questions, vocab_items)
            self._create_exam_questions(questions)

        self.stdout.write(self.style.SUCCESS('Seed data created successfully.'))

    def _create_admin_user(self):
        User = get_user_model()
        email = 'admin@speakbranch.local'
        raw_password = 'Admin123!'

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': 'Admin',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
                'password_hash': make_password(raw_password),
            },
        )

        if created:
            user.set_password(raw_password)
            user.save(update_fields=['password'])

        return user

    def _create_student_user(self):
        User = get_user_model()
        email = 'student@speakbranch.local'
        raw_password = 'Student123!'

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': 'Student',
                'role': 'STUDENT',
                'level': 'A1',
                'is_active': True,
                'password_hash': make_password(raw_password),
            },
        )

        if created:
            user.set_password(raw_password)
            user.save(update_fields=['password'])

        return user

    def _create_user_progress(self, user):
        UserProgress.objects.get_or_create(
            user=user,
            defaults={
                'level': user.level,
                'total_xp': 0,
                'level_start_xp': 0,
                'streak_freeze': 0,
                'skill_metrics': {},
            },
        )

    def _create_system_config(self):
        # SystemConfig defaults are set by the model (xp_level_a1=200, etc.).
        # Nothing to seed here — the get_or_create in SystemConfig.get() handles it.
        SystemConfig.get()

    def _create_exams(self):
        cfg = SystemConfig.get()
        xp_map = {
            'A1': cfg.xp_level_a1,
            'A2': cfg.xp_level_a2,
            'B1': cfg.xp_level_b1,
            'B2': cfg.xp_level_b2,
        }

        level_up_targets = {
            'A1': 'A2',
            'A2': 'B1',
            'B1': 'B2',
        }
        for level, next_level in level_up_targets.items():
            required_xp = int(xp_map.get(next_level, 0) or 0)
            Exam.objects.update_or_create(
                level=level,
                type='LEVEL_UP',
                defaults={
                    'name': f'Examen de Nivel {level}',
                    'description': f'Examen para subir de {level} al siguiente nivel CEFR.',
                    'xp_required': required_xp,
                    'passing_score': 70,
                    'time_limit_minutes': 30,
                    'question_count': 10,
                    'is_active': True,
                },
            )

        Exam.objects.filter(type='LEVEL_UP', level__in=['B2', 'C1', 'C2']).update(is_active=False)

        Exam.objects.update_or_create(
            level='A1',
            type='DIAGNOSTIC',
            defaults={
                'name': 'Placement Test CEFR',
                'description': 'Diagnóstico inicial para asignar nivel CEFR.',
                'xp_required': 0,
                'passing_score': 0,
                'time_limit_minutes': 20,
                'question_count': 15,
                'is_active': True,
            },
        )

    def _create_courses(self):
        courses = []
        seed_courses = [
            ('Starter English A1', 'A1', 'Foundations of English basics.'),
            ('Everyday English A2', 'A2', 'Intermediate daily conversation.'),
            ('Confident English B1', 'B1', 'Build confidence and accuracy.'),
            ('Professional English B2', 'B2', 'Advanced workplace communication.'),
        ]

        for name, level, description in seed_courses:
            course, _ = Course.objects.get_or_create(
                name=name,
                level=level,
                defaults={'description': description},
            )
            courses.append(course)

        return courses

    def _create_lessons(self, courses):
        lesson_data = [
            ('Welcome to SpeakBranch', 'TEXT', 1),
            ('Pronunciation Warm-up', 'EXERCISE_SPEAKING', 2),
            ('Reading Basics', 'EXERCISE_READING', 3),
            ('Listening Shadowing', 'EXERCISE_LISTENING_SHADOWING', 4),
            ('Listening Comprehension', 'EXERCISE_LISTENING_COMPREHENSION', 5),
            ('Writing Check-in', 'EXERCISE_WRITING', 6),
            ('Grammar Focus', 'TEXT', 7),
            ('Speaking Challenge', 'EXERCISE_SPEAKING', 8),
            ('Reading Challenge', 'EXERCISE_READING', 9),
            ('Writing Reflection', 'EXERCISE_WRITING', 10),
        ]

        for course in courses:
            for title, content_type, order_index in lesson_data:
                Lesson.objects.get_or_create(
                    course=course,
                    order_index=order_index,
                    defaults={
                        'title': title,
                        'content_type': content_type,
                        'duration_min': 5,
                        'xp_value': 10,
                    },
                )

    def _enroll_student(self, student_user, courses):
        if not courses:
            return
        primary_course = next((c for c in courses if c.level == 'A1'), courses[0])
        CourseEnrollment.objects.get_or_create(
            user=student_user,
            course=primary_course,
            defaults={'current_lesson': primary_course.get_first_lesson()},
        )

    def _create_vocabulary(self, created_by):
        vocab_seed = [
            ('journey', 'A long trip or experience.', 'A1'),
            ('confidence', 'Belief in your abilities.', 'A1'),
            ('clarity', 'The quality of being clear.', 'A1'),
            ('adapt', 'To change in order to fit new conditions.', 'A1'),
            ('practice', 'Repeated exercise to improve a skill.', 'A1'),
            ('focus', 'Concentration of attention or effort.', 'A1'),
            ('insight', 'Deep understanding of a situation.', 'A2'),
            ('progress', 'Forward movement toward a goal.', 'A2'),
            ('resolve', 'To find a solution to a problem.', 'A2'),
            ('curious', 'Eager to learn or know.', 'A2'),
            ('strategy', 'A plan of action to achieve a goal.', 'B1'),
            ('collaborate', 'To work with others toward a goal.', 'B1'),
            ('perspective', 'A way of looking at something.', 'B1'),
            ('efficient', 'Working in a well-organized way.', 'B1'),
            ('insightful', 'Having deep understanding.', 'B2'),
            ('articulate', 'Able to express ideas clearly.', 'B2'),
            ('resilient', 'Able to recover quickly.', 'B2'),
            ('prioritize', 'To decide what is most important.', 'B2'),
            ('meticulous', 'Very careful and precise.', 'B2'),
            ('nuance', 'A subtle difference.', 'B2'),
            ('coherence', 'Logical and consistent.', 'B1'),
            ('fluency', 'Ability to speak easily.', 'A2'),
            ('vocabulary', 'Words used in a language.', 'A1'),
            ('grammar', 'Rules of a language.', 'A1'),
            ('comprehension', 'Ability to understand.', 'A2'),
            ('artistry', 'Creative skill.', 'B2'),
            ('structure', 'Organization of parts.', 'A2'),
            ('feedback', 'Helpful information about performance.', 'A2'),
            ('commitment', 'Being dedicated to something.', 'B1'),
            ('mastery', 'Complete understanding or control.', 'B2'),
        ]

        vocab_items = []
        for word, meaning, level in vocab_seed:
            vocab, _ = Vocabulary.objects.get_or_create(
                word=word,
                defaults={
                    'meaning': meaning,
                    'level': level,
                    'daily_flag': True,
                    'created_by': created_by,
                },
            )
            vocab_items.append(vocab)

        return vocab_items

    def _create_questions(self, created_by):
        # ── 15 DIAGNOSTIC questions (MCQ only): 3 per level A1–C1 ────────
        diagnostic_seed = [
            # ── A1 (3) ──
            {
                'text': 'Choose the correct greeting: "Good ___"',
                'type': 'READING',
                'level': 'A1',
                'difficulty': 'EASY',
                'correct_answer': '{"options": ["night", "morning", "late", "slow"], "correct": "morning"}',
            },
            {
                'text': 'She ___ coffee every morning.',
                'type': 'READING',
                'level': 'A1',
                'difficulty': 'EASY',
                'correct_answer': '{"options": ["drink", "drinks", "drank", "drinking"], "correct": "drinks"}',
            },
            {
                'text': 'Which word means "a place where you live"?',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'A1',
                'difficulty': 'EASY',
                'phonetic_text': 'Listen carefully: home. Home is a place where you live.',
                'max_replays': 3,
                'correct_answer': '{"options": ["home", "school", "office", "park"], "correct": "home"}',
            },
            # ── A2 (3) ──
            {
                'text': 'Choose the correct sentence: "Yesterday I ___ to the store."',
                'type': 'READING',
                'level': 'A2',
                'difficulty': 'EASY',
                'correct_answer': '{"options": ["go", "went", "goes", "going"], "correct": "went"}',
            },
            {
                'text': 'What does "I enjoy learning English" mean?',
                'type': 'READING',
                'level': 'A2',
                'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["I like studying English", "I hate English", "I teach English", "I forgot English"], "correct": "I like studying English"}',
            },
            {
                'text': 'Listen and identify the key word in the sentence.',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'A2',
                'difficulty': 'MEDIUM',
                'phonetic_text': 'The word is progress. Progress means moving forward toward a goal.',
                'max_replays': 3,
                'correct_answer': '{"options": ["progress", "problem", "promise", "program"], "correct": "progress"}',
            },
            # ── B1 (3) ──
            {
                'text': '"She would have called if she ___ your number." Choose the correct form.',
                'type': 'READING',
                'level': 'B1',
                'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["had known", "knows", "will know", "knowing"], "correct": "had known"}',
            },
            {
                'text': 'Read the passage: "The company decided to postpone the meeting due to unforeseen circumstances." What does "postpone" mean?',
                'type': 'READING',
                'level': 'B1',
                'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["Cancel permanently", "Delay to a later time", "Move to another place", "Start earlier"], "correct": "Delay to a later time"}',
            },
            {
                'text': 'Listen and select the correct meaning of the word you hear.',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'B1',
                'difficulty': 'MEDIUM',
                'phonetic_text': 'The word is collaborate. Collaborate means to work together with others toward a shared goal.',
                'max_replays': 3,
                'correct_answer': '{"options": ["To work alone", "To work together", "To compete against", "To give up"], "correct": "To work together"}',
            },
            # ── B2 (3) ──
            {
                'text': '"The study suggests that remote work enhances productivity, ___ it may reduce team cohesion." Choose the best connector.',
                'type': 'READING',
                'level': 'B2',
                'difficulty': 'HARD',
                'correct_answer': '{"options": ["although", "because", "so", "unless"], "correct": "although"}',
            },
            {
                'text': 'Read: "The CEO attributed the company\'s turnaround to a shift in corporate culture." What does "turnaround" imply?',
                'type': 'READING',
                'level': 'B2',
                'difficulty': 'HARD',
                'correct_answer': '{"options": ["A negative trend continuing", "A significant positive change", "A small improvement", "A complete failure"], "correct": "A significant positive change"}',
            },
            {
                'text': 'Listen to the description and choose the correct inference.',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'B2',
                'difficulty': 'HARD',
                'phonetic_text': 'Although the experiment failed to produce the expected results, the researchers considered it a success because it revealed a previously unknown variable.',
                'max_replays': 3,
                'correct_answer': '{"options": ["The experiment was a total failure", "The researchers discovered something unexpected", "The results matched their hypothesis", "They decided to stop the research"], "correct": "The researchers discovered something unexpected"}',
            },
            # ── C1 (3) ──
            {
                'text': '"The phenomenon of linguistic relativity posits that the structure of a language affects its speakers\' ___." Complete the sentence.',
                'type': 'READING',
                'level': 'C1',
                'difficulty': 'HARD',
                'correct_answer': '{"options": ["worldview and cognition", "physical abilities", "financial decisions", "sleeping patterns"], "correct": "worldview and cognition"}',
            },
            {
                'text': 'Read: "The author\'s prose is characterized by its laconic brevity, eschewing elaborate descriptions in favor of stark minimalism." What does "laconic" mean?',
                'type': 'READING',
                'level': 'C1',
                'difficulty': 'HARD',
                'correct_answer': '{"options": ["Using very few words", "Extremely detailed", "Emotionally charged", "Humorously written"], "correct": "Using very few words"}',
            },
            {
                'text': 'Listen and determine the speaker\'s implicit argument.',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'C1',
                'difficulty': 'HARD',
                'phonetic_text': 'While proponents of artificial intelligence emphasize its potential to revolutionize healthcare, critics argue that relying on algorithmic decision-making without adequate human oversight could exacerbate existing disparities in medical care.',
                'max_replays': 3,
                'correct_answer': '{"options": ["AI should replace all doctors", "AI in healthcare needs human supervision to be equitable", "AI has no role in healthcare", "Healthcare disparities are unrelated to technology"], "correct": "AI in healthcare needs human supervision to be equitable"}',
            },
        ]

        # ── PRACTICE questions ───────────────────────────────────────────
        practice_seed = [
            # ── A2 PRACTICE ──
            {
                'text': 'Describe your daily routine in 4-5 sentences.',
                'type': 'SPEAKING',
                'level': 'A2',
                'difficulty': 'EASY',
                'correct_answer': 'A clear daily routine with sequence words is accepted.',
            },
            {
                'text': 'Choose the correct option: "She ___ to work by bus every day."',
                'type': 'READING',
                'level': 'A2',
                'difficulty': 'EASY',
                'correct_answer': '{"options": ["go", "goes", "going", "gone"], "correct": "goes"}',
            },
            {
                'text': 'Shadow the sentence: "I usually study English after dinner."',
                'type': 'LISTENING_SHADOWING',
                'level': 'A2',
                'difficulty': 'EASY',
                'correct_answer': 'I usually study English after dinner.',
            },
            {
                'text': 'Listen and identify where the speaker is going.',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'A2',
                'difficulty': 'MEDIUM',
                'phonetic_text': 'Tomorrow I am going to the supermarket to buy fruit and vegetables for the week.',
                'max_replays': 3,
                'correct_answer': '{"options": ["To the cinema", "To the supermarket", "To the office", "To the gym"], "correct": "To the supermarket"}',
            },
            {
                'text': 'Write a short message to invite a friend to your birthday party.',
                'type': 'WRITING',
                'level': 'A2',
                'difficulty': 'MEDIUM',
                'correct_answer': 'Include invitation purpose, date/time, and a friendly closing.',
            },

            # ── B1 PRACTICE ──
            {
                'text': 'Explain a challenge you overcame.',
                'type': 'SPEAKING',
                'level': 'B1',
                'difficulty': 'HARD',
                'correct_answer': 'Any clear challenge + resolution is accepted.',
            },
            {
                'text': 'Select the best summary for the paragraph.',
                'type': 'READING',
                'level': 'B1',
                'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["summary", "detail", "opinion", "topic"], "correct": "summary"}',
            },
            {
                'text': 'Shadow the sentence: "We collaborate to succeed."',
                'type': 'LISTENING_SHADOWING',
                'level': 'B1',
                'difficulty': 'MEDIUM',
                'correct_answer': 'We collaborate to succeed.',
            },
            {
                'text': 'Listen and choose the speaker’s main recommendation.',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'B1',
                'difficulty': 'MEDIUM',
                'phonetic_text': 'If you want to improve your communication skills, practice speaking regularly and ask for feedback from classmates.',
                'max_replays': 3,
                'correct_answer': '{"options": ["Study alone only", "Practice speaking and ask for feedback", "Avoid making mistakes", "Memorize grammar rules only"], "correct": "Practice speaking and ask for feedback"}',
            },
            {
                'text': 'Write an email to your teacher explaining why you missed class.',
                'type': 'WRITING',
                'level': 'B1',
                'difficulty': 'MEDIUM',
                'correct_answer': 'Include reason, apology, and request for missed material.',
            },

            # ── B2 PRACTICE ──
            {
                'text': 'Give your opinion on remote work and support it with two arguments.',
                'type': 'SPEAKING',
                'level': 'B2',
                'difficulty': 'HARD',
                'correct_answer': 'A structured opinion with clear supporting arguments is accepted.',
            },
            {
                'text': 'Choose the best connector: "The proposal is ambitious; ___, it remains feasible with proper planning."',
                'type': 'READING',
                'level': 'B2',
                'difficulty': 'HARD',
                'correct_answer': '{"options": ["however", "because", "unless", "therefore not"], "correct": "however"}',
            },
            {
                'text': 'Shadow the sentence: "Strategic planning enables teams to adapt under pressure."',
                'type': 'LISTENING_SHADOWING',
                'level': 'B2',
                'difficulty': 'HARD',
                'correct_answer': 'Strategic planning enables teams to adapt under pressure.',
            },
            {
                'text': 'Listen and select the strongest inference from the statement.',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'B2',
                'difficulty': 'HARD',
                'phonetic_text': 'Although quarterly revenue increased, operating margins declined due to rising logistics costs, suggesting that growth may be difficult to sustain without efficiency improvements.',
                'max_replays': 3,
                'correct_answer': '{"options": ["The company is risk-free", "Revenue growth alone is not enough for long-term stability", "Logistics costs are irrelevant", "Margins always increase with revenue"], "correct": "Revenue growth alone is not enough for long-term stability"}',
            },
            {
                'text': 'Write a formal response to a customer complaint offering a resolution.',
                'type': 'WRITING',
                'level': 'B2',
                'difficulty': 'HARD',
                'correct_answer': 'Use formal tone, acknowledge issue, propose concrete resolution, and close professionally.',
            },
        ]

        # ── LEVEL_UP questions: 10 per level (A1–C1) for exam linking ───
        level_up_seed = [
            # ── A1 LEVEL_UP (10) ──
            {
                'text': 'What is the plural of "child"?',
                'type': 'READING', 'level': 'A1', 'difficulty': 'EASY',
                'correct_answer': '{"options": ["childs", "children", "childes", "child"], "correct": "children"}',
            },
            {
                'text': 'Choose: "I ___ a student."',
                'type': 'READING', 'level': 'A1', 'difficulty': 'EASY',
                'correct_answer': '{"options": ["am", "is", "are", "be"], "correct": "am"}',
            },
            {
                'text': '"They ___ to school every day."',
                'type': 'READING', 'level': 'A1', 'difficulty': 'EASY',
                'correct_answer': '{"options": ["go", "goes", "going", "gone"], "correct": "go"}',
            },
            {
                'text': 'What color is the sky on a clear day?',
                'type': 'READING', 'level': 'A1', 'difficulty': 'EASY',
                'correct_answer': '{"options": ["blue", "green", "red", "yellow"], "correct": "blue"}',
            },
            {
                'text': '"This is ___ book." Choose the correct article.',
                'type': 'READING', 'level': 'A1', 'difficulty': 'EASY',
                'correct_answer': '{"options": ["a", "an", "the", "some"], "correct": "a"}',
            },
            {
                'text': 'Listen and pick the word that means "happy".',
                'type': 'LISTENING_COMPREHENSION', 'level': 'A1', 'difficulty': 'EASY',
                'phonetic_text': 'The word is glad. Glad means happy or pleased.',
                'max_replays': 3,
                'correct_answer': '{"options": ["sad", "glad", "mad", "bad"], "correct": "glad"}',
            },
            {
                'text': '"How ___ apples do you want?"',
                'type': 'READING', 'level': 'A1', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["many", "much", "more", "most"], "correct": "many"}',
            },
            {
                'text': '"She ___ not like spicy food."',
                'type': 'READING', 'level': 'A1', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["does", "do", "did", "is"], "correct": "does"}',
            },
            {
                'text': 'Which sentence is correct?',
                'type': 'READING', 'level': 'A1', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["He have a car.", "He has a car.", "He having a car.", "He haves a car."], "correct": "He has a car."}',
            },
            {
                'text': 'Listen and choose the correct time mentioned.',
                'type': 'LISTENING_COMPREHENSION', 'level': 'A1', 'difficulty': 'MEDIUM',
                'phonetic_text': 'The class starts at nine o\'clock in the morning.',
                'max_replays': 3,
                'correct_answer': '{"options": ["8:00 AM", "9:00 AM", "10:00 AM", "9:00 PM"], "correct": "9:00 AM"}',
            },
            # ── A2 LEVEL_UP (10) ──
            {
                'text': '"I have been living here ___ five years."',
                'type': 'READING', 'level': 'A2', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["for", "since", "during", "while"], "correct": "for"}',
            },
            {
                'text': '"If it rains, we ___ stay inside."',
                'type': 'READING', 'level': 'A2', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["will", "would", "can", "should"], "correct": "will"}',
            },
            {
                'text': 'What is the opposite of "expensive"?',
                'type': 'READING', 'level': 'A2', 'difficulty': 'EASY',
                'correct_answer': '{"options": ["cheap", "rich", "poor", "free"], "correct": "cheap"}',
            },
            {
                'text': '"She ___ already finished her homework."',
                'type': 'READING', 'level': 'A2', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["has", "have", "had", "is"], "correct": "has"}',
            },
            {
                'text': '"We were watching TV when the phone ___."',
                'type': 'READING', 'level': 'A2', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["rang", "rings", "ring", "ringing"], "correct": "rang"}',
            },
            {
                'text': 'Listen: what did the speaker do last weekend?',
                'type': 'LISTENING_COMPREHENSION', 'level': 'A2', 'difficulty': 'MEDIUM',
                'phonetic_text': 'Last weekend I visited my grandmother. We cooked dinner together and went for a walk in the park.',
                'max_replays': 3,
                'correct_answer': '{"options": ["Went shopping", "Visited grandmother", "Stayed home alone", "Went to school"], "correct": "Visited grandmother"}',
            },
            {
                'text': '"The book is ___ the table."',
                'type': 'READING', 'level': 'A2', 'difficulty': 'EASY',
                'correct_answer': '{"options": ["on", "in", "at", "by"], "correct": "on"}',
            },
            {
                'text': '"He speaks English ___ than his brother."',
                'type': 'READING', 'level': 'A2', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["better", "best", "good", "well"], "correct": "better"}',
            },
            {
                'text': '"I\'m looking forward ___ meeting you."',
                'type': 'READING', 'level': 'A2', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["to", "for", "at", "in"], "correct": "to"}',
            },
            {
                'text': 'Listen and choose what the speaker recommends.',
                'type': 'LISTENING_COMPREHENSION', 'level': 'A2', 'difficulty': 'MEDIUM',
                'phonetic_text': 'If you want to improve your English, I recommend reading books and watching movies in English every day.',
                'max_replays': 3,
                'correct_answer': '{"options": ["Take expensive courses", "Read and watch content in English", "Move to another country", "Only study grammar"], "correct": "Read and watch content in English"}',
            },
            # ── B1 LEVEL_UP (10) ──
            {
                'text': '"By the time we arrived, the concert ___."',
                'type': 'READING', 'level': 'B1', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["had already started", "already started", "has started", "is starting"], "correct": "had already started"}',
            },
            {
                'text': '"The report ___ by the team last week."',
                'type': 'READING', 'level': 'B1', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["was written", "wrote", "written", "is written"], "correct": "was written"}',
            },
            {
                'text': 'What does "to take something for granted" mean?',
                'type': 'READING', 'level': 'B1', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["To appreciate deeply", "To not value something enough", "To steal something", "To give something away"], "correct": "To not value something enough"}',
            },
            {
                'text': '"I wish I ___ more time to study."',
                'type': 'READING', 'level': 'B1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["had", "have", "has", "will have"], "correct": "had"}',
            },
            {
                'text': '"The manager suggested that we ___ the deadline."',
                'type': 'READING', 'level': 'B1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["extend", "extends", "extended", "extending"], "correct": "extend"}',
            },
            {
                'text': 'Listen: what is the main idea of the talk?',
                'type': 'LISTENING_COMPREHENSION', 'level': 'B1', 'difficulty': 'MEDIUM',
                'phonetic_text': 'Climate change is one of the most pressing issues of our time. Scientists agree that human activities, particularly burning fossil fuels, are the primary cause of rising global temperatures.',
                'max_replays': 3,
                'correct_answer': '{"options": ["Fossil fuels are cheap", "Human activities drive climate change", "Scientists disagree about climate", "Temperature is decreasing"], "correct": "Human activities drive climate change"}',
            },
            {
                'text': '"___ the fact that it rained, the event was a success."',
                'type': 'READING', 'level': 'B1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["Despite", "Because", "Since", "Although"], "correct": "Despite"}',
            },
            {
                'text': '"He asked me where I ___."',
                'type': 'READING', 'level': 'B1', 'difficulty': 'MEDIUM',
                'correct_answer': '{"options": ["lived", "live", "living", "am live"], "correct": "lived"}',
            },
            {
                'text': '"If I had known about the sale, I ___ something."',
                'type': 'READING', 'level': 'B1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["would have bought", "will buy", "bought", "buy"], "correct": "would have bought"}',
            },
            {
                'text': 'Listen and choose the speaker\'s conclusion.',
                'type': 'LISTENING_COMPREHENSION', 'level': 'B1', 'difficulty': 'HARD',
                'phonetic_text': 'In conclusion, while social media offers many benefits such as staying connected with friends, it is important to be aware of its negative effects on mental health, especially among young people.',
                'max_replays': 3,
                'correct_answer': '{"options": ["Social media is entirely harmful", "Social media has both benefits and risks", "Young people should avoid all technology", "Social media only affects adults"], "correct": "Social media has both benefits and risks"}',
            },
            # ── B2 LEVEL_UP (10) ──
            {
                'text': '"The findings of the study were ___ inconclusive, prompting further research."',
                'type': 'READING', 'level': 'B2', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["deemed", "thought", "considered", "believed"], "correct": "deemed"}',
            },
            {
                'text': '"Not until the evidence was presented ___ the committee change its stance."',
                'type': 'READING', 'level': 'B2', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["did", "does", "was", "had"], "correct": "did"}',
            },
            {
                'text': 'What does "to play devil\'s advocate" mean?',
                'type': 'READING', 'level': 'B2', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["To argue the opposing side for discussion", "To be evil", "To support the majority view", "To avoid arguments"], "correct": "To argue the opposing side for discussion"}',
            },
            {
                'text': '"The company prides itself ___ its commitment to sustainability."',
                'type': 'READING', 'level': 'B2', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["on", "in", "for", "at"], "correct": "on"}',
            },
            {
                'text': '"___ having limited resources, the startup achieved remarkable growth."',
                'type': 'READING', 'level': 'B2', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["Despite", "Although", "Because of", "Due to"], "correct": "Despite"}',
            },
            {
                'text': 'Listen: what can be inferred from the speaker\'s argument?',
                'type': 'LISTENING_COMPREHENSION', 'level': 'B2', 'difficulty': 'HARD',
                'phonetic_text': 'While automation has undoubtedly increased efficiency in manufacturing, the displacement of workers cannot be overlooked. Companies must invest in retraining programs to ensure a just transition for affected employees.',
                'max_replays': 3,
                'correct_answer': '{"options": ["Automation should be stopped", "Workers need support during automation transitions", "Manufacturing is declining", "Retraining is unnecessary"], "correct": "Workers need support during automation transitions"}',
            },
            {
                'text': '"Had the government acted sooner, the crisis ___ been averted."',
                'type': 'READING', 'level': 'B2', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["could have", "can", "will have", "should"], "correct": "could have"}',
            },
            {
                'text': 'Choose the best inference from the passage.',
                'type': 'READING', 'level': 'B2', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["The author is optimistic about the outcome", "The situation is irreversible", "More data is needed before concluding", "The experiment was a failure"], "correct": "More data is needed before concluding"}',
            },
            {
                'text': 'Choose the most appropriate opening for a formal inquiry email.',
                'type': 'READING', 'level': 'B2', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["Hey, send me the details.", "I was wondering if you could provide further information regarding your program.", "Give me info now.", "What\'s up with your course?"], "correct": "I was wondering if you could provide further information regarding your program."}',
            },
            {
                'text': 'Listen and answer the comprehension question about the lecture.',
                'type': 'LISTENING_COMPREHENSION', 'level': 'B2', 'difficulty': 'HARD',
                'phonetic_text': 'The professor explained that cognitive biases affect decision-making in subtle ways. For instance, confirmation bias leads people to seek information that supports their existing beliefs while ignoring contradictory evidence.',
                'max_replays': 3,
                'correct_answer': '{"options": ["People always make rational decisions", "Confirmation bias makes people seek supporting evidence only", "Cognitive biases are rare", "The professor disagrees with the theory"], "correct": "Confirmation bias makes people seek supporting evidence only"}',
            },
            # ── C1 LEVEL_UP (10) ──
            {
                'text': '"The author\'s use of irony serves to ___ the reader\'s assumptions."',
                'type': 'READING', 'level': 'C1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["undermine", "support", "ignore", "simplify"], "correct": "undermine"}',
            },
            {
                'text': '"The policy was criticized for being ___ in its approach, failing to account for local nuances."',
                'type': 'READING', 'level': 'C1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["monolithic", "flexible", "innovative", "transparent"], "correct": "monolithic"}',
            },
            {
                'text': 'What does "to be at cross-purposes" mean?',
                'type': 'READING', 'level': 'C1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["To misunderstand each other\'s intentions", "To agree completely", "To work efficiently together", "To solve a problem quickly"], "correct": "To misunderstand each other\'s intentions"}',
            },
            {
                'text': '"The paradox of choice suggests that an abundance of options can lead to ___ rather than satisfaction."',
                'type': 'READING', 'level': 'C1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["paralysis", "excitement", "productivity", "clarity"], "correct": "paralysis"}',
            },
            {
                'text': '"Seldom ___ such a comprehensive analysis been conducted in this field."',
                'type': 'READING', 'level': 'C1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["has", "have", "had", "is"], "correct": "has"}',
            },
            {
                'text': 'Listen: what is the speaker\'s central thesis?',
                'type': 'LISTENING_COMPREHENSION', 'level': 'C1', 'difficulty': 'HARD',
                'phonetic_text': 'The commodification of higher education has fundamentally altered the relationship between universities and students. Rather than fostering intellectual curiosity, institutions increasingly prioritize metrics that appeal to rankings, thereby undermining the very purpose of academic inquiry.',
                'max_replays': 3,
                'correct_answer': '{"options": ["Universities are improving thanks to rankings", "Commercialization harms the academic mission of universities", "Students prefer ranked universities", "Higher education is becoming more accessible"], "correct": "Commercialization harms the academic mission of universities"}',
            },
            {
                'text': '"The notion that technology is inherently neutral is ___ at best."',
                'type': 'READING', 'level': 'C1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["naive", "accurate", "progressive", "pragmatic"], "correct": "naive"}',
            },
            {
                'text': '"In light of recent developments, the board decided to ___ its earlier decision."',
                'type': 'READING', 'level': 'C1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["rescind", "enforce", "celebrate", "publish"], "correct": "rescind"}',
            },
            {
                'text': 'Listen and identify the logical fallacy in the argument.',
                'type': 'LISTENING_COMPREHENSION', 'level': 'C1', 'difficulty': 'HARD',
                'phonetic_text': 'Everyone I know agrees that this policy is effective, therefore it must be the right approach for the entire country. If you disagree, you simply haven\'t thought about it carefully enough.',
                'max_replays': 3,
                'correct_answer': '{"options": ["Appeal to authority", "Appeal to popularity and ad hominem", "Straw man argument", "False dilemma"], "correct": "Appeal to popularity and ad hominem"}',
            },
            {
                'text': '"The researcher posited that the correlation between the variables was ___ rather than causal."',
                'type': 'READING', 'level': 'C1', 'difficulty': 'HARD',
                'correct_answer': '{"options": ["spurious", "definitive", "negligible", "profound"], "correct": "spurious"}',
            },
        ]

        # Build all questions
        question_seed = []

        for q in diagnostic_seed:
            question_seed.append({**q, 'category': 'DIAGNOSTIC'})

        for q in practice_seed:
            question_seed.append({**q, 'category': 'PRACTICE'})

        for q in level_up_seed:
            question_seed.append({**q, 'category': 'LEVEL_UP'})

        questions = []
        for seed in question_seed:
            question, _ = Question.objects.update_or_create(
                text=seed['text'],
                type=seed['type'],
                level=seed['level'],
                defaults={
                    'category': seed['category'],
                    'correct_answer': seed['correct_answer'],
                    'difficulty': seed['difficulty'],
                    'max_replays': seed.get('max_replays'),
                    'phonetic_text': seed.get('phonetic_text', ''),
                    'audio_url': seed.get('audio_url'),
                    'created_by': created_by,
                    'is_active': True,
                },
            )
            questions.append(question)

        return questions

    def _create_exam_questions(self, questions):
        """Link LEVEL_UP questions to their corresponding CEFR exam via ExamQuestion."""
        level_up_qs = [q for q in questions if q.category == 'LEVEL_UP']

        for exam in Exam.objects.filter(type='LEVEL_UP', is_active=True):
            level_qs = [q for q in level_up_qs if q.level == exam.level]
            if not level_qs:
                continue

            # Rebuild mapping to keep deterministic order and avoid unique(order) collisions
            exam.exam_questions.all().delete()

            for order, question in enumerate(level_qs, start=1):
                ExamQuestion.objects.create(
                    exam=exam,
                    question=question,
                    order=order,
                    points=10,
                )

    def _link_question_vocabulary(self, questions, vocab_items):
        if not questions or not vocab_items:
            return

        word_map = {vocab.word: vocab for vocab in vocab_items}
        links = [
            ('Choose the correct greeting: "Good ___"', 'confidence'),
            ('She ___ coffee every morning.', 'practice'),
            ('Which word means "a place where you live"?', 'focus'),
            ('Listen and identify the key word in the sentence.', 'progress'),
            ('Explain a challenge you overcame.', 'resilient'),
            ('Select the best summary for the paragraph.', 'strategy'),
            ('Shadow the sentence: "We collaborate to succeed."', 'collaborate'),
            ('Write a formal email requesting information.', 'articulate'),
            ('Choose the best inference from the passage.', 'nuance'),
        ]

        for question_text, vocab_word in links:
            question = next((q for q in questions if q.text == question_text), None)
            vocab = word_map.get(vocab_word)
            if not question or not vocab:
                continue
            QuestionVocabulary.objects.get_or_create(
                question=question,
                vocabulary=vocab,
            )
