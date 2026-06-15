"""Configuration for the Gaokao Math content generation engine."""

import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

# Output directories
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "website", "products", "assets")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Product configuration
PRODUCTS = {
    "trigonometry-basics": {
        "name": "三角函数·基础必刷题",
        "slug": "trigonometry-basics",
        "description": "高考三角函数基础题型全覆盖，含30道经典题+详细解析",
        "topic": "三角函数",
        "difficulty": "基础",
        "question_count": 30,
        "price_cny": 19.9,
        "price_usd": 2.99,
    },
    "derivative-advanced": {
        "name": "导数·压轴题突破",
        "slug": "derivative-advanced",
        "description": "导数压轴题专项训练，含20道真题改编+详细解析",
        "topic": "导数与函数",
        "difficulty": "压轴",
        "question_count": 20,
        "price_cny": 29.9,
        "price_usd": 4.99,
    },
    "mock-exam-1": {
        "name": "高考数学·全真模拟卷（一）",
        "slug": "mock-exam-1",
        "description": "严格按照高考数学新I卷标准命题，含完整解析",
        "topic": "综合模拟",
        "difficulty": "综合",
        "question_count": 22,
        "price_cny": 15.9,
        "price_usd": 2.49,
    },
}

# Gaokao math knowledge points
KNOWLEDGE_POINTS = [
    "集合与常用逻辑用语",
    "复数",
    "平面向量",
    "不等式",
    "函数概念与基本初等函数",
    "导数及其应用",
    "三角函数与解三角形",
    "数列",
    "立体几何",
    "平面解析几何",
    "概率与统计",
    "计数原理",
    "坐标系与参数方程",
]
