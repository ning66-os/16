# 火灾调查复盘时序复原系统

面向火灾调查复盘会议的全栈应用，支持三维建筑模型标注、音频处理和智能报告生成。

## 功能特性

### 前端
- 三维建筑模型可视化（Three.js）
- 起火点标记与烟气蔓延路径绘制
- 时序事件展示与交互
- 标注链接生成与分享

### 后端
- 消防员通讯录音降噪（librosa）
- 语音转写（Whisper）
- 说话人识别（pyannote）- 区分指挥部与各小组
- 智能摘要生成（OpenAI）
- 火灾发展时间线与指挥决策日志
- Markdown格式邮件发送

## 技术栈

- **前端**: React 18 + TypeScript + Three.js + Tailwind CSS
- **后端**: FastAPI + Python 3.11
- **音频处理**: librosa, Whisper, pyannote.audio
- **AI**: OpenAI GPT-4
- **数据库**: SQLite + SQLAlchemy

## 快速开始

### 后端
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 前端
```bash
cd frontend
npm install
npm run dev
```

## API 文档

启动后端后访问: http://localhost:8000/docs
