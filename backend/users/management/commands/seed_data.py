from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction

from courses.models import Course, Lesson, CourseEnrollment
from questions.models import Question, QuestionVocabulary
from users.models import UserProgress
from vocabulary.models import Vocabulary


class Command(BaseCommand):
    help = 'Seed initial data for local development.'

    def handle(self, *args, **options):
        with transaction.atomic():
            admin_user = self._create_admin_user()
            student_user = self._create_student_user()

            self._create_user_progress(student_user)
            courses = self._create_courses()
            self._create_lessons(courses)
            self._enroll_student(student_user, courses)
            vocab_items = self._create_vocabulary(admin_user)
            questions = self._create_questions(admin_user)
            self._link_question_vocabulary(questions, vocab_items)

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
        question_seed = [
            {
                'text': 'Introduce yourself in one sentence.',
                'type': 'SPEAKING',
                'level': 'A1',
                'category': 'DIAGNOSTIC',
                'correct_answer': 'Any simple self-introduction is accepted.',
                'difficulty': 'EASY',
                'max_replays': None,
            },
            {
                'text': 'Choose the correct greeting: "Good ___"',
                'type': 'READING',
                'level': 'A1',
                'category': 'DIAGNOSTIC',
                'correct_answer': 'morning',
                'difficulty': 'EASY',
                'max_replays': None,
            },
            {
                'text': 'Repeat the phrase: "I can speak clearly."',
                'type': 'LISTENING_SHADOWING',
                'level': 'A1',
                'category': 'DIAGNOSTIC',
                'correct_answer': 'I can speak clearly.',
                'difficulty': 'MEDIUM',
                'max_replays': None,
            },
            {
                'text': 'Listen and pick the word you heard.',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'A1',
                'category': 'DIAGNOSTIC',
                'correct_answer': 'confidence',
                'difficulty': 'MEDIUM',
                'max_replays': 3,
            },
            {
                'text': 'Write a short sentence about your goals.',
                'type': 'WRITING',
                'level': 'A1',
                'category': 'DIAGNOSTIC',
                'correct_answer': 'Any short goal statement is accepted.',
                'difficulty': 'MEDIUM',
                'max_replays': None,
            },
            {
                'text': 'Describe your daily routine using three verbs.',
                'type': 'WRITING',
                'level': 'A2',
                'category': 'DIAGNOSTIC',
                'correct_answer': 'Any reasonable daily routine is accepted.',
                'difficulty': 'MEDIUM',
                'max_replays': None,
            },
            {
                'text': 'Listen and identify the key word.',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'A2',
                'category': 'DIAGNOSTIC',
                'correct_answer': 'progress',
                'difficulty': 'MEDIUM',
                'max_replays': 3,
            },
            {
                'text': 'Explain a challenge you overcame.',
                'type': 'SPEAKING',
                'level': 'B1',
                'category': 'PRACTICE',
                'correct_answer': 'Any clear challenge + resolution is accepted.',
                'difficulty': 'HARD',
                'max_replays': None,
            },
            {
                'text': 'Select the best summary for the paragraph.',
                'type': 'READING',
                'level': 'B1',
                'category': 'PRACTICE',
                'correct_answer': 'summary',
                'difficulty': 'MEDIUM',
                'max_replays': None,
            },
            {
                'text': 'Shadow the sentence: "We collaborate to succeed."',
                'type': 'LISTENING_SHADOWING',
                'level': 'B1',
                'category': 'PRACTICE',
                'correct_answer': 'We collaborate to succeed.',
                'difficulty': 'MEDIUM',
                'max_replays': None,
            },
            {
                'text': 'Write a formal email requesting information.',
                'type': 'WRITING',
                'level': 'B2',
                'category': 'LEVEL_UP',
                'correct_answer': 'Any formal email structure is accepted.',
                'difficulty': 'HARD',
                'max_replays': None,
            },
            {
                'text': 'Choose the best inference from the passage.',
                'type': 'READING',
                'level': 'B2',
                'category': 'LEVEL_UP',
                'correct_answer': 'inference',
                'difficulty': 'HARD',
                'max_replays': None,
            },
            {
                'text': 'Listen and answer the comprehension question.',
                'type': 'LISTENING_COMPREHENSION',
                'level': 'B2',
                'category': 'LEVEL_UP',
                'correct_answer': 'insight',
                'difficulty': 'HARD',
                'max_replays': 3,
            },
        ]

        questions = []
        for seed in question_seed:
            question, _ = Question.objects.get_or_create(
                text=seed['text'],
                type=seed['type'],
                level=seed['level'],
                defaults={
                    'category': seed['category'],
                    'correct_answer': seed['correct_answer'],
                    'difficulty': seed['difficulty'],
                    'max_replays': seed['max_replays'],
                    'created_by': created_by,
                },
            )
            questions.append(question)

        return questions

    def _link_question_vocabulary(self, questions, vocab_items):
        if not questions or not vocab_items:
            return

        word_map = {vocab.word: vocab for vocab in vocab_items}
        links = [
            ('Introduce yourself in one sentence.', 'journey'),
            ('Choose the correct greeting: "Good ___"', 'confidence'),
            ('Repeat the phrase: "I can speak clearly."', 'clarity'),
            ('Listen and pick the word you heard.', 'adapt'),
            ('Write a short sentence about your goals.', 'practice'),
            ('Describe your daily routine using three verbs.', 'focus'),
            ('Listen and identify the key word.', 'progress'),
            ('Explain a challenge you overcame.', 'resilient'),
            ('Select the best summary for the paragraph.', 'strategy'),
            ('Shadow the sentence: "We collaborate to succeed."', 'collaborate'),
            ('Write a formal email requesting information.', 'articulate'),
            ('Choose the best inference from the passage.', 'nuance'),
            ('Listen and answer the comprehension question.', 'insight'),
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
