/**
 * mammoth 浏览器包的本地类型声明
 * mammoth 自带 lib/index.d.ts 但 package.json 未声明 types 字段，
 * 且其类型面向 Node（含 Buffer），这里只为浏览器入口声明本项目用到的 API。
 */
declare module 'mammoth/mammoth.browser.js' {
  interface MammothResult {
    value: string;
    messages: { type: string; message: string }[];
  }

  function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: { styleMap?: string | string[] },
  ): Promise<MammothResult>;

  export { convertToHtml };
}
