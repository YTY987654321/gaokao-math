# 📐 高考数学刷题宝典 - 自动赚钱系统

一个全自动的高考数学备考资料生成 + 销售系统。由 AI 自动生成原创试题，自动打包为 PDF，自动上线销售。

## 系统架构

```
┌─────────────────────────────────────┐
│ content-engine/   (Python)          │
│  ├── generator.py    → LLM生成试题   │
│  ├── pdf_renderer.py → 转为专业PDF   │
│  └── pack_builder.py → 完整打包流程  │
├─────────────────────────────────────┤
│ website/          (静态前端)         │
│  ├── index.html      → 产品展示页    │
│  ├── checkout.html   → 结算页面      │
│  ├── success.html    → 支付成功页    │
│  └── js/shop.js      → 前端逻辑     │
├─────────────────────────────────────┤
│ server/           (Node.js)         │
│  ├── index.js        → Express服务   │
│  ├── 静态文件托管    → 网站前端       │
│  ├── API接口         → 产品+支付API   │
│  └── Stripe支付      → 信用卡+支付宝 │
└─────────────────────────────────────┘
```

## 快速启动

### 1. 配置环境

```bash
cp .env.example .env
# 编辑 .env，填入你的 OPENAI_API_KEY
```

### 2. 一键部署

```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. 手动分步执行

```bash
# 安装依赖
pip install -r content-engine/requirements.txt
cd server && npm install && cd ..

# 生成内容（需要 OPENAI_API_KEY）
cd content-engine && python pack_builder.py && cd ..

# 启动服务
cd server && node index.js
```

访问 http://localhost:3000 即可看到商店。

## 你的日常工作（每天4小时）

| 任务 | 时间 | 说明 |
|------|------|------|
| **定方向** | 30min | 决定下一个要生成的资料主题（如：数列专项、立体几何） |
| **启动生成** | 5min | 修改 config.py 添加新产品后，运行 `python pack_builder.py` |
| **审核内容** | 1h | 检查生成的试题质量，调整 prompt 提升质量 |
| **推广引流** | 2.5h | 小红书/知乎/B站发帖 → SEO内容 → 社群运营 |

## 盈利模式

- **国际用户**：Stripe 收款，支持信用卡 + 支付宝
- **国内用户**：Stripe 支付宝渠道（需企业资质）或接入爱发电/面包多
- **每份资料**：定价 ¥15-30，边际成本为零
- **目标**：每天 5-10 单，日收入 ¥100-300，月入 ¥3000-9000

## 扩展方向

- 更多学科：高考英语、语文、物理
- 会员订阅制：月付 ¥49 解锁全部资料
- 个性化定制：AI 根据学生薄弱点生成专属练习卷
- 自媒体矩阵：自动生成小红书/知乎内容发布

## 技术栈

- **内容生成**: Python + OpenAI API
- **PDF渲染**: ReportLab
- **前端**: 原生 HTML/CSS/JS (无框架，轻量快速)
- **后端**: Node.js + Express
- **支付**: Stripe (信用卡 + Alipay)
- **部署**: 支持 Vercel / Railway / 阿里云 / 腾讯云

## 文件结构

```
gaokao-math/
├── .env.example          # 环境变量模板
├── deploy.sh             # 一键部署脚本
├── README.md
├── content-engine/       # AI内容生成引擎
│   ├── config.py         # 产品配置 & 知识点定义
│   ├── generator.py      # LLM调用 - 生成试题
│   ├── pdf_renderer.py   # PDF渲染 - 专业排版
│   ├── pack_builder.py   # 完整打包流程
│   ├── prompt_templates.py  # 提示词模板
│   └── requirements.txt
├── website/              # 销售网站
│   ├── index.html        # 主页
│   ├── checkout.html     # 结算页
│   ├── success.html      # 成功页
│   ├── css/style.css
│   ├── js/shop.js
│   └── products/         # 产品数据 & 生成的文件
└── server/               # 后端服务
    ├── package.json
    └── index.js          # Express服务器
```
