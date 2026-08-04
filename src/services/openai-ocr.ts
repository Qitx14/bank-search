/** OCR 识别进度 */
export interface OcrProgress {
  current: number;
  total: number;
  status: string;
}

/** 单张图片的识别结果 */
export interface OcrItemResult {
  text: string;              // OCR 原始返回文本
  parsed?: {                 // 解析后的结构化数据
    stem: string;
    options: { label: string; text: string }[];
  };
  error?: string;
}

// 开发环境走 Vite 代理（避免手机端区域限制），生产环境直连
const OPENROUTER_API = import.meta.env.DEV
  ? '/api/openrouter/api/v1/chat/completions'
  : 'https://openrouter.ai/api/v1/chat/completions';

// OpenRouter 上的 GPT-4o 模型（视觉能力更强，OCR 中文更准确）
const MODEL = 'openai/gpt-4o';

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
 * 调用 OpenRouter API（GPT-4o）识别单张图片中的题目 + 选项
 */
async function recognizeImage(
  dataUrl: string,
  apiKey: string,
): Promise<{ text: string; parsed?: OcrItemResult['parsed'] }> {
  // 校验图片数据
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    throw new Error('图片数据格式无效');
  }

  const imageSizeMB = (dataUrl.length * 0.75) / (1024 * 1024);
  console.log(`[OCR] 准备识别图片，大小: ${imageSizeMB.toFixed(1)} MB, 接口: ${OPENROUTER_API}`);

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
                text: '请识别图片中的考试题目。严格返回 JSON 格式（不要 markdown 代码块，不要多余文字）：\n{"stem":"题目题干","options":[{"label":"A","text":"选项A完整文字"},{"label":"B","text":"选项B完整文字"}]}\n只提取题目和选项，忽略解析、答案标记、页码等无关内容。判断题 options 为空数组 []。',
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        max_tokens: 800,
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

  // 尝试解析 JSON
  let parsed: OcrItemResult['parsed'] | undefined;
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.stem === 'string') {
      parsed = {
        stem: obj.stem.trim(),
        options: Array.isArray(obj.options)
          ? obj.options.map((o: any) => ({
              label: String(o.label || '').trim(),
              text: String(o.text || '').trim(),
            }))
          : [],
      };
      console.log(`[OCR] JSON 解析成功: stem="${parsed.stem.slice(0, 60)}", ${parsed.options.length} 个选项`);
    }
  } catch {
    console.warn('[OCR] AI 返回的不是有效 JSON，使用原始文本作为题干');
  }

  return { text, parsed };
}

/**
 * 批量识别图片中的题目文字
 * 逐张串行调用 API
 */
export async function batchRecognize(
  dataUrls: string[],
  apiKey: string,
  onProgress: (p: OcrProgress) => void,
): Promise<OcrItemResult[]> {
  const results: OcrItemResult[] = [];

  for (let i = 0; i < dataUrls.length; i++) {
    onProgress({
      current: i + 1,
      total: dataUrls.length,
      status: `AI 正在识别第 ${i + 1}/${dataUrls.length} 张...`,
    });

    try {
      const result = await recognizeImage(dataUrls[i], apiKey);
      results.push({
        text: result.text,
        parsed: result.parsed,
      });
    } catch (err) {
      results.push({
        text: '',
        error: err instanceof Error ? err.message : '识别失败',
      });
    }
  }

  return results;
}
