# 技术规范

## 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React | 18.x | UI 构建 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 构建 | Vite | 5.x | 开发/打包 |
| 路由 | React Router | 6.x | 页面导航 |
| OCR | Tesseract.js | 5.x | 图片文字识别 |
| 中文语言包 | chi_sim | — | OCR 中文支持 |
| 搜索 | Fuse.js | 7.x | 模糊文本匹配 |
| 数据库 | Dexie.js | 4.x | IndexedDB 封装 |
| 表格解析 | SheetJS (xlsx) | 0.20.x | .xlsx 读取 |
| Word 解析 | mammoth | 1.13.x | .docx 转 HTML（引浏览器包 `mammoth/mammoth.browser.js`，类型声明见 `src/types/mammoth.d.ts`） |
| PWA | vite-plugin-pwa | — | Service Worker 生成 |

## 项目结构

```
src/
├── main.tsx                 # 入口
├── App.tsx                  # 根组件 + 路由
├── index.css                # 全局样式 + CSS 变量
├── pages/
│   ├── SearchPage.tsx       # 搜题主页
│   ├── LibraryPage.tsx      # 题库管理
│   ├── PracticePage.tsx     # 练习（v1.1 新增）
│   └── SettingsPage.tsx     # 设置
├── components/
│   ├── BottomNav.tsx        # 底部导航栏
│   ├── ImagePicker.tsx      # 拍照/选图组件
│   ├── ImagePreview.tsx     # 图片预览网格
│   ├── OcrProgress.tsx      # OCR 进度条
│   ├── AnswerCard.tsx       # 答案卡片
│   ├── ResultList.tsx       # 批量结果列表
│   ├── ImportButton.tsx     # 题库导入按钮
│   └── StatsPanel.tsx       # 题库统计面板
├── services/
│   ├── db.ts                # Dexie 数据库定义与操作
│   ├── ocr.ts               # Tesseract.js OCR 封装
│   ├── search.ts            # Fuse.js 搜索封装
│   ├── xlsx-parser.ts       # SheetJS 题库解析
│   ├── docx-parser.ts       # Word 题库解析（v1.1 新增）
│   └── practice.ts          # 练习：抽题/判题/答案标准化（v1.1 新增）
├── types/
│   └── index.ts             # TypeScript 类型定义
└── assets/
    └── icons/               # PWA 图标
```

## 数据模型

```typescript
// 题目
interface Question {
  id: string;           // UUID
  sheetType: 'single' | 'multiple' | 'judge';  // 题型
  questionNumber: number;   // 题号
  stem: string;             // 题干
  options: string[];        // 选项 ['A. xxx', 'B. xxx', ...]
  answer: string;           // 答案（如 "A" / "AB" / "正确"）
}

// 题库元数据
interface BankMeta {
  id: string;
  fileName: string;         // 导入的文件名
  importedAt: number;       // 导入时间戳
  questionCount: {
    single: number;
    multiple: number;
    judge: number;
  };
}

// 搜索记录
interface SearchRecord {
  id: string;
  imageDataUrls: string[];  // 图片 base64
  results: SearchResult[];
  searchedAt: number;
}

// 搜索结果
interface SearchResult {
  imageIndex: number;       // 对应第几张图片
  extractedText: string;    // OCR 提取的文字
  matches: MatchItem[];     // 匹配结果（按相似度排序）
}

interface MatchItem {
  question: Question;
  score: number;            // 匹配分数 0-1
}
```

## docx 题库格式规范（v1.1）

解析器（`src/services/docx-parser.ts`）面向**段落文本排版**（非表格），已按真实文件《2023反假题库.docx》(1162 题) 验证：

```
1.单选:中国人民银行是中国的中央银行，下列选项不属于央行性质的是()
A. 发行的银行
B. 政府的银行
C. 银行的银行
D. 公众的银行
正确答案: D
```

解析规则：

| 行模式 | 正则要点 | 处理 |
|--------|---------|------|
| 题头 `1,121.案例分析:题干` | `^(\d[\d,]*)\s*[.、．]?\s*(单选\|多选\|判断\|案例分析)\s*[:：]\s*(.*)` | 开新题；题号去掉千分位逗号 |
| 选项 `A. xxx` | `^([A-Ha-h])\s*[.、．:：)）]\s*(.*)` | 去掉前缀，只存内容（与 xlsx 解析一致） |
| 答案 `正确答案: D` | `^(正确答案\|参考答案\|标准答案\|答案)\s*[:：]\s*(.*)` | 存入原始答案 |
| 其他非空行 | — | 拼接到题干（未出现选项前）或末选项（已出现选项后） |

归一化规则：

- **判断**：`A/正确/√/对/T` → `正确`；`B/错误/×/错/F` → `错误`
- **选择题（单选/多选/案例分析）**：提取 A-H 字母并排序，兼容 `ABC` / `B,D` / `B、D` 等写法
- **案例分析**：独立题型 `case`（2026-11-13 用户确认，不合并到单选/多选）
- 正文中混入的 XML 源码垃圾段落（`<` 开头或含 `w:rPr`）跳过
- 表格内容整块忽略（本题库为段落排版，表格多为文本框等排版附件，实测《2023反假题库》含一个文本框表格）
- 题干或答案缺失的题：记录错误并跳过（错误信息返回给 UI 提示）

## 练习功能设计（v1.1）

- **数据**：复用现有 `Question` / `questions` 表，不新增数据库表；练习会话（10 题 + 答题记录）只存页面内存 state，退出即丢弃
- **抽题**：`getAllQuestions()` → 题型过滤 → Fisher-Yates 洗牌 → 取前 10；不足 10 题全部练习
- **判题**（`src/services/practice.ts`）：
  - 单选：所选字母 === 答案字母
  - 多选/案例分析：字母集合相等（顺序无关）
  - 判断：标准化后比较
- **UI**：`PracticePage` 四个状态（无题库引导 / 开始页 / 答题中 / 成绩页），用组件 state 切换，不加子路由；题型过滤为四个开关（单选/多选/判断/案例分析，默认全开）
- **共用常量**：题型文案/配色/多选题型判断在 `src/utils/question-types.ts`（AnswerCard 与练习页共用）

## 关键约束
- 题库支持最大 10,000 题
- OCR 单张图片处理时间 < 30 秒
- 一次批量最多 9 张图片
- 图片存储在 IndexedDB（转为 base64）
- 所有处理在浏览器主线程外（Web Worker / Tesseract 自带 Worker）

---

> 版本：v1.1 | 日期：2026-11-13 | 变更：docx 导入 + 练习功能
