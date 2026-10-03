// esbuild 用 text loader 把 .md 打包成字符串（见 esbuild.config.mjs）。
declare module "*.md" {
  const text: string;
  export default text;
}
