#!/usr/bin/env python
"""
Simple performance test for Question queryset and serialization
"""
import os
import sys
import django
import time

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from questions.models import Question
from questions.serializers import QuestionListSerializer, BaseQuestionSerializer

def test_performance():
    """Test the list endpoint performance"""
    
    # Get total question count
    total_questions = Question.objects.filter(is_active=True).count()
    print(f"\nTotal active questions in DB: {total_questions}")
    
    # Test 1: Old approach (without prefetch_related)
    print("\n--- Test 1: Old Approach (no prefetch_related) ---")
    start = time.time()
    qs_old = Question.objects.select_related('created_by').filter(is_active=True)[:20]
    query_time_old = time.time() - start
    print(f"Query time: {query_time_old:.3f}s")
    
    start = time.time()
    data_old = list(qs_old)  # Force evaluation
    eval_time_old = time.time() - start
    print(f"Query evaluation time: {eval_time_old:.3f}s")
    
    # Test 2: New approach (with prefetch_related)
    print("\n--- Test 2: New Approach (with prefetch_related) ---")
    start = time.time()
    qs_new = Question.objects.select_related('created_by').prefetch_related(
        'vocabulary_items',
        'vocabulary_items__vocabulary',
    ).filter(is_active=True)[:20]
    query_time_new = time.time() - start
    print(f"Query time: {query_time_new:.3f}s")
    
    start = time.time()
    data_new = list(qs_new)  # Force evaluation
    eval_time_new = time.time() - start
    print(f"Query evaluation time: {eval_time_new:.3f}s")
    
    # Test 3: Serialization with lightweight serializer
    print("\n--- Test 3: Lightweight Serializer (QuestionListSerializer) ---")
    start = time.time()
    serializer = QuestionListSerializer(qs_new, many=True)
    serialized_data = serializer.data
    serial_time_light = time.time() - start
    print(f"Serialization time: {serial_time_light:.3f}s")
    print(f"Items serialized: {len(serialized_data)}")
    
    # Test 4: Full pipeline
    print("\n--- Test 4: Full Pipeline (Query + Serialize) ---")
    start = time.time()
    qs_full = Question.objects.select_related('created_by').prefetch_related(
        'vocabulary_items',
        'vocabulary_items__vocabulary',
    ).filter(is_active=True)[:20]
    data_full = list(qs_full)
    serializer_full = QuestionListSerializer(data_full, many=True)
    result = serializer_full.data
    full_time = time.time() - start
    print(f"Full pipeline time: {full_time:.3f}s")
    
    print("\n--- Summary ---")
    print(f"✓ Query only: {query_time_new:.3f}s")
    print(f"✓ Query + Evaluate: {eval_time_new:.3f}s")
    print(f"✓ Serialization (lightweight): {serial_time_light:.3f}s")
    print(f"✓ Full pipeline: {full_time:.3f}s")
    print(f"\n✓ Expected: Should be < 0.5s for 20 items")
    print(f"✓ Actual: {full_time:.3f}s")
    print(f"\n{'✅ PASS' if full_time < 0.5 else '⚠️  SLOW'} - Performance {'acceptable' if full_time < 0.5 else 'needs attention'}")
    
if __name__ == '__main__':
    test_performance()
