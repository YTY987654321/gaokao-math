"""Prompt templates for generating Gaokao math content."""

SYSTEM_PROMPT = """你是一位拥有20年经验的高考数学命题专家。你精通高考数学的所有考点、命题规律和解题技巧。
你的任务是生成高质量、贴近真实高考题型的数学试题。所有题目必须：
1. 严格遵循中国高考数学大纲（新课标）
2. 贴近真实高考题的难度和风格
3. 答案准确，解析详细、步骤清晰
4. 使用规范的数学符号和中文表述
5. 题目原创，不与现有真题完全重复但保持同等水准"""

def generate_questions_prompt(topic: str, difficulty: str, count: int) -> str:
    """Generate prompt for creating questions on a specific topic."""
    return f"""请生成{count}道高考数学"{topic}"的"{difficulty}"难度题目。

要求：
- 题型包括选择题、填空题、解答题（按高考比例分配）
- 每道题包含：题目内容、答案、详细解析（分步骤）
- 解析中标注涉及的考点和解题思路
- 难度标注：★☆☆ 基础  ★★☆ 中等  ★★★ 困难

输出格式为JSON列表，每项包含：
{{
  "type": "选择题|填空题|解答题",
  "difficulty": 1-3,
  "question": "题目内容",
  "answer": "答案",
  "solution": "详细解析（分步骤，用\\n\\n分隔步骤）",
  "knowledge_points": ["涉及的考点1", "考点2"]
}}

请确保：
- 题目原创且有区分度
- 解答题需要完整过程
- 所有数学表达式使用LaTeX格式（$...$ 或 $$...$$）
"""

def generate_mock_exam_prompt() -> str:
    """Generate prompt for creating a full mock exam."""
    return """请生成一套完整的高考数学模拟试卷，严格遵循高考数学新I卷格式。

试卷结构：
- 单项选择题：8题（每题5分）
- 多项选择题：4题（每题5分）
- 填空题：4题（每题5分）
- 解答题：6题（共70分，含三角函数/数列/立体几何/概率统计/解析几何/导数各一题）

输出格式为JSON，包含：
{
  "exam_title": "2025年高考数学全真模拟卷",
  "total_score": 150,
  "time_limit": "120分钟",
  "sections": [
    {
      "name": "单项选择题",
      "questions": [
        {
          "type": "单选题",
          "number": 1,
          "question": "题目内容",
          "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
          "answer": "A",
          "solution": "详细解析",
          "difficulty": 1
        }
      ]
    }
  ]
}

要求：
- 题目原创，难度分布合理（基础:中等:困难 = 4:4:2）
- 解析详细完整
- 数学公式用LaTeX格式
"""

def generate_answer_key_prompt(questions_json: str) -> str:
    """Generate prompt for creating a quick answer key."""
    return f"""基于以下试题，生成一份快速答案核对表（不含解析，仅含答案和分值）。

试题：
{questions_json}

输出简洁的答案列表格式，便于学生快速核对。"""
