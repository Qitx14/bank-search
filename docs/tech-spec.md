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
│   ├── HistoryPage.tsx      # 搜索历史
│   └── ResultPage.tsx       # 搜索结果详情
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
│   └── xlsx-parser.ts       # SheetJS 题库解析
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

## 关键约束
- 题库支持最大 10,000 题
- OCR 单张图片处理时间 < 30 秒
- 一次批量最多 9 张图片
- 图片存储在 IndexedDB（转为 base64）
- 所有处理在浏览器主线程外（Web Worker / Tesseract 自带 Worker）

---

> 版本：v1.0 | 日期：2026-08-03
