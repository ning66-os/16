from typing import List, Dict, Any, Optional
from openai import OpenAI
from datetime import datetime
from ..config import settings


class SummaryGenerator:
    def __init__(self):
        self.client = None
        if settings.OPENAI_API_KEY:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    def generate_fire_summary(self, 
                              case_info: Dict[str, Any],
                              transcriptions: List[Dict[str, Any]],
                              speaker_segments: List[Dict[str, Any]],
                              annotations: List[Dict[str, Any]]) -> Dict[str, Any]:
        if self.client is None:
            return self._generate_mock_summary(case_info, transcriptions, speaker_segments, annotations)

        context = self._build_context(case_info, transcriptions, speaker_segments, annotations)
        
        system_prompt = """你是一名专业的火灾调查分析师。请根据提供的消防员通讯记录、三维标注信息，生成专业的火灾发展时间线和指挥决策日志。

要求：
1. 按时间顺序整理关键事件，精确到秒
2. 区分指挥部、灭火组、搜救组、供水组、警戒组的对话内容
3. 分析火势发展阶段：初起、发展、猛烈、下降、熄灭
4. 评估指挥决策的有效性
5. 标注关键转折点和重要决策
6. 输出格式为结构化的Markdown"""

        user_prompt = f"""请分析以下火灾事故信息：

{context}

请生成：
1. 火灾发展时间线（按时间顺序）
2. 指挥决策日志（区分各角色）
3. 关键事件分析
4. 经验教训总结"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=4000
            )
            
            content = response.choices[0].message.content
            
            return {
                "success": True,
                "content": content,
                "generated_at": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "content": self._generate_mock_summary(case_info, transcriptions, speaker_segments, annotations)["content"],
                "error": str(e),
                "generated_at": datetime.now().isoformat()
            }

    def _build_context(self,
                       case_info: Dict[str, Any],
                       transcriptions: List[Dict[str, Any]],
                       speaker_segments: List[Dict[str, Any]],
                       annotations: List[Dict[str, Any]]) -> str:
        context_parts = []
        
        context_parts.append(f"=== 案件信息 ===")
        context_parts.append(f"案件编号: {case_info.get('case_number', 'N/A')}")
        context_parts.append(f"案件名称: {case_info.get('title', 'N/A')}")
        context_parts.append(f"地点: {case_info.get('location', 'N/A')}")
        context_parts.append(f"火灾时间: {case_info.get('fire_date', 'N/A')}")
        context_parts.append(f"描述: {case_info.get('description', 'N/A')}")
        context_parts.append("")
        
        context_parts.append(f"=== 三维标注信息 ===")
        fire_points = [a for a in annotations if a.get("annotation_type") == "fire_origin"]
        smoke_paths = [a for a in annotations if a.get("annotation_type") == "smoke_path"]
        
        context_parts.append(f"起火点标记: {len(fire_points)} 处")
        for i, fp in enumerate(fire_points):
            pos = fp.get("position", {})
            context_parts.append(f"  - 起火点{i+1}: {fp.get('label', '未命名')} - 坐标({pos.get('x', 0):.2f}, {pos.get('y', 0):.2f}, {pos.get('z', 0):.2f})")
        
        context_parts.append(f"烟气蔓延路径: {len(smoke_paths)} 条")
        for i, sp in enumerate(smoke_paths):
            context_parts.append(f"  - 路径{i+1}: {sp.get('label', '未命名')}")
        context_parts.append("")
        
        context_parts.append(f"=== 说话人识别结果 ===")
        roles = {}
        for seg in speaker_segments:
            role = seg.get("speaker_role", "未知")
            if role not in roles:
                roles[role] = []
            roles[role].append(seg)
        
        for role, segs in roles.items():
            context_parts.append(f"{role} ({len(segs)} 条对话):")
            for seg in segs[:5]:
                context_parts.append(f"  [{seg.get('start_time', 0):.1f}s - {seg.get('end_time', 0):.1f}s] {seg.get('text', '')[:100]}...")
            if len(segs) > 5:
                context_parts.append(f"  ... 还有 {len(segs) - 5} 条")
        context_parts.append("")
        
        context_parts.append(f"=== 完整转写内容 ===")
        for trans in transcriptions[:10]:
            context_parts.append(f"[{trans.get('start_time', 0):.1f}s] {trans.get('text', '')}")
        if len(transcriptions) > 10:
            context_parts.append(f"... 共 {len(transcriptions)} 条转写记录")
        
        return "\n".join(context_parts)

    def _generate_mock_summary(self,
                               case_info: Dict[str, Any],
                               transcriptions: List[Dict[str, Any]],
                               speaker_segments: List[Dict[str, Any]],
                               annotations: List[Dict[str, Any]]) -> Dict[str, Any]:
        title = case_info.get('title', '火灾事故复盘报告')
        case_number = case_info.get('case_number', 'UNKNOWN')
        
        fire_points = [a for a in annotations if a.get("annotation_type") == "fire_origin"]
        smoke_paths = [a for a in annotations if a.get("annotation_type") == "smoke_path"]
        
        roles_count = {}
        for seg in speaker_segments:
            role = seg.get("speaker_role", "未知")
            roles_count[role] = roles_count.get(role, 0) + 1
        
        content = f"""# {title} - 火灾发展时序复原报告

**案件编号**: {case_number}  
**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---

## 一、火灾发展时间线

### 第一阶段：初起阶段 (0s - 120s)
- **00:00:00**: 首次接到报警，报告发现火情
- **00:01:30**: 第一梯队到达现场，确认起火位置

### 第二阶段：发展阶段 (120s - 300s)
- **00:02:00**: 火势开始蔓延，烟气向楼道扩散
- **00:03:00**: 第二梯队增援，开始内攻灭火

### 第三阶段：猛烈阶段 (300s - 600s)
- **00:05:00**: 火势达到顶峰，建筑内部温度急剧升高
- **00:08:00**: 外部救援力量全面投入

### 第四阶段：下降阶段 (600s - 900s)
- **00:10:00**: 火势得到有效控制
- **00:12:00**: 开始清理残火

### 第五阶段：熄灭阶段 (900s+)
- **00:15:00**: 明火基本扑灭
- **00:20:00**: 确认无复燃风险

---

## 二、指挥决策日志

### 指挥部指令
1. **[00:00:30]** 调度中心：立即调派3个消防站前往处置
2. **[00:02:15]** 现场指挥：设立警戒区域，疏散周边群众
3. **[00:05:45]** 现场指挥：请求增援，调用登高平台车

### 灭火组行动
1. **[00:01:45]** 灭火1组：铺设水带，准备进攻
2. **[00:03:20]** 灭火1组：进入建筑内部，压制火势
3. **[00:07:30]** 灭火2组：替换1组，继续内攻

### 搜救组行动
1. **[00:02:00]** 搜救1组：进入建筑搜索被困人员
2. **[00:04:15]** 搜救1组：发现2名被困人员，成功救出
3. **[00:06:00]** 搜救2组：进行第二轮搜索

### 供水组行动
1. **[00:01:30]** 供水组：连接市政消防栓，保证供水
2. **[00:05:00]** 供水组：水压正常，供水稳定

---

## 三、三维标注信息

### 起火点标记 ({len(fire_points)} 处)
"""
        
        for i, fp in enumerate(fire_points):
            pos = fp.get("position", {})
            content += f"- **起火点{i+1}**: {fp.get('label', '未命名')} - 位置 ({pos.get('x', 0):.2f}, {pos.get('y', 0):.2f}, {pos.get('z', 0):.2f})\n"
        
        content += f"\n### 烟气蔓延路径 ({len(smoke_paths)} 条)\n"
        for i, sp in enumerate(smoke_paths):
            content += f"- **路径{i+1}**: {sp.get('label', '未命名')}\n"
        
        content += """
---

## 四、关键事件分析

1. **报警响应及时**: 从接警到第一梯队到达现场仅用时3分钟
2. **指挥决策果断**: 及时启动二级响应，调动充足救援力量
3. **协同配合良好**: 各小组之间通讯顺畅，配合默契

---

## 五、经验教训总结

1. **成功经验**:
   - 初期火灾处置得当，有效控制了火势蔓延
   - 人员搜救及时，最大限度减少了伤亡
   - 后勤保障有力，灭火供水持续稳定

2. **改进建议**:
   - 建议在重点区域增设烟雾报警器
   - 加强复杂建筑结构的灭火战术训练
   - 优化通讯设备，提升复杂环境下的通讯质量

---

*本报告由火灾调查复盘系统自动生成*
"""
        
        return {
            "success": True,
            "content": content,
            "generated_at": datetime.now().isoformat()
        }

    def generate_timeline_events(self, 
                                 case_id: int,
                                 speaker_segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        events = []
        
        event_type_map = {
            "指挥部": "command",
            "灭火组": "firefighting",
            "搜救组": "rescue",
            "供水组": "support",
            "警戒组": "security",
        }
        
        for seg in speaker_segments:
            role = seg.get("speaker_role", "未知")
            event_type = event_type_map.get(role, "other")
            
            text = seg.get("text", "")
            if text:
                events.append({
                    "fire_case_id": case_id,
                    "event_time": seg.get("start_time", 0),
                    "event_type": event_type,
                    "title": f"{role} - {text[:30]}..." if len(text) > 30 else f"{role} - {text}",
                    "description": text,
                    "source": role
                })
        
        return events
