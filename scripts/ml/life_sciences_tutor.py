import os
import sys
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

class Grade12LifeSciencesAIEngine:
    def __init__(self, data_path=None):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.data_path = data_path or os.path.join(base_dir, 'data', 'life_sciences_grade12_kb.json')
        self.models_dir = os.path.join(base_dir, 'models')
        os.makedirs(self.models_dir, exist_ok=True)
        
        with open(self.data_path, 'r', encoding='utf-8') as f:
            self.kb = json.load(f)

        # Build corpus for Chapter 6 NLP (N-Grams + TF-IDF)
        self.corpus = []
        for item in self.kb:
            text = f"{item['topic']} {item['subtopic']} {item['question']} {' '.join(item['keywords'])}"
            self.corpus.append(text)

        # TF-IDF Vectorizer with unigrams + bigrams (as per Chapter 6.4 - 6.5)
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
        self.tfidf_matrix = self.vectorizer.fit_transform(self.corpus)

    def query_topic(self, user_query):
        """Matches a learner question to the most relevant CAPS topic using TF-IDF cosine similarity."""
        query_vec = self.vectorizer.transform([user_query])
        similarities = cosine_similarity(query_vec, self.tfidf_matrix)[0]
        best_idx = int(np.argmax(similarities))
        score = float(similarities[best_idx])
        
        best_match = self.kb[best_idx]
        return {
            'match_score': round(score, 4),
            'topic': best_match['topic'],
            'paper': best_match['paper'],
            'subtopic': best_match['subtopic'],
            'question': best_match['question'],
            'model_answer': best_match['model_answer'],
            'rubric_points': best_match['rubric_points'],
            'common_misconceptions': best_match['common_misconceptions'],
            'keywords': best_match['keywords'],
            'id': best_match['id']
        }

    def evaluate_student_answer(self, item_id, student_text):
        """Grades a student's answer against the DBE CAPS marking rubric & identifies missing keywords."""
        item = next((x for x in self.kb if x['id'] == item_id), None)
        if not item:
            return {'error': f"Item ID {item_id} not found."}

        student_lower = student_text.lower()
        matched_keywords = [k for k in item['keywords'] if k.lower() in student_lower]
        missing_keywords = [k for k in item['keywords'] if k.lower() not in student_lower]

        total_rubric = len(item['rubric_points'])
        keyword_pct = len(matched_keywords) / max(1, len(item['keywords']))
        
        # Estimate marks based on biological terminology density
        estimated_mark = int(round(keyword_pct * total_rubric))
        percentage = round((estimated_mark / total_rubric) * 100, 1)

        # Check for known misconceptions
        detected_misconceptions = []
        if 'uracil' in item['keywords'] and 'thymine' in student_lower and 'mrna' in student_lower:
            detected_misconceptions.append("Check base pairing: In RNA/mRNA, Adenine pairs with Uracil (U), not Thymine (T).")
        if 'ligaments' in item['keywords'] and 'contract' in student_lower:
            detected_misconceptions.append("Ligaments cannot contract. Only ciliary muscles contract; suspensory ligaments become slack or tighten.")

        return {
            'item_id': item_id,
            'topic': item['topic'],
            'subtopic': item['subtopic'],
            'estimated_mark': f"{estimated_mark}/{total_rubric}",
            'percentage': f"{percentage}%",
            'matched_terms': matched_keywords,
            'missing_terms': missing_keywords,
            'rubric_checklist': item['rubric_points'],
            'detected_misconceptions': detected_misconceptions,
            'official_model_answer': item['model_answer'],
            'feedback': "Excellent biological terminology!" if percentage >= 80 else ("Good effort, but review missing key terms." if percentage >= 50 else "Critical gaps in biological process terms.")
        }

    def export_artifacts(self):
        """Serializes the Life Sciences AI Assistant artifacts for in-app Node.js/React integration."""
        artifacts_path = os.path.join(self.models_dir, 'life_sciences_grade12_artifacts.json')
        payload = {
            'subject': 'Life Sciences',
            'grade': 12,
            'version': '1.0.0-caps-ai',
            'total_topics': len(self.kb),
            'papers': ['Paper 1: Physiology & Homeostasis', 'Paper 2: Genetics, DNA & Evolution'],
            'knowledge_base': self.kb,
            'vocabulary_size': len(self.vectorizer.vocabulary_)
        }
        with open(artifacts_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2)
        print(f"[+] Exported Grade 12 Life Sciences artifacts to: {artifacts_path}")
        return artifacts_path

def main():
    print("=" * 75)
    print("GRADE 12 LIFE SCIENCES AI ASSISTANT & EXAM DIAGNOSTIC ENGINE")
    print("=" * 75)

    engine = Grade12LifeSciencesAIEngine()
    print(f"[*] Loaded knowledge base with {len(engine.kb)} core CAPS syllabus topics.")
    print(f"[*] Vocabulary size from TF-IDF unigrams & bigrams: {len(engine.vectorizer.vocabulary_)} terms.")

    # Test 1: Query resolution
    test_query = "How does DNA make mRNA during transcription?"
    print(f"\n[Test Query]: \"{test_query}\"")
    match = engine.query_topic(test_query)
    print(f" -> Matched: [{match['paper']}] {match['topic']} - {match['subtopic']} (Confidence: {match['match_score']})")
    print(f" -> Key Terms: {', '.join(match['keywords'][:5])}...")

    # Test 2: Student answer evaluation
    sample_student_answer = "DNA unwinds and unzips when hydrogen bonds break. One strand is a template and free RNA nucleotides pair with bases like adenine with uracil. mRNA is formed and leaves the nucleus."
    print(f"\n[Evaluating Student Response for {match['id']}]:")
    print(f" \"{sample_student_answer}\"")
    eval_res = engine.evaluate_student_answer(match['id'], sample_student_answer)
    print(f" -> Estimated Mark: {eval_res['estimated_mark']} ({eval_res['percentage']})")
    print(f" -> Matched Terms: {eval_res['matched_terms']}")
    print(f" -> Missing Terms: {eval_res['missing_terms']}")
    print(f" -> Feedback: {eval_res['feedback']}")

    # Export artifacts
    engine.export_artifacts()
    print("=" * 75)

if __name__ == '__main__':
    main()
