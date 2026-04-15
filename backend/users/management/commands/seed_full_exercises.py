"""
seed_full_exercises — Comprehensive exercise seeding for SpeakBranch AI.

Creates:
  - 20 DIAGNOSTIC questions  (5 per level × A1-B2)
  - 40 PRACTICE questions     (10 per level × A1-B2)
  - 40 LEVEL_UP questions     (10 per level × A1-B2)
  - 4 LEVEL_UP exams + ExamQuestion links
  - 1 DIAGNOSTIC exam + ExamQuestion links
  - SystemConfig singleton
  - Additional vocabulary

Usage:
  python manage.py seed_full_exercises
  python manage.py seed_full_exercises --clean   # wipe questions/exams first
"""

import json
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction

from courses.models import Course, CourseEnrollment
from exams.models import Exam, ExamQuestion
from questions.models import Question, QuestionVocabulary
from system_config.models import SystemConfig
from users.models import UserProgress
from vocabulary.models import Vocabulary


def mcq(text, options, correct):
    return json.dumps(
        {"questions": [{"text": text, "options": options, "correct": correct}]},
        ensure_ascii=False,
    )


def mcq_legacy(options, correct):
    return json.dumps(
        {"options": options, "correct": correct},
        ensure_ascii=False,
    )


# ══════════════════════════════════════════════════════════════════════════════
#  DIAGNOSTIC QUESTIONS — 5 per level (one per skill type)
# ══════════════════════════════════════════════════════════════════════════════

DIAGNOSTIC_QUESTIONS = [
    # ── A1 ────────────────────────────────────────────────────────────────────
    {
        "text": "She ___ a student at this school.",
        "type": "READING",
        "level": "A1",
        "difficulty": "EASY",
        "correct_answer": mcq(
            "She ___ a student at this school.",
            ["is", "are", "am", "be"],
            "is",
        ),
    },
    {
        "text": "Say hello and tell me your name in English.",
        "type": "SPEAKING",
        "level": "A1",
        "difficulty": "EASY",
        "correct_answer": "Hello, my name is...",
        "phonetic_text": "/həˈloʊ, maɪ neɪm ɪz.../",
    },
    {
        "text": "Listen and repeat: a basic greeting.",
        "type": "LISTENING_SHADOWING",
        "level": "A1",
        "difficulty": "EASY",
        "correct_answer": "Good morning. How are you today?",
        "phonetic_text": "/ɡʊd ˈmɔːrnɪŋ. haʊ ɑːr juː təˈdeɪ/",
    },
    {
        "text": "Listen carefully and choose: What does the person want?",
        "type": "LISTENING_COMPREHENSION",
        "level": "A1",
        "difficulty": "EASY",
        "correct_answer": mcq(
            "What does the person want?",
            ["water", "coffee", "milk", "juice"],
            "coffee",
        ),
        "phonetic_text": "Hello. Can I have a cup of coffee, please? Thank you very much.",
    },
    {
        "text": "Write two sentences about your family.",
        "type": "WRITING",
        "level": "A1",
        "difficulty": "EASY",
        "correct_answer": "Write at least two simple sentences about family members using basic vocabulary.",
    },

    # ── A2 ────────────────────────────────────────────────────────────────────
    {
        "text": "Yesterday, Maria ___ to the supermarket and ___ some vegetables.",
        "type": "READING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "Yesterday, Maria ___ to the supermarket and ___ some vegetables.",
            ["went / bought", "go / buy", "goes / buys", "going / buying"],
            "went / bought",
        ),
    },
    {
        "text": "Describe what you did last weekend in at least three sentences.",
        "type": "SPEAKING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": "A description of weekend activities using past simple tense.",
        "phonetic_text": "/dɪˈskraɪb wɒt juː dɪd lɑːst ˈwiːkend/",
    },
    {
        "text": "Listen and repeat: a sentence about daily commute.",
        "type": "LISTENING_SHADOWING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": "I usually take the bus to work in the morning.",
        "phonetic_text": "/aɪ ˈjuːʒuəli teɪk ðə bʌs tuː wɜːrk ɪn ðə ˈmɔːrnɪŋ/",
    },
    {
        "text": "Listen and answer: What is the woman's hobby?",
        "type": "LISTENING_COMPREHENSION",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "What is the woman's hobby?",
            ["cooking", "painting", "reading", "swimming"],
            "painting",
        ),
        "phonetic_text": "My name is Lisa. In my free time, I love painting. I paint landscapes and portraits. I started painting when I was twelve years old.",
    },
    {
        "text": "Describe your daily routine from morning to night.",
        "type": "WRITING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": "A chronological description of daily activities using present simple tense. At least four sentences.",
    },

    # ── B1 ────────────────────────────────────────────────────────────────────
    {
        "text": "Although the weather forecast predicted rain, the outdoor concert ___ as planned and the audience ___ it thoroughly.",
        "type": "READING",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "Choose the correct verb forms to complete the sentence.",
            ["proceeded / enjoyed", "proceeds / enjoys", "proceeding / enjoying", "proceed / enjoy"],
            "proceeded / enjoyed",
        ),
    },
    {
        "text": "What are the advantages and disadvantages of living in a big city? Give your opinion.",
        "type": "SPEAKING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": "A balanced opinion discussing pros and cons of city life with specific examples.",
        "phonetic_text": "/ədˈvɑːntɪdʒɪz ænd dɪsədˈvɑːntɪdʒɪz əv ˈlɪvɪŋ ɪn ə bɪɡ ˈsɪti/",
    },
    {
        "text": "Listen and repeat: a complex sentence about communication.",
        "type": "LISTENING_SHADOWING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": "Effective communication requires both the ability to speak clearly and the patience to listen carefully.",
        "phonetic_text": "/ɪˈfektɪv kəˌmjuːnɪˈkeɪʃən rɪˈkwaɪərz boʊθ ðə əˈbɪləti tuː spiːk ˈklɪrli/",
    },
    {
        "text": "Listen and answer: What is the main benefit of regular exercise according to the speaker?",
        "type": "LISTENING_COMPREHENSION",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What is the main benefit of regular exercise?",
            [
                "Exercise only benefits physical health",
                "Mental health is the primary benefit of exercise",
                "Exercise is not necessary for good health",
                "Only young people benefit from exercise",
            ],
            "Mental health is the primary benefit of exercise",
        ),
        "phonetic_text": "Recent studies show that regular exercise has a profound impact on mental health. While most people associate exercise with physical fitness, researchers found that the psychological benefits are equally significant. Regular physical activity can reduce symptoms of anxiety and depression by up to forty percent.",
    },
    {
        "text": "Write a paragraph giving your opinion: Is online education as effective as in-person learning? Explain why or why not.",
        "type": "WRITING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": "A well-structured paragraph with a clear thesis, at least two supporting arguments, and a brief conclusion.",
    },

    # ── B2 ────────────────────────────────────────────────────────────────────
    {
        "text": "The author's claim that economic growth inevitably causes environmental harm has been ___ by evidence showing sustainable practices can ___ both goals simultaneously.",
        "type": "READING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "Choose the correct words to complete the sentence.",
            ["challenged / achieve", "supported / undermine", "confirmed / delay", "ignored / prevent"],
            "challenged / achieve",
        ),
    },
    {
        "text": "Discuss how artificial intelligence might change the job market in the next decade. Provide specific examples.",
        "type": "SPEAKING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": "An articulate discussion of AI's impact on employment with specific examples and nuanced analysis.",
        "phonetic_text": "/ˌɑːrtɪˈfɪʃəl ɪnˈtelɪdʒəns ænd ðə dʒɒb ˈmɑːrkɪt/",
    },
    {
        "text": "Listen and repeat: a complex academic sentence.",
        "type": "LISTENING_SHADOWING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": "The correlation between socioeconomic factors and educational outcomes remains a subject of intense scholarly debate.",
        "phonetic_text": "/ðə ˌkɒrəˈleɪʃən bɪˈtwiːn ˌsoʊsioʊˌekəˈnɒmɪk ˈfæktərz ænd ˌedʒuˈkeɪʃənəl ˈaʊtkʌmz/",
    },
    {
        "text": "Listen and answer: What does the researcher conclude about climate change?",
        "type": "LISTENING_COMPREHENSION",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What does the researcher conclude?",
            [
                "Climate change cannot be reversed at all",
                "Individual actions matter more than policy",
                "A combination of policy and technology is needed",
                "Technology alone will solve climate change",
            ],
            "A combination of policy and technology is needed",
        ),
        "phonetic_text": "The researcher concludes that addressing climate change requires a multifaceted approach. Neither technological innovation alone nor policy changes in isolation will be sufficient. A synergistic combination of cutting-edge technology, robust governmental policies, and informed individual choices offers the most promising path forward.",
    },
    {
        "text": "Write a formal email to a university professor requesting an extension on a research paper. Include a valid justification and propose a new deadline.",
        "type": "WRITING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": "A formal email with proper register, clear justification, a proposed new deadline, and professional tone.",
    },
]


# ══════════════════════════════════════════════════════════════════════════════
#  PRACTICE QUESTIONS — 10 per level (2 per skill type)
# ══════════════════════════════════════════════════════════════════════════════

PRACTICE_QUESTIONS = [
    # ── A1 PRACTICE ───────────────────────────────────────────────────────────
    {
        "text": "My name is Tom. I am from England. I have a big family. My mother is a doctor and my father is a teacher. I have two sisters. We live in a small house near the park.\n\nRead the passage and answer the question.",
        "type": "READING",
        "level": "A1",
        "difficulty": "EASY",
        "correct_answer": mcq(
            "What is Tom's mother's job?",
            ["teacher", "doctor", "nurse", "student"],
            "doctor",
        ),
    },
    {
        "text": "Sarah wakes up at seven o'clock every morning. She eats breakfast with her family. Then she walks to school. Her favorite subject is mathematics. After school, she plays with her friends in the park.\n\nRead and answer.",
        "type": "READING",
        "level": "A1",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "What is Sarah's favorite subject?",
            ["English", "science", "mathematics", "history"],
            "mathematics",
        ),
    },
    {
        "text": "Say the days of the week in English, starting from Monday.",
        "type": "SPEAKING",
        "level": "A1",
        "difficulty": "EASY",
        "correct_answer": "Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday",
        "phonetic_text": "/ˈmʌndeɪ, ˈtjuːzdeɪ, ˈwenzdeɪ, ˈθɜːrzdeɪ, ˈfraɪdeɪ, ˈsætərdeɪ, ˈsʌndeɪ/",
    },
    {
        "text": "Tell me about the weather today. Use at least two sentences.",
        "type": "SPEAKING",
        "level": "A1",
        "difficulty": "MEDIUM",
        "correct_answer": "A description of the weather using basic adjectives like sunny, rainy, cold, hot.",
        "phonetic_text": "/ðə ˈweðər təˈdeɪ ɪz.../",
    },
    {
        "text": "Listen and repeat this sentence about an animal.",
        "type": "LISTENING_SHADOWING",
        "level": "A1",
        "difficulty": "EASY",
        "correct_answer": "The cat is sleeping on the chair.",
        "phonetic_text": "/ðə kæt ɪz ˈsliːpɪŋ ɒn ðə tʃeər/",
    },
    {
        "text": "Listen and repeat this sentence about a daily activity.",
        "type": "LISTENING_SHADOWING",
        "level": "A1",
        "difficulty": "MEDIUM",
        "correct_answer": "I go to school every day at eight o'clock in the morning.",
        "phonetic_text": "/aɪ ɡoʊ tuː skuːl ˈevri deɪ æt eɪt əˈklɒk ɪn ðə ˈmɔːrnɪŋ/",
    },
    {
        "text": "Listen and choose the correct answer about colors.",
        "type": "LISTENING_COMPREHENSION",
        "level": "A1",
        "difficulty": "EASY",
        "correct_answer": mcq(
            "What color is the girl's dress?",
            ["red", "blue", "green", "yellow"],
            "blue",
        ),
        "phonetic_text": "Look at that girl over there. She is wearing a beautiful blue dress. She also has white shoes and a small red hat.",
    },
    {
        "text": "Listen to the short conversation and answer.",
        "type": "LISTENING_COMPREHENSION",
        "level": "A1",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "Where are they going?",
            ["to the park", "to the cinema", "to the school", "to the store"],
            "to the cinema",
        ),
        "phonetic_text": "Hey, do you want to go to the cinema tonight? There is a new movie playing. Sure, I would love to go! Let us meet at seven o'clock.",
    },
    {
        "text": "Write three sentences about your favorite animal. What is it? What does it look like? Why do you like it?",
        "type": "WRITING",
        "level": "A1",
        "difficulty": "EASY",
        "correct_answer": "Three simple sentences describing a favorite animal using basic vocabulary and present tense.",
    },
    {
        "text": "Write about what you like to eat for breakfast and lunch. Use at least four sentences.",
        "type": "WRITING",
        "level": "A1",
        "difficulty": "MEDIUM",
        "correct_answer": "A short paragraph about food preferences using 'I like', 'I eat', 'My favorite' structures.",
    },

    # ── A2 PRACTICE ───────────────────────────────────────────────────────────
    {
        "text": "Last summer, the Johnson family went on vacation to Spain. They stayed in a small hotel near the beach for two weeks. Every morning, they swam in the sea and had lunch at a local restaurant. The children loved building sandcastles.\n\nRead and answer.",
        "type": "READING",
        "level": "A2",
        "difficulty": "EASY",
        "correct_answer": mcq(
            "How long did the Johnson family stay in Spain?",
            ["one week", "two weeks", "three weeks", "one month"],
            "two weeks",
        ),
    },
    {
        "text": "Emily wants to buy a new bicycle. She went to three different shops yesterday. The first shop had a red bicycle for 200 dollars. The second shop had a blue one for 180 dollars. The third shop had a green bicycle for 150 dollars, but it was smaller.\n\nRead and answer.",
        "type": "READING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "Which bicycle was the cheapest?",
            ["the red one", "the blue one", "the green one", "they were all the same price"],
            "the green one",
        ),
    },
    {
        "text": "Tell me about your last vacation. Where did you go? What did you do? Did you enjoy it?",
        "type": "SPEAKING",
        "level": "A2",
        "difficulty": "EASY",
        "correct_answer": "A description of a past vacation using past simple tense with at least three sentences.",
        "phonetic_text": "/tel miː əˈbaʊt jɔːr lɑːst veɪˈkeɪʃən/",
    },
    {
        "text": "Compare your city with a city you have visited. Talk about the differences.",
        "type": "SPEAKING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": "A comparison using comparative adjectives (bigger, more interesting, quieter) with examples.",
        "phonetic_text": "/kəmˈpeər jɔːr ˈsɪti wɪð ə ˈsɪti juː hæv ˈvɪzɪtɪd/",
    },
    {
        "text": "Listen and repeat: a sentence about a past experience.",
        "type": "LISTENING_SHADOWING",
        "level": "A2",
        "difficulty": "EASY",
        "correct_answer": "When I was young, I lived in a small town near the mountains.",
        "phonetic_text": "/wen aɪ wɒz jʌŋ, aɪ lɪvd ɪn ə smɔːl taʊn nɪər ðə ˈmaʊntɪnz/",
    },
    {
        "text": "Listen and repeat: a sentence about plans.",
        "type": "LISTENING_SHADOWING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": "Next summer, I am going to visit my grandparents in the countryside.",
        "phonetic_text": "/nekst ˈsʌmər, aɪ æm ˈɡoʊɪŋ tuː ˈvɪzɪt maɪ ˈɡrændˌperənts/",
    },
    {
        "text": "Listen and answer: Where does the man work?",
        "type": "LISTENING_COMPREHENSION",
        "level": "A2",
        "difficulty": "EASY",
        "correct_answer": mcq(
            "Where does the man work?",
            ["in a hospital", "in a school", "in a restaurant", "in an office"],
            "in a restaurant",
        ),
        "phonetic_text": "I work in a restaurant near the city center. I am a chef. I cook Italian food. I start work at ten in the morning and finish at eight in the evening. I love my job because I enjoy cooking.",
    },
    {
        "text": "Listen and answer: What happened to the woman?",
        "type": "LISTENING_COMPREHENSION",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "What happened to the woman?",
            ["She lost her keys", "She missed the bus", "She forgot her phone", "She broke her umbrella"],
            "She missed the bus",
        ),
        "phonetic_text": "Oh no, I am so sorry I am late! I missed the bus this morning because my alarm did not ring. I had to wait twenty minutes for the next one. It was raining and I did not have my umbrella.",
    },
    {
        "text": "Write about your best friend. Describe what they look like, what they like to do, and why they are your best friend.",
        "type": "WRITING",
        "level": "A2",
        "difficulty": "EASY",
        "correct_answer": "A descriptive paragraph about a friend using adjectives, present tense, and because-clauses.",
    },
    {
        "text": "Write a short email to a friend inviting them to your birthday party. Include the date, time, and place.",
        "type": "WRITING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": "An informal email with greeting, invitation details (date, time, place), and a friendly closing.",
    },

    # ── B1 PRACTICE ───────────────────────────────────────────────────────────
    {
        "text": "The rise of remote work has fundamentally changed how companies operate. Many employees report higher productivity when working from home, as they avoid long commutes and can create their ideal work environment. However, some managers worry about team collaboration and company culture. Studies suggest that a hybrid model, combining office and remote days, may offer the best of both worlds.\n\nRead and answer.",
        "type": "READING",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "According to the passage, what does the hybrid model offer?",
            [
                "Only benefits for employees",
                "Only benefits for managers",
                "The best of both worlds",
                "No significant benefits",
            ],
            "The best of both worlds",
        ),
    },
    {
        "text": "A recent survey of 5,000 teenagers revealed surprising findings about social media usage. While 78% of participants used social media daily, only 35% said it made them feel happier. The majority reported feeling pressured to present a perfect image online. Experts recommend limiting screen time to two hours per day.\n\nRead and answer.",
        "type": "READING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What did the majority of teenagers report about social media?",
            [
                "It made them very happy",
                "They felt pressured to look perfect",
                "They used it less than expected",
                "They preferred books to social media",
            ],
            "They felt pressured to look perfect",
        ),
    },
    {
        "text": "Explain a challenge you faced at school or work and how you overcame it.",
        "type": "SPEAKING",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": "A clear narrative about a specific challenge with problem description, actions taken, and outcome.",
        "phonetic_text": "/ɪkˈspleɪn ə ˈtʃælɪndʒ juː feɪst ænd haʊ juː ˌoʊvərˈkeɪm ɪt/",
    },
    {
        "text": "If you could change one thing about your country's education system, what would it be and why?",
        "type": "SPEAKING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": "A structured opinion using conditional forms, with reasoning and at least one specific example.",
        "phonetic_text": "/ɪf juː kʊd tʃeɪndʒ wʌn θɪŋ əˈbaʊt ˌedʒuˈkeɪʃən/",
    },
    {
        "text": "Listen and repeat: a sentence about environmental awareness.",
        "type": "LISTENING_SHADOWING",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": "We should reduce our consumption of single-use plastics to protect the environment.",
        "phonetic_text": "/wiː ʃʊd rɪˈdjuːs ˈaʊər kənˈsʌmpʃən əv ˌsɪŋɡəl juːs ˈplæstɪks/",
    },
    {
        "text": "Listen and repeat: a compound sentence about technology.",
        "type": "LISTENING_SHADOWING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": "Although technology has made our lives more convenient, it has also created new challenges that we must learn to manage.",
        "phonetic_text": "/ɔːlˈðoʊ tekˈnɒlədʒi hæz meɪd ˈaʊər laɪvz mɔːr kənˈviːniənt/",
    },
    {
        "text": "Listen and answer: Why did the speaker change careers?",
        "type": "LISTENING_COMPREHENSION",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "Why did the speaker change careers?",
            [
                "They wanted a higher salary",
                "They wanted to help people directly",
                "They were fired from their previous job",
                "They moved to a different country",
            ],
            "They wanted to help people directly",
        ),
        "phonetic_text": "I worked in finance for ten years, but I always felt something was missing. I earned a good salary, but I did not feel fulfilled. Last year, I decided to retrain as a nurse. The salary is lower, but now I can help people directly every day. It was the best decision I ever made.",
    },
    {
        "text": "Listen and answer: What is the main point of the news report?",
        "type": "LISTENING_COMPREHENSION",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What is the main point of the news report?",
            [
                "A new park will open next month",
                "The city will ban all cars from the center",
                "Public transport will become free on weekends",
                "A new bicycle sharing program is launching",
            ],
            "A new bicycle sharing program is launching",
        ),
        "phonetic_text": "In local news, the city council announced a new bicycle sharing program that will launch next month. Five hundred bicycles will be available at fifty stations across the city center. The program aims to reduce traffic congestion and air pollution. Residents can use the service for free during the first month.",
    },
    {
        "text": "Write about a book, movie, or TV show you recently enjoyed. What was it about? Why did you like it? Would you recommend it?",
        "type": "WRITING",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": "A review-style paragraph with summary, personal opinion with reasons, and a recommendation.",
    },
    {
        "text": "Some people believe that learning a foreign language should be mandatory in schools from age six. Do you agree or disagree? Write a paragraph explaining your position.",
        "type": "WRITING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": "An argumentative paragraph with a clear position, at least two supporting reasons, and a conclusion.",
    },

    # ── B2 PRACTICE ───────────────────────────────────────────────────────────
    {
        "text": "Cognitive scientists have long debated the relationship between language and thought. The Sapir-Whorf hypothesis suggests that the structure of a language influences the way its speakers perceive and conceptualize the world. While the strong version of this theory—that language determines thought—has been largely discredited, there is growing evidence that language can subtly shape certain aspects of cognition, such as spatial reasoning and color perception.\n\nRead and answer.",
        "type": "READING",
        "level": "B2",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "According to the passage, what is the current scientific view on the Sapir-Whorf hypothesis?",
            [
                "The strong version has been fully confirmed",
                "Language has no effect on thought whatsoever",
                "Language can subtly influence certain cognitive aspects",
                "The hypothesis has been completely abandoned",
            ],
            "Language can subtly influence certain cognitive aspects",
        ),
    },
    {
        "text": "The gig economy has transformed traditional employment patterns, offering workers unprecedented flexibility but often at the cost of job security and benefits. A recent longitudinal study tracking 10,000 gig workers over five years found that while 67% valued the autonomy, nearly half experienced significant financial anxiety. Critics argue that current labor laws have failed to adapt to this new reality, leaving millions of workers in a regulatory gray area.\n\nRead and answer.",
        "type": "READING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What is the main criticism mentioned in the passage?",
            [
                "Gig workers earn too much money",
                "The gig economy reduces autonomy",
                "Labor laws have not adapted to gig work",
                "Workers prefer traditional employment",
            ],
            "Labor laws have not adapted to gig work",
        ),
    },
    {
        "text": "Some argue that social media has strengthened democracy by giving everyone a voice. Others believe it has weakened democracy through misinformation. What is your view?",
        "type": "SPEAKING",
        "level": "B2",
        "difficulty": "MEDIUM",
        "correct_answer": "A nuanced argument acknowledging both perspectives, with specific examples and a clear personal position.",
        "phonetic_text": "/ˈsoʊʃəl ˈmiːdiə ænd dɪˈmɒkrəsi/",
    },
    {
        "text": "Explain the concept of 'work-life balance' and discuss whether it is achievable in today's always-connected world.",
        "type": "SPEAKING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": "An articulate discussion defining the concept, analyzing challenges, and proposing solutions with examples.",
        "phonetic_text": "/wɜːrk laɪf ˈbæləns ɪn təˈdeɪz kəˈnektɪd wɜːrld/",
    },
    {
        "text": "Listen and repeat: a sentence about scientific research.",
        "type": "LISTENING_SHADOWING",
        "level": "B2",
        "difficulty": "MEDIUM",
        "correct_answer": "Preliminary findings suggest that intermittent fasting may have significant benefits for cardiovascular health.",
        "phonetic_text": "/prɪˈlɪmɪnəri ˈfaɪndɪŋz səˈdʒest ðæt ˌɪntərˈmɪtənt ˈfæstɪŋ/",
    },
    {
        "text": "Listen and repeat: an academic statement.",
        "type": "LISTENING_SHADOWING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": "The unprecedented convergence of artificial intelligence and biotechnology raises profound ethical questions that society has yet to adequately address.",
        "phonetic_text": "/ʌnˈpresɪdentɪd kənˈvɜːrdʒəns əv ˌɑːrtɪˈfɪʃəl ɪnˈtelɪdʒəns ænd ˌbaɪoʊtekˈnɒlədʒi/",
    },
    {
        "text": "Listen and answer: What is the economist's prediction?",
        "type": "LISTENING_COMPREHENSION",
        "level": "B2",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "What does the economist predict?",
            [
                "Inflation will decrease sharply next quarter",
                "Renewable energy will become cheaper than fossil fuels within five years",
                "Global trade will collapse entirely",
                "Manufacturing will return to developed countries",
            ],
            "Renewable energy will become cheaper than fossil fuels within five years",
        ),
        "phonetic_text": "The economist argues that renewable energy is approaching a critical tipping point. Solar and wind power costs have dropped by seventy percent over the last decade. According to her projections, renewable energy will become cheaper than fossil fuels within five years, fundamentally reshaping the global energy market.",
    },
    {
        "text": "Listen and answer: What is the main argument in the debate?",
        "type": "LISTENING_COMPREHENSION",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What is the speaker's main argument?",
            [
                "Universities should be free for everyone",
                "Critical thinking is more valuable than memorization",
                "Online degrees are superior to traditional ones",
                "Students should only study STEM subjects",
            ],
            "Critical thinking is more valuable than memorization",
        ),
        "phonetic_text": "The fundamental problem with our education system is its overemphasis on memorization. Students spend years memorizing facts that are instantly accessible on the internet. Instead, we should be teaching critical thinking, problem solving, and the ability to evaluate sources of information. These skills are what employers actually value in the modern workplace.",
    },
    {
        "text": "Write a response to the following statement: 'Universities should prioritize teaching practical job skills over theoretical knowledge.' Do you agree or disagree? Support your argument.",
        "type": "WRITING",
        "level": "B2",
        "difficulty": "MEDIUM",
        "correct_answer": "A well-structured essay response with thesis, counterarguments, supporting evidence, and conclusion.",
    },
    {
        "text": "Write a formal letter of complaint to a hotel manager about a disappointing stay. Include specific issues and request appropriate compensation.",
        "type": "WRITING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": "A formal letter with professional register, specific complaints, evidence of impact, and a reasonable compensation request.",
    },
]


# ══════════════════════════════════════════════════════════════════════════════
#  LEVEL_UP QUESTIONS — 10 per level (2 per skill type, MEDIUM+HARD)
# ══════════════════════════════════════════════════════════════════════════════

LEVEL_UP_QUESTIONS = [
    # ── A1 LEVEL_UP (pass to unlock A2) ───────────────────────────────────────
    {
        "text": "Peter lives in London. He is a bus driver. He wakes up at five o'clock every morning. He drives bus number 73. He likes his job because he meets many people every day. After work, he goes to the gym.\n\nRead and answer.",
        "type": "READING",
        "level": "A1",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "Why does Peter like his job?",
            ["He earns a lot of money", "He meets many people", "He can sleep late", "He works from home"],
            "He meets many people",
        ),
    },
    {
        "text": "Anna has three pets: a dog named Buddy, a cat named Whiskers, and a goldfish. Buddy is brown and very friendly. Whiskers is black and white. The goldfish lives in a bowl on the kitchen table.\n\nRead and answer.",
        "type": "READING",
        "level": "A1",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "Where does the goldfish live?",
            ["in the garden", "in Anna's bedroom", "in a bowl on the kitchen table", "in the bathroom"],
            "in a bowl on the kitchen table",
        ),
    },
    {
        "text": "Describe your bedroom. What things are in it? What color are the walls?",
        "type": "SPEAKING",
        "level": "A1",
        "difficulty": "MEDIUM",
        "correct_answer": "A description of a bedroom using 'there is/are', colors, and prepositions of place.",
        "phonetic_text": "/dɪˈskraɪb jɔːr ˈbedruːm/",
    },
    {
        "text": "Tell me about your favorite food. What is it? How do you make it? When do you eat it?",
        "type": "SPEAKING",
        "level": "A1",
        "difficulty": "HARD",
        "correct_answer": "A description of a food with basic cooking vocabulary, present tense, and personal preferences.",
        "phonetic_text": "/tel miː əˈbaʊt jɔːr ˈfeɪvərɪt fuːd/",
    },
    {
        "text": "Listen and repeat: a sentence about a family routine.",
        "type": "LISTENING_SHADOWING",
        "level": "A1",
        "difficulty": "MEDIUM",
        "correct_answer": "My family eats dinner together every evening at seven o'clock.",
        "phonetic_text": "/maɪ ˈfæməli iːts ˈdɪnər təˈɡeðər ˈevri ˈiːvnɪŋ/",
    },
    {
        "text": "Listen and repeat: a longer sentence about hobbies.",
        "type": "LISTENING_SHADOWING",
        "level": "A1",
        "difficulty": "HARD",
        "correct_answer": "On Saturdays, I like to play football with my friends and then watch a movie.",
        "phonetic_text": "/ɒn ˈsætərdeɪz, aɪ laɪk tuː pleɪ ˈfʊtbɔːl wɪð maɪ frendz/",
    },
    {
        "text": "Listen and answer: What does the boy want for his birthday?",
        "type": "LISTENING_COMPREHENSION",
        "level": "A1",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "What does the boy want for his birthday?",
            ["a new phone", "a bicycle", "a book", "a video game"],
            "a bicycle",
        ),
        "phonetic_text": "Mom, my birthday is next week! Can I have a new bicycle? My old one is too small. I want a blue one. I can ride it to school every day. Please, mom!",
    },
    {
        "text": "Listen and answer: How many people are in the family?",
        "type": "LISTENING_COMPREHENSION",
        "level": "A1",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "How many people are in the family?",
            ["three", "four", "five", "six"],
            "five",
        ),
        "phonetic_text": "Let me tell you about my family. There is my mother, my father, my two brothers, and me. That is five people in total. We all live in a house with a big garden. My brothers are older than me.",
    },
    {
        "text": "Write about your school or workplace. Where is it? What do you do there? Do you like it?",
        "type": "WRITING",
        "level": "A1",
        "difficulty": "MEDIUM",
        "correct_answer": "A short paragraph about school/work with location, activities, and opinion using basic structures.",
    },
    {
        "text": "Write a message to a new classmate. Introduce yourself and ask three questions about them.",
        "type": "WRITING",
        "level": "A1",
        "difficulty": "HARD",
        "correct_answer": "A friendly message with self-introduction and at least three questions using correct question forms.",
    },

    # ── A2 LEVEL_UP (pass to unlock B1) ───────────────────────────────────────
    {
        "text": "The city of Barcelona is famous for its beautiful architecture, especially the works of Antoni Gaudí. Millions of tourists visit the Sagrada Familia every year. The city also has wonderful beaches and excellent food. Many visitors say it is one of the most interesting cities in Europe.\n\nRead and answer.",
        "type": "READING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "What is Barcelona especially famous for?",
            ["its museums", "its architecture", "its nightlife", "its universities"],
            "its architecture",
        ),
    },
    {
        "text": "Dear Hotel Manager,\n\nI stayed at your hotel last weekend. The room was clean and comfortable, but the restaurant service was very slow. We waited forty-five minutes for our breakfast on Saturday. The staff were friendly but there were not enough waiters. I hope you can improve this.\n\nBest regards,\nMr. Thompson\n\nRead and answer.",
        "type": "READING",
        "level": "A2",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What was Mr. Thompson's main complaint?",
            ["The room was dirty", "The restaurant service was slow", "The staff were rude", "The hotel was too expensive"],
            "The restaurant service was slow",
        ),
    },
    {
        "text": "Tell me about a time when you learned something new. What was it? How did you learn it? Was it difficult?",
        "type": "SPEAKING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": "A narrative in past tense about a learning experience with at least four sentences.",
        "phonetic_text": "/tel miː əˈbaʊt ə taɪm wen juː lɜːrnd ˈsʌmθɪŋ njuː/",
    },
    {
        "text": "You are planning a trip to London. Tell me what you would like to see and do there.",
        "type": "SPEAKING",
        "level": "A2",
        "difficulty": "HARD",
        "correct_answer": "A description of travel plans using 'would like to', 'want to', 'going to' with specific activities.",
        "phonetic_text": "/plænɪŋ ə trɪp tuː ˈlʌndən/",
    },
    {
        "text": "Listen and repeat: a sentence about a past event.",
        "type": "LISTENING_SHADOWING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": "Last year, we celebrated my grandmother's eightieth birthday with a big party.",
        "phonetic_text": "/lɑːst jɪər, wiː ˈselɪbreɪtɪd maɪ ˈɡrændˌmʌðərz ˈeɪtiəθ ˈbɜːrθdeɪ/",
    },
    {
        "text": "Listen and repeat: a sentence with a time clause.",
        "type": "LISTENING_SHADOWING",
        "level": "A2",
        "difficulty": "HARD",
        "correct_answer": "Before I moved to this city, I had never seen such tall buildings or so many cars.",
        "phonetic_text": "/bɪˈfɔːr aɪ muːvd tuː ðɪs ˈsɪti, aɪ hæd ˈnevər siːn sʌtʃ tɔːl ˈbɪldɪŋz/",
    },
    {
        "text": "Listen and answer: Why is the woman upset?",
        "type": "LISTENING_COMPREHENSION",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "Why is the woman upset?",
            ["Her flight was canceled", "She lost her passport", "The taxi was late", "The hotel lost her reservation"],
            "The hotel lost her reservation",
        ),
        "phonetic_text": "I cannot believe this! I booked this hotel room three months ago and now you are telling me you do not have my reservation? I have the confirmation email right here on my phone. I traveled for six hours to get here. This is unacceptable!",
    },
    {
        "text": "Listen and answer: What advice does the doctor give?",
        "type": "LISTENING_COMPREHENSION",
        "level": "A2",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What does the doctor recommend?",
            [
                "Take medicine three times a day",
                "Drink more water and rest for two days",
                "Go to the hospital immediately",
                "Exercise more often",
            ],
            "Drink more water and rest for two days",
        ),
        "phonetic_text": "You have a mild cold, nothing serious. I recommend that you drink plenty of water and rest for the next two days. You do not need any medicine. If you still feel sick after three days, come back and see me again.",
    },
    {
        "text": "Write about your favorite holiday or celebration. When is it? How do people celebrate? What makes it special for you?",
        "type": "WRITING",
        "level": "A2",
        "difficulty": "MEDIUM",
        "correct_answer": "A descriptive paragraph about a celebration with cultural details and personal connection.",
    },
    {
        "text": "Write a review of a restaurant you have been to recently. Describe the food, the service, the atmosphere, and give a rating out of five.",
        "type": "WRITING",
        "level": "A2",
        "difficulty": "HARD",
        "correct_answer": "A structured review with descriptions of food, service, atmosphere, personal opinion, and a rating.",
    },

    # ── B1 LEVEL_UP (pass to unlock B2) ───────────────────────────────────────
    {
        "text": "The concept of 'fast fashion' has come under increasing scrutiny in recent years. Brands that produce cheap, trendy clothing contribute to enormous waste—approximately 92 million tons of textile waste is generated globally each year. Environmental activists argue that consumers should buy fewer, higher-quality items. However, critics point out that sustainable fashion is often too expensive for average consumers.\n\nRead and answer.",
        "type": "READING",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "What is the main environmental problem with fast fashion?",
            [
                "It uses too much water",
                "It generates enormous textile waste",
                "It causes air pollution in cities",
                "It destroys natural habitats",
            ],
            "It generates enormous textile waste",
        ),
    },
    {
        "text": "A study by the World Health Organization found that people who walk at least 30 minutes a day have a 25% lower risk of heart disease. Furthermore, regular walking has been shown to improve memory and cognitive function in older adults. Despite these well-documented benefits, fewer than 40% of adults in developed countries meet the recommended daily activity levels.\n\nRead and answer.",
        "type": "READING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What surprising statistic is mentioned about adults in developed countries?",
            [
                "Most adults walk more than recommended",
                "Fewer than 40% meet daily activity recommendations",
                "Walking has no effect on cognitive function",
                "Heart disease rates have decreased significantly",
            ],
            "Fewer than 40% meet daily activity recommendations",
        ),
    },
    {
        "text": "Do you think people spend too much time on their phones? Why or why not? Give examples.",
        "type": "SPEAKING",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": "An organized opinion with examples from personal experience or observation, using opinion phrases.",
        "phonetic_text": "/duː juː θɪŋk ˈpiːpəl spend tuː mʌtʃ taɪm ɒn ðeər foʊnz/",
    },
    {
        "text": "Describe the most important invention of the last century and explain why you think it is the most important.",
        "type": "SPEAKING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": "A well-reasoned argument identifying an invention, explaining its impact, and comparing to alternatives.",
        "phonetic_text": "/ðə moʊst ɪmˈpɔːrtənt ɪnˈvenʃən/",
    },
    {
        "text": "Listen and repeat: a cause-and-effect sentence.",
        "type": "LISTENING_SHADOWING",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": "Because the government invested heavily in renewable energy, carbon emissions decreased by fifteen percent.",
        "phonetic_text": "/bɪˈkɒz ðə ˈɡʌvərnmənt ɪnˈvestɪd ˈhevɪli ɪn rɪˈnjuːəbəl ˈenərdʒi/",
    },
    {
        "text": "Listen and repeat: a sentence with a relative clause.",
        "type": "LISTENING_SHADOWING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": "The documentary, which was filmed over three years in the Amazon rainforest, has won several international awards.",
        "phonetic_text": "/ðə ˌdɒkjuˈmentəri, wɪtʃ wɒz fɪlmd ˈoʊvər θriː jɪərz/",
    },
    {
        "text": "Listen and answer: What decision did the company make?",
        "type": "LISTENING_COMPREHENSION",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "What did the company decide?",
            [
                "To close all physical stores",
                "To offer employees a four-day work week",
                "To move headquarters to another country",
                "To reduce salaries by ten percent",
            ],
            "To offer employees a four-day work week",
        ),
        "phonetic_text": "In a bold move, the company announced that starting next quarter, all employees will have the option of working a four-day work week. The CEO explained that a six-month trial showed productivity actually increased by eight percent when workers had an extra day off. Employees will maintain their current salaries.",
    },
    {
        "text": "Listen and answer: What is the professor's main concern?",
        "type": "LISTENING_COMPREHENSION",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What is the professor mainly concerned about?",
            [
                "Students are not reading enough books",
                "AI tools are replacing critical thinking in education",
                "Universities are becoming too expensive",
                "Teachers are not using technology effectively",
            ],
            "AI tools are replacing critical thinking in education",
        ),
        "phonetic_text": "My main concern is that students are increasingly relying on AI tools to complete their assignments without truly understanding the material. When a student uses an AI to write an essay, they miss the entire learning process: researching, organizing ideas, and developing their own arguments. We are in danger of producing graduates who can use tools but cannot think independently.",
    },
    {
        "text": "Write a persuasive paragraph arguing that public transport should be free for students. Give at least three reasons.",
        "type": "WRITING",
        "level": "B1",
        "difficulty": "MEDIUM",
        "correct_answer": "A persuasive paragraph with a clear claim, at least three supporting reasons, and a concluding statement.",
    },
    {
        "text": "Imagine you witnessed a minor car accident. Write a short report describing what happened, including the time, location, vehicles involved, and what you saw.",
        "type": "WRITING",
        "level": "B1",
        "difficulty": "HARD",
        "correct_answer": "A factual report with objective description, specific details (time, place, vehicles), and chronological sequence.",
    },

    # ── B2 LEVEL_UP (pass to unlock C1) ───────────────────────────────────────
    {
        "text": "The paradox of choice, a concept popularized by psychologist Barry Schwartz, suggests that an abundance of options can lead to decision paralysis and decreased satisfaction. In a now-famous experiment, shoppers who were offered six varieties of jam were ten times more likely to make a purchase than those offered twenty-four varieties. This phenomenon has profound implications for product design, marketing, and even public policy.\n\nRead and answer.",
        "type": "READING",
        "level": "B2",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "What did the jam experiment demonstrate?",
            [
                "People prefer expensive products",
                "Fewer options can lead to more purchases",
                "Twenty-four varieties sell better than six",
                "Shoppers do not like jam",
            ],
            "Fewer options can lead to more purchases",
        ),
    },
    {
        "text": "Epigenetics, the study of heritable changes in gene expression that do not involve alterations to the DNA sequence itself, has revolutionized our understanding of how environmental factors influence health. Research has demonstrated that stress, diet, and exposure to toxins can modify gene expression patterns that may persist across generations. This challenges the traditional view that genetic inheritance is solely determined at conception and raises uncomfortable questions about intergenerational responsibility.\n\nRead and answer.",
        "type": "READING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What traditional view does epigenetics challenge?",
            [
                "That DNA contains genetic information",
                "That genetic inheritance is fixed at conception",
                "That the environment has no effect on health",
                "That stress is harmful to the body",
            ],
            "That genetic inheritance is fixed at conception",
        ),
    },
    {
        "text": "To what extent should governments regulate the use of artificial intelligence? Consider both the benefits and potential risks.",
        "type": "SPEAKING",
        "level": "B2",
        "difficulty": "MEDIUM",
        "correct_answer": "A balanced discussion using hedging language, concrete examples, and a nuanced personal conclusion.",
        "phonetic_text": "/tuː wɒt ɪkˈstent ʃʊd ˈɡʌvərnmənts ˈreɡjuleɪt eɪ aɪ/",
    },
    {
        "text": "Analyze the statement: 'Economic growth and environmental protection are fundamentally incompatible.' Do you agree?",
        "type": "SPEAKING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": "A sophisticated analysis acknowledging complexity, citing examples of both conflict and harmony, with a justified conclusion.",
        "phonetic_text": "/ˌekəˈnɒmɪk ɡroʊθ ænd ɪnˌvaɪrənˈmentəl prəˈtekʃən/",
    },
    {
        "text": "Listen and repeat: a sentence about research methodology.",
        "type": "LISTENING_SHADOWING",
        "level": "B2",
        "difficulty": "MEDIUM",
        "correct_answer": "The researchers employed a double-blind randomized controlled trial to minimize the potential for observer bias.",
        "phonetic_text": "/ðə rɪˈsɜːrtʃərz ɪmˈplɔɪd ə ˈdʌbəl blaɪnd ˈrændəmaɪzd kənˈtroʊld ˈtraɪəl/",
    },
    {
        "text": "Listen and repeat: a complex philosophical statement.",
        "type": "LISTENING_SHADOWING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": "The distinction between correlation and causation is fundamental to scientific reasoning, yet it remains one of the most commonly misunderstood concepts in public discourse.",
        "phonetic_text": "/ðə dɪˈstɪŋkʃən bɪˈtwiːn ˌkɒrəˈleɪʃən ænd ˌkɔːˈzeɪʃən/",
    },
    {
        "text": "Listen and answer: What is the historian's interpretation?",
        "type": "LISTENING_COMPREHENSION",
        "level": "B2",
        "difficulty": "MEDIUM",
        "correct_answer": mcq(
            "What does the historian argue?",
            [
                "The Industrial Revolution had only negative effects",
                "Technological change always benefits the working class",
                "Economic disruption creates both winners and losers simultaneously",
                "Government intervention always prevents economic progress",
            ],
            "Economic disruption creates both winners and losers simultaneously",
        ),
        "phonetic_text": "The historian argues that every period of major technological change has created both winners and losers simultaneously. The Industrial Revolution, for instance, generated enormous wealth but also displaced millions of agricultural workers. Similarly, the digital revolution has created entirely new industries while rendering others obsolete. The challenge for policymakers is managing this transition equitably.",
    },
    {
        "text": "Listen and answer: What does the philosopher conclude about free will?",
        "type": "LISTENING_COMPREHENSION",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": mcq(
            "What is the philosopher's conclusion?",
            [
                "Free will is an illusion created by the brain",
                "Humans have complete free will in all situations",
                "The question of free will is meaningless",
                "Free will exists but is constrained by circumstances",
            ],
            "Free will exists but is constrained by circumstances",
        ),
        "phonetic_text": "The philosopher suggests a middle position in the free will debate. While we are undoubtedly influenced by our genetics, upbringing, and circumstances, these factors do not completely determine our choices. We possess genuine agency, but it operates within constraints. The key insight is that recognizing our limitations actually enhances our capacity to make meaningful choices within those boundaries.",
    },
    {
        "text": "Write an essay of at least 150 words evaluating the claim that 'social media does more harm than good to society.' Present arguments on both sides before stating your own view.",
        "type": "WRITING",
        "level": "B2",
        "difficulty": "MEDIUM",
        "correct_answer": "A balanced essay with introduction, arguments for and against, personal position with justification, and conclusion.",
    },
    {
        "text": "Write a proposal to your company's management suggesting the implementation of a mentorship program for new employees. Include the benefits, proposed structure, and potential challenges.",
        "type": "WRITING",
        "level": "B2",
        "difficulty": "HARD",
        "correct_answer": "A professional proposal with clear structure, persuasive benefits, practical implementation details, and risk mitigation.",
    },
]


# ══════════════════════════════════════════════════════════════════════════════
#  EXAM DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════════

EXAM_DEFINITIONS = [
    {
        "level": "A1",
        "type": "DIAGNOSTIC",
        "name": "Diagnostic Assessment",
        "description": "Initial assessment to determine your English level. Covers all four skills across multiple CEFR levels.",
        "xp_required": 0,
        "passing_score": 60,
        "time_limit_minutes": 30,
        "question_count": 20,
    },
    {
        "level": "A1",
        "type": "LEVEL_UP",
        "name": "A1 → A2 Level Exam",
        "description": "Pass this exam to advance from Beginner (A1) to Elementary (A2). You need to demonstrate mastery of basic English skills.",
        "xp_required": 200,
        "passing_score": 70,
        "time_limit_minutes": 30,
        "question_count": 10,
    },
    {
        "level": "A2",
        "type": "LEVEL_UP",
        "name": "A2 → B1 Level Exam",
        "description": "Pass this exam to advance from Elementary (A2) to Intermediate (B1). Show your ability to handle everyday situations.",
        "xp_required": 300,
        "passing_score": 70,
        "time_limit_minutes": 40,
        "question_count": 10,
    },
    {
        "level": "B1",
        "type": "LEVEL_UP",
        "name": "B1 → B2 Level Exam",
        "description": "Pass this exam to advance from Intermediate (B1) to Upper-Intermediate (B2). Demonstrate your ability to express opinions and handle complex topics.",
        "xp_required": 400,
        "passing_score": 70,
        "time_limit_minutes": 45,
        "question_count": 10,
    },
    {
        "level": "B2",
        "type": "LEVEL_UP",
        "name": "B2 → C1 Level Exam",
        "description": "Pass this exam to advance from Upper-Intermediate (B2) to Advanced (C1). Show your ability to analyze complex topics with nuance.",
        "xp_required": 500,
        "passing_score": 70,
        "time_limit_minutes": 60,
        "question_count": 10,
    },
]


# ══════════════════════════════════════════════════════════════════════════════
#  ADDITIONAL VOCABULARY
# ══════════════════════════════════════════════════════════════════════════════

EXTRA_VOCABULARY = [
    # A1
    ("hello", "A greeting used when meeting someone.", "/həˈloʊ/", "Hello! My name is Sarah.", "A1", "Greetings"),
    ("family", "A group of related people.", "/ˈfæməli/", "I have a big family.", "A1", "People"),
    ("school", "A place where children learn.", "/skuːl/", "I go to school every day.", "A1", "Places"),
    ("morning", "The early part of the day.", "/ˈmɔːrnɪŋ/", "Good morning! How are you?", "A1", "Time"),
    ("happy", "Feeling glad or pleased.", "/ˈhæpi/", "She is very happy today.", "A1", "Emotions"),
    ("breakfast", "The first meal of the day.", "/ˈbrekfəst/", "I eat breakfast at seven.", "A1", "Food"),
    ("friend", "A person you like and enjoy time with.", "/frend/", "Tom is my best friend.", "A1", "People"),
    ("house", "A building where people live.", "/haʊs/", "We live in a small house.", "A1", "Places"),
    # A2
    ("vacation", "A period of rest from work or school.", "/veɪˈkeɪʃən/", "We went on vacation last summer.", "A2", "Travel"),
    ("restaurant", "A place where you can buy and eat meals.", "/ˈrestərɒnt/", "Let's eat at that Italian restaurant.", "A2", "Places"),
    ("expensive", "Costing a lot of money.", "/ɪkˈspensɪv/", "That bag is too expensive.", "A2", "Shopping"),
    ("directions", "Instructions for getting somewhere.", "/dɪˈrekʃənz/", "Can you give me directions to the station?", "A2", "Travel"),
    ("celebrate", "To observe an occasion with festivities.", "/ˈselɪbreɪt/", "We celebrate Christmas every year.", "A2", "Culture"),
    ("weather", "The state of the atmosphere.", "/ˈweðər/", "The weather is beautiful today.", "A2", "Nature"),
    # B1
    ("environment", "The natural world around us.", "/ɪnˈvaɪrənmənt/", "We must protect the environment.", "B1", "Nature"),
    ("opportunity", "A chance for progress or advancement.", "/ˌɒpərˈtjuːnɪti/", "This job is a great opportunity.", "B1", "Work"),
    ("experience", "Knowledge gained from doing things.", "/ɪkˈspɪəriəns/", "She has ten years of experience.", "B1", "Work"),
    ("recommend", "To suggest something as good or suitable.", "/ˌrekəˈmend/", "I recommend this book highly.", "B1", "Communication"),
    ("influence", "The power to affect others' behavior.", "/ˈɪnfluəns/", "Social media has a big influence on young people.", "B1", "Society"),
    ("debate", "A formal discussion of opposing views.", "/dɪˈbeɪt/", "The climate debate is ongoing.", "B1", "Society"),
    # B2
    ("unprecedented", "Never done or known before.", "/ʌnˈpresɪdentɪd/", "The crisis was unprecedented in scale.", "B2", "Academic"),
    ("sustainability", "Maintaining ecological balance.", "/səˌsteɪnəˈbɪlɪti/", "Sustainability is a key business concern.", "B2", "Environment"),
    ("controversial", "Causing public disagreement.", "/ˌkɒntrəˈvɜːrʃəl/", "The policy is highly controversial.", "B2", "Society"),
    ("cognitive", "Relating to mental processes.", "/ˈkɒɡnɪtɪv/", "Cognitive skills decline with age.", "B2", "Science"),
    ("implication", "A likely consequence of something.", "/ˌɪmplɪˈkeɪʃən/", "The implications of this discovery are vast.", "B2", "Academic"),
    ("paradigm", "A typical example or pattern.", "/ˈpærədaɪm/", "This represents a paradigm shift in medicine.", "B2", "Academic"),
]


class Command(BaseCommand):
    help = "Seed comprehensive exercise data: diagnostic, practice, level-up exams for A1-B2."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Remove existing questions, exams, and exam-questions before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clean"]:
            self._clean()

        admin = self._get_admin()
        self._create_system_config()

        self.stdout.write("Creating DIAGNOSTIC questions …")
        diag_qs = self._create_questions(admin, DIAGNOSTIC_QUESTIONS, "DIAGNOSTIC")

        self.stdout.write("Creating PRACTICE questions …")
        prac_qs = self._create_questions(admin, PRACTICE_QUESTIONS, "PRACTICE")

        self.stdout.write("Creating LEVEL_UP questions …")
        lvlup_qs = self._create_questions(admin, LEVEL_UP_QUESTIONS, "LEVEL_UP")

        self.stdout.write("Creating exams …")
        self._create_exams(diag_qs, lvlup_qs)

        self.stdout.write("Creating vocabulary …")
        vocab = self._create_vocabulary(admin)
        self._link_vocabulary(diag_qs + prac_qs + lvlup_qs, vocab)

        self._create_courses()

        total = len(diag_qs) + len(prac_qs) + len(lvlup_qs)
        self.stdout.write(self.style.SUCCESS(
            f"Done — {total} questions, "
            f"{Exam.objects.count()} exams, "
            f"{Vocabulary.objects.count()} vocabulary words."
        ))

    # ── helpers ────────────────────────────────────────────────────────────────

    def _clean(self):
        self.stdout.write(self.style.WARNING("Cleaning existing data …"))
        from django.db import connection
        with connection.cursor() as cursor:
            for table in ("exercise_xp_records",):
                cursor.execute(
                    f"DELETE FROM {table}" if self._table_exists(cursor, table) else "SELECT 1"
                )
        ExamQuestion.objects.all().delete()
        Exam.objects.all().delete()
        QuestionVocabulary.objects.all().delete()

        from attempts.models import SpeakingAttempt, ReadingAttempt, ListeningAttempt, WritingAttempt
        SpeakingAttempt.objects.all().delete()
        ReadingAttempt.objects.all().delete()
        ListeningAttempt.objects.all().delete()
        WritingAttempt.objects.all().delete()

        Question.objects.all().delete()

    @staticmethod
    def _table_exists(cursor, table_name):
        cursor.execute(
            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=%s)",
            [table_name],
        )
        return cursor.fetchone()[0]

    def _get_admin(self):
        User = get_user_model()
        admin, created = User.objects.get_or_create(
            email="admin@speakbranch.local",
            defaults={
                "first_name": "Admin",
                "role": "ADMIN",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "password_hash": make_password("Admin123!"),
            },
        )
        if created:
            admin.set_password("Admin123!")
            admin.save(update_fields=["password"])
        return admin

    def _create_system_config(self):
        SystemConfig.get()

    def _create_questions(self, admin, question_list, category):
        created = []
        for seed in question_list:
            q, _ = Question.objects.update_or_create(
                text=seed["text"],
                type=seed["type"],
                level=seed["level"],
                defaults={
                    "category": category,
                    "correct_answer": seed["correct_answer"],
                    "difficulty": seed["difficulty"],
                    "phonetic_text": seed.get("phonetic_text", ""),
                    "audio_url": seed.get("audio_url"),
                    "max_replays": 3 if seed["type"] == "LISTENING_COMPREHENSION" else None,
                    "created_by": admin,
                    "is_active": True,
                },
            )
            created.append(q)
        return created

    def _create_exams(self, diag_qs, lvlup_qs):
        for defn in EXAM_DEFINITIONS:
            exam, _ = Exam.objects.update_or_create(
                level=defn["level"],
                type=defn["type"],
                defaults={
                    "name": defn["name"],
                    "description": defn["description"],
                    "xp_required": defn["xp_required"],
                    "passing_score": defn["passing_score"],
                    "time_limit_minutes": defn["time_limit_minutes"],
                    "question_count": defn["question_count"],
                    "is_active": True,
                },
            )

            # Clear existing links and re-create
            ExamQuestion.objects.filter(exam=exam).delete()

            if defn["type"] == "DIAGNOSTIC":
                # Diagnostic exam gets ALL diagnostic questions
                questions = diag_qs
            else:
                # Level-up exam gets questions from that level
                questions = [q for q in lvlup_qs if q.level == defn["level"]]

            for i, q in enumerate(questions, start=1):
                ExamQuestion.objects.create(
                    exam=exam, question=q, order=i, points=10,
                )

    def _create_vocabulary(self, admin):
        items = []
        for word, meaning, pron, example, level, category in EXTRA_VOCABULARY:
            v, _ = Vocabulary.objects.get_or_create(
                word=word,
                defaults={
                    "meaning": meaning,
                    "pronunciation": pron,
                    "example_sentence": example,
                    "level": level,
                    "category": category,
                    "daily_flag": True,
                    "created_by": admin,
                },
            )
            items.append(v)
        return items

    def _link_vocabulary(self, questions, vocab_items):
        word_map = {v.word: v for v in vocab_items}
        all_words = list(word_map.keys())
        if not all_words:
            return

        for q in questions:
            text_lower = q.text.lower()
            linked = 0
            for word in all_words:
                if word.lower() in text_lower and linked < 3:
                    vocab = word_map[word]
                    QuestionVocabulary.objects.get_or_create(
                        question=q,
                        vocabulary=vocab,
                        defaults={"is_key": linked == 0, "order": linked},
                    )
                    linked += 1

    def _create_courses(self):
        course_data = [
            ("Starter English", "A1", "Master the foundations: greetings, basic vocabulary, and simple sentences."),
            ("Everyday English", "A2", "Handle daily situations: shopping, travel, and social conversations."),
            ("Confident English", "B1", "Express opinions, discuss current events, and write structured paragraphs."),
            ("Professional English", "B2", "Engage with complex topics, formal writing, and nuanced arguments."),
        ]
        for name, level, desc in course_data:
            Course.objects.get_or_create(
                name=name,
                level=level,
                defaults={"description": desc},
            )
