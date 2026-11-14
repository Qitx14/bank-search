import type { OcrParseResult } from '../types';

/** OCR 识别进度 */
export interface OcrProgress {
  current: number;
  total: number;
  status: string;
}

/** 单张图片的识别结果 */
export interface OcrItemResult {
  text: string;              // OCR 原始返回文本
  parsed?: OcrParseResult;   // 解析后的结构化数据（一张图拆出的多道题）
  error?: string;
}

/** 一张图片最多识别的题目数（限制 token 消耗与识别质量） */
export const MAX_QUESTIONS_PER_IMAGE = 5;

// 开发环境走 Vite 代理（避免手机端区域限制），生产环境直连
const OPENROUTER_API = import.meta.env.DEV
  ? '/api/openrouter/api/v1/chat/completions'
  : 'https://openrouter.ai/api/v1/chat/completions';

// Gemini 2.5 Flash：速度快、免费额度、中文 OCR 能力强
const MODEL = 'google/gemini-2.5-flash';

// 并行处理并发数
const CONCURRENCY = 3;

/** API Key 存储 key */
export const API_KEY_STORAGE = 'openrouter-api-key';

/** 获取已保存的 API Key */
export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}

/** 保存 API Key */
export function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
}

/** 清除 API Key */
export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

/**
 * 压缩图片：缩放 + JPEG 压缩，将 iPhone 照片从 3-5MB 降到 ~150KB
 * @param dataUrl 原始图片 base64
 * @returns 压缩后的 base64
 */
function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      let { width, height } = img;

      // 等比缩放
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // 绘制到 canvas（缩放）
      ctx.drawImage(img, 0, 0, width, height);

      // JPEG 质量 0.7，平衡清晰度和文件大小
      const compressed = canvas.toDataURL('image/jpeg', 0.7);

      const originalKB = (dataUrl.length * 0.75 / 1024).toFixed(0);
      const compressedKB = (compressed.length * 0.75 / 1024).toFixed(0);
      console.log(`[OCR] 图片压缩: ${originalKB}KB → ${compressedKB}KB (${width}x${height})`);

      resolve(compressed);
    };
    img.onerror = () => {
      console.warn('[OCR] 图片加载失败，使用原图');
      resolve(dataUrl); // 回退：用原图
    };
    img.src = dataUrl;
  });
}

/**
 * 调用 OpenRouter API（Gemini Flash）识别单张图片中的题目 + 选项
 */
async function recognizeImage(
  dataUrl: string,
  apiKey: string,
): Promise<{ text: string; parsed?: OcrItemResult['parsed'] }> {
  // 校验图片数据
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    throw new Error('图片数据格式无效');
  }

  // 压缩图片
  const compressed = await compressImage(dataUrl);

  let response: Response;
  try {
    response = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'BankSearch',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `请识别图片中的全部考试题目（最多 ${MAX_QUESTIONS_PER_IMAGE} 道）。严格返回 JSON 格式（不要 markdown 代码块，不要多余文字）：
{"questions":[{"stem":"第1题题干","options":[{"label":"A","text":"选项A完整文字"},{"label":"B","text":"选项B完整文字"}]},{"stem":"第2题题干","options":[]}]}
规则：
1. 按题目在图片中从上到下的顺序排列，每道题一个对象
2. 每题包含完整题干和全部选项；判断题 options 为空数组 []
3. 只提取题目和选项，忽略解析、答案标记、页码、水印等无关内容
4. 若图片中题目超过 ${MAX_QUESTIONS_PER_IMAGE} 道，只返回前 ${MAX_QUESTIONS_PER_IMAGE} 道；若只有 1 道题，数组只有 1 个元素`,
              },
              {
                type: 'image_url',
                image_url: { url: compressed },
              },
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0,
      }),
    });
  } catch (fetchErr) {
    console.error('[OCR] fetch 失败:', fetchErr);
    const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    throw new Error(`网络请求失败: ${errMsg}`);
  }

  if (!response.ok) {
    let errBody: any = {};
    try {
      errBody = await response.json();
    } catch {
      // 无法解析错误响应体
    }
    console.error(`[OCR] API 返回错误 ${response.status}:`, errBody);
    if (response.status === 401) {
      throw new Error('API Key 无效，请检查设置');
    }
    if (response.status === 402) {
      throw new Error('账户余额不足，请在 OpenRouter 充值');
    }
    if (response.status === 429) {
      throw new Error('请求过于频繁，请稍后重试');
    }
    throw new Error(errBody.error?.message || `请求失败 (${response.status})`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch (jsonErr) {
    console.error('[OCR] 响应 JSON 解析失败:', jsonErr);
    throw new Error('AI 返回数据解析失败');
  }

  const rawText: string = data.choices?.[0]?.message?.content || '';
  console.log(`[OCR] 识别成功，文字长度: ${rawText.length}`);

  // 清理并尝试解析 JSON
  let text = rawText.trim();
  // 去除可能的 markdown 代码块包裹
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  // 去除首尾引号
  text = text.replace(/^["']|["']$/g, '').trim();

  console.log(`[OCR] 清理后文字: "${text.slice(0, 200)}..."`);

  // 尝试解析 JSON（新格式：questions 数组；兼容旧格式：单题对象 / 裸数组）
  let parsed: OcrItemResult['parsed'] | undefined;
  try {
    const obj = JSON.parse(text);

    let rawQuestions: any[] = [];
    if (Array.isArray(obj?.questions)) {
      rawQuestions = obj.questions;              // 新格式 { questions: [...] }
    } else if (Array.isArray(obj)) {
      rawQuestions = obj;                        // 兜底：裸数组
    } else if (obj && typeof obj.stem === 'string') {
      rawQuestions = [obj];                      // 旧格式：单题对象
    }

    const questions: OcrParseResult['questions'] = [];
    for (const q of rawQuestions) {
      if (!q || typeof q.stem !== 'string' || !q.stem.trim()) continue; // 跳过空题
      questions.push({
        stem: q.stem.trim(),
        options: Array.isArray(q.options)
          ? q.options.map((o: any) => ({
              label: String(o.label || '').trim(),
              text: String(o.text || '').trim(),
            }))
          : [],
      });
      if (questions.length >= MAX_QUESTIONS_PER_IMAGE) break;
    }

    if (questions.length > 0) {
      parsed = { questions };
      console.log(`[OCR] JSON 解析成功: 拆出 ${questions.length} 道题`);
      questions.forEach((q, i) => {
        console.log(`[OCR]   第${i + 1}题 stem="${q.stem.slice(0, 50)}", ${q.options.length} 个选项`);
      });
    }
  } catch {
    console.warn('[OCR] AI 返回的不是有效 JSON，使用原始文本作为题干');
  }

  return { text, parsed };
}

/**
 * 批量识别图片中的题目文字
 * 并发处理（3 张同时进行），大幅提升速度
 */
export async function batchRecognize(
  dataUrls: string[],
  apiKey: string,
  onProgress: (p: OcrProgress) => void,
): Promise<OcrItemResult[]> {
  const results: OcrItemResult[] = new Array(dataUrls.length);
  let completed = 0;

  // 将图片分组，每组 CONCURRENCY 张并行处理
  for (let chunkStart = 0; chunkStart < dataUrls.length; chunkStart += CONCURRENCY) {
    const chunk = dataUrls.slice(chunkStart, chunkStart + CONCURRENCY);
    const chunkIndices = chunk.map((_, j) => chunkStart + j);

    const chunkPromises = chunk.map((dataUrl, j) => {
      const index = chunkIndices[j];
      return recognizeImage(dataUrl, apiKey)
        .then(result => {
          results[index] = { text: result.text, parsed: result.parsed };
        })
        .catch(err => {
          results[index] = {
            text: '',
            error: err instanceof Error ? err.message : '识别失败',
          };
        })
        .finally(() => {
          completed++;
          onProgress({
            current: completed,
            total: dataUrls.length,
            status: `AI 正在识别第 ${completed}/${dataUrls.length} 张...`,
          });
        });
    });

    // 等待当前批次全部完成，再发下一批
    await Promise.all(chunkPromises);
  }

  return results;
}
