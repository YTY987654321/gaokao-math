"""Generate Gaokao math content using OpenAI API."""

import json
import time
from typing import List, Dict, Any, Optional
from openai import OpenAI

from config import OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL, PRODUCTS, OUTPUT_DIR
from prompt_templates import (
    SYSTEM_PROMPT,
    generate_questions_prompt,
    generate_mock_exam_prompt,
    generate_answer_key_prompt,
)


class GaokaoMathGenerator:
    """Generates Gaokao math questions and exams using LLM."""

    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required. Set it in .env file.")
        self.client = OpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
        )

    def _call_llm(self, prompt: str, system: str = None, temperature: float = 0.7) -> str:
        """Call the LLM and return raw response."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=temperature,
        )
        return response.choices[0].message.content

    def _extract_json(self, text: str) -> Any:
        """Extract JSON from LLM response, handling markdown code blocks."""
        text = text.strip()
        # Try direct parse first
        for start_marker in ["```json\n", "```\n", "```"]:
            if start_marker in text:
                text = text.split(start_marker, 1)[1]
                text = text.rsplit("```", 1)[0]
                text = text.strip()
                break
        return json.loads(text)

    def generate_questions(self, topic: str, difficulty: str, count: int) -> List[Dict]:
        """Generate questions on a specific topic."""
        prompt = generate_questions_prompt(topic, difficulty, count)
        raw = self._call_llm(prompt, system=SYSTEM_PROMPT)
        questions = self._extract_json(raw)
        if isinstance(questions, dict) and "questions" in questions:
            questions = questions["questions"]
        return questions

    def generate_mock_exam(self) -> Dict:
        """Generate a full mock exam."""
        prompt = generate_mock_exam_prompt()
        raw = self._call_llm(prompt, system=SYSTEM_PROMPT, temperature=0.8)
        return self._extract_json(raw)

    def generate_pack(self, product_slug: str) -> Dict:
        """Generate a complete product pack."""
        product = PRODUCTS.get(product_slug)
        if not product:
            raise ValueError(f"Unknown product: {product_slug}")

        print(f"🧮 Generating: {product['name']}...")

        if product_slug.startswith("mock-exam"):
            content = self.generate_mock_exam()
        else:
            questions = self.generate_questions(
                product["topic"],
                product["difficulty"],
                product["question_count"],
            )
            content = {
                "title": product["name"],
                "topic": product["topic"],
                "difficulty": product["difficulty"],
                "questions": questions,
            }

        # Save raw JSON
        output_path = f"{OUTPUT_DIR}/{product_slug}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print(f"  ✅ Saved: {output_path}")

        return content

    def generate_all_packs(self) -> List[str]:
        """Generate all configured product packs."""
        results = []
        for slug in PRODUCTS:
            try:
                self.generate_pack(slug)
                results.append(slug)
                time.sleep(2)  # Rate limiting
            except Exception as e:
                print(f"  ❌ Failed to generate {slug}: {e}")
        print(f"\n✅ Generated {len(results)}/{len(PRODUCTS)} packs")
        return results


if __name__ == "__main__":
    import sys
    from dotenv import load_dotenv
    load_dotenv()

    gen = GaokaoMathGenerator()

    if len(sys.argv) > 1:
        slug = sys.argv[1]
        if slug == "all":
            gen.generate_all_packs()
        else:
            gen.generate_pack(slug)
    else:
        gen.generate_all_packs()
