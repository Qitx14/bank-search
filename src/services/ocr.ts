import { createWorker, type Worker } from 'tesseract.js';

/** OCR 识别进度 */
export interface OcrProgress {
  current: number;    // 正在识别第几张（从 1 开始）
  total: number;      // 总共多少张
  status: string;     // 当前状态描述
}

/** 单张图片的识别结果 */
export interface OcrItemResult {
  text: string;
  error?: string;
}

/**
 * 批量 OCR 识别图片
 * 逐张串行处理，避免内存溢出
 * @param dataUrls 图片 base64 Data URL 数组
 * @param onProgress 进度回调
 * @returns 每张图片的识别结果
 */
export async function batchRecognize(
  dataUrls: string[],
  onProgress: (p: OcrProgress) => void,
): Promise<OcrItemResult[]> {
  const results: OcrItemResult[] = [];
  let worker: Worker | null = null;

  try {
    onProgress({ current: 0, total: dataUrls.length, status: '正在加载中文识别引擎...' });

    // 创建一个 Worker，加载简体中文语言包
    worker = await createWorker('chi_sim');

    // 逐张识别
    for (let i = 0; i < dataUrls.length; i++) {
      onProgress({
        current: i + 1,
        total: dataUrls.length,
        status: `正在识别第 ${i + 1}/${dataUrls.length} 张...`,
      });

      try {
        const { data } = await worker.recognize(dataUrls[i]);
        results.push({
          text: (data.text || '').trim(),
        });
      } catch (err) {
        // 单张失败不影响后续
        results.push({
          text: '',
          error: `第 ${i + 1} 张识别失败：${err instanceof Error ? err.message : '未知错误'}`,
        });
      }
    }
  } catch (err) {
    // Worker 初始化失败，所有图片都标记为错误
    const initError = `OCR 引擎启动失败：${err instanceof Error ? err.message : '未知错误'}`;
    for (let i = results.length; i < dataUrls.length; i++) {
      results.push({ text: '', error: initError });
    }
  } finally {
    // 确保释放 Worker
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }

  return results;
}
