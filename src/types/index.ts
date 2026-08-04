/** 题型枚举 */
export type SheetType = 'single' | 'multiple' | 'judge';

/** 题库中的一道题 */
export interface Question {
  id: string;                // 自动生成 UUID
  sheetType: SheetType;      // 来自哪个 Sheet
  questionNumber: number;    // 题号
  stem: string;              // 题干文本
  options: string[];         // 选项 ['A. xxx', 'B. xxx', ...]，判断题为空数组
  answer: string;            // 答案：单选"A"、多选"AB"、判断"正确"/"错误"
}

/** OCR 从图片中提取的单个选项 */
export interface OcrOption {
  label: string;   // A, B, C, D（图片中显示的标签）
  text: string;    // 选项文字内容
}

/** OCR 返回的结构化识别结果 */
export interface OcrParsedResult {
  stem: string;
  options: OcrOption[];
}

/** 题库元数据 */
export interface BankMeta {
  id: string;                // 固定为 'current'
  fileName: string;          // 导入的文件名
  importedAt: number;        // 导入时间戳 (Date.now())
  questionCount: {
    single: number;
    multiple: number;
    judge: number;
  };
}

/** 单张图片的匹配结果 */
export interface MatchItem {
  question: Question;
  score: number;             // 匹配分数 0~1，越高越相似
}

/** 单张图片的识别与搜索结果 */
export interface SearchResult {
  imageIndex: number;        // 对应第几张图片（从 0 开始）
  imageDataUrl: string;      // 图片 base64
  extractedText: string;     // OCR 提取的文字
  matches: MatchItem[];      // 匹配候选（按相似度降序）
  error?: string;            // 识别失败时的错误信息
  examAnswer?: string;       // 考试时应选的选项字母（如 "A"）
  examAnswerContent?: string; // 正确选项的文字内容
}

/** 一次搜索的完整记录 */
export interface SearchRecord {
  id: string;                // 自动生成
  imageDataUrls: string[];   // 所有图片 base64
  results: SearchResult[];   // 每张图片的搜索结果
  searchedAt: number;        // 搜索时间戳
}

/** 题库统计信息（用于 UI 展示） */
export interface BankStats {
  hasBank: boolean;
  fileName: string;
  importedAt: number;
  questionCount: {
    single: number;
    multiple: number;
    judge: number;
  };
  total: number;
}
