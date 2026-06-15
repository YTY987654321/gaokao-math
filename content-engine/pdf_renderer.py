"""Render generated content to professional PDF format."""

import json
import os
import re
from typing import Dict, List, Any
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, ListFlowable, ListItem,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from config import OUTPUT_DIR, PRODUCTS


# Try to register Chinese fonts, fall back to built-in
CHINESE_FONT = "Helvetica"
try:
    font_paths = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            pdfmetrics.registerFont(TTFont("ChineseFont", fp))
            CHINESE_FONT = "ChineseFont"
            break
except Exception:
    pass


class PDFRenderer:
    """Render Gaokao math content to beautiful PDFs."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_styles()

    def _setup_styles(self):
        """Set up custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            "Title_CN",
            fontName=CHINESE_FONT,
            fontSize=22,
            alignment=TA_CENTER,
            spaceAfter=12,
            textColor=HexColor("#1a1a2e"),
        ))
        self.styles.add(ParagraphStyle(
            "Subtitle_CN",
            fontName=CHINESE_FONT,
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=20,
            textColor=HexColor("#666666"),
        ))
        self.styles.add(ParagraphStyle(
            "Section_CN",
            fontName=CHINESE_FONT,
            fontSize=16,
            spaceBefore=16,
            spaceAfter=10,
            textColor=HexColor("#1a1a2e"),
            borderWidth=0,
            borderPadding=0,
        ))
        self.styles.add(ParagraphStyle(
            "Question_CN",
            fontName=CHINESE_FONT,
            fontSize=11,
            leading=18,
            spaceBefore=12,
            spaceAfter=6,
            alignment=TA_LEFT,
        ))
        self.styles.add(ParagraphStyle(
            "Solution_CN",
            fontName=CHINESE_FONT,
            fontSize=10,
            leading=16,
            spaceBefore=4,
            spaceAfter=4,
            textColor=HexColor("#2d3436"),
            leftIndent=12,
        ))
        self.styles.add(ParagraphStyle(
            "Answer_CN",
            fontName=CHINESE_FONT,
            fontSize=11,
            leading=16,
            spaceBefore=2,
            spaceAfter=2,
            textColor=HexColor("#0984e3"),
        ))
        self.styles.add(ParagraphStyle(
            "Info_CN",
            fontName=CHINESE_FONT,
            fontSize=10,
            alignment=TA_CENTER,
            textColor=HexColor("#888888"),
        ))

    def _escape_latex(self, text: str) -> str:
        """Convert LaTeX math to something renderable."""
        # Keep basic formatting, replace math delimiters with styled markers
        text = text.replace("$$", "<br/>")
        text = text.replace("$", "<i>")
        text = re.sub(r'\\frac\{(.*?)\}\{(.*?)\}', r'\1/\2', text)
        text = text.replace("\\sqrt", "sqrt")
        text = text.replace("\\cdot", "·")
        text = text.replace("\\times", "×")
        text = text.replace("\\rightarrow", "→")
        text = text.replace("\\Rightarrow", "⇒")
        text = text.replace("\\geq", "≥")
        text = text.replace("\\leq", "≤")
        text = text.replace("\\ne", "≠")
        text = text.replace("\\pi", "π")
        text = text.replace("\\alpha", "α")
        text = text.replace("\\beta", "β")
        text = text.replace("\\theta", "θ")
        text = text.replace("\\sin", "sin")
        text = text.replace("\\cos", "cos")
        text = text.replace("\\tan", "tan")
        text = text.replace("\\log", "log")
        text = text.replace("\\ln", "ln")
        text = text.replace("\\infty", "∞")
        # Remove remaining LaTeX commands
        text = re.sub(r'\\[a-zA-Z]+\b', '', text)
        # Clean up braces
        text = text.replace("{", "").replace("}", "")
        return text

    def _format_text(self, text: str) -> str:
        """Format text with basic HTML for ReportLab."""
        text = self._escape_latex(text)
        text = text.replace("\n", "<br/>")
        return text

    def render_question_pack(self, slug: str) -> str:
        """Render a question pack to PDF."""
        product = PRODUCTS[slug]
        json_path = f"{OUTPUT_DIR}/{slug}.json"
        if not os.path.exists(json_path):
            raise FileNotFoundError(f"Content file not found: {json_path}")

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        pdf_path = f"{OUTPUT_DIR}/{slug}.pdf"
        doc = SimpleDocTemplate(
            pdf_path, pagesize=A4,
            topMargin=25*mm, bottomMargin=25*mm,
            leftMargin=25*mm, rightMargin=25*mm,
        )

        story = []

        # Title page
        story.append(Spacer(1, 40*mm))
        story.append(Paragraph(product["name"], self.styles["Title_CN"]))
        story.append(Paragraph(
            f"专题：{product['topic']}  |  难度：{product['difficulty']}",
            self.styles["Subtitle_CN"]
        ))
        story.append(Spacer(1, 10*mm))
        story.append(Paragraph(
            "📋 使用说明：每题后附有详细解析，建议先独立完成再对照答案。",
            self.styles["Info_CN"]
        ))
        story.append(PageBreak())

        # Questions
        questions = data.get("questions", [])
        q_num = 0
        for q in questions:
            q_num += 1
            q_type = q.get("type", "题")
            difficulty_stars = "★" * q.get("difficulty", 1) + "☆" * (3 - q.get("difficulty", 1))

            header = f'<b>第{q_num}题</b>  [{q_type}]  {difficulty_stars}'
            story.append(Paragraph(header, self.styles["Section_CN"]))
            story.append(Paragraph(
                self._format_text(q.get("question", "")),
                self.styles["Question_CN"]
            ))

            # Multiple choice options
            if "options" in q:
                for key, val in q["options"].items():
                    story.append(Paragraph(
                        f'&nbsp;&nbsp;&nbsp;&nbsp;{key}. {self._format_text(val)}',
                        self.styles["Question_CN"]
                    ))

            story.append(Spacer(1, 2*mm))

            # Answer
            story.append(Paragraph(
                f'<b>答案：</b>{self._format_text(q.get("answer", ""))}',
                self.styles["Answer_CN"]
            ))

            # Solution
            solution = q.get("solution", "")
            if solution:
                story.append(Paragraph(
                    f'<b>解析：</b>',
                    self.styles["Solution_CN"]
                ))
                # Split solution into steps
                steps = solution.replace("\\n\\n", "\n\n").split("\n\n")
                for step in steps:
                    if step.strip():
                        story.append(Paragraph(
                            self._format_text(step.strip()),
                            self.styles["Solution_CN"]
                        ))

            story.append(Spacer(1, 3*mm))

            # Divider
            story.append(Paragraph(
                '<hr width="100%" size="1" noshade color="#dddddd"/>',
                self.styles["Info_CN"]
            ))

        doc.build(story)
        print(f"  📄 PDF generated: {pdf_path}")
        return pdf_path

    def render_all_packs(self):
        """Render all generated content to PDF."""
        for slug in PRODUCTS:
            try:
                self.render_question_pack(slug)
            except Exception as e:
                print(f"  ⚠️ Failed to render {slug}: {e}")


if __name__ == "__main__":
    import sys
    renderer = PDFRenderer()
    if len(sys.argv) > 1:
        slug = sys.argv[1]
        if slug == "all":
            renderer.render_all_packs()
        else:
            renderer.render_question_pack(slug)
    else:
        renderer.render_all_packs()
