// 将 vite 构建产物（dist-web）打包为单个 HTML 文件（无需服务器、可直接双击/手机浏览器打开）
// 用法：node make-single-file.cjs
const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "dist-web");
const htmlPath = path.join(distDir, "index.html");
const outPath = path.join(__dirname, "StickyNotes.html");

const html = fs.readFileSync(htmlPath, "utf-8");

// 提取 JS 与 CSS 文件名（来自 index.html 中的引用）
const jsMatch = html.match(/<script[^>]*src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/);
const cssMatch = html.match(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/);

if (!jsMatch) {
  console.error("未找到 JS 引用");
  process.exit(1);
}
const jsRel = jsMatch[1].replace(/^\.\//, "");
const cssRel = cssMatch ? cssMatch[1].replace(/^\.\//, "") : null;

const jsCode = fs.readFileSync(path.join(distDir, jsRel), "utf-8");
const cssCode = cssRel ? fs.readFileSync(path.join(distDir, cssRel), "utf-8") : "";

// 转义：避免内容中的 </script> 或 </style> 提前闭合标签
const safeJs = jsCode.replace(/<\/script>/gi, "<\\/script>");
const safeCss = cssCode.replace(/<\/style>/gi, "<\\/style>");

// 用内联脚本替换外链 script 标签（iife 产物，作为普通 script 即可，避免 module 的 file:// CORS 限制）
// 必须用【函数 replacer】！bundle 内含 $& / $\` / $' 等会被 String.replace 当成替换模式，
// 若用字符串替换会把原 <script src> 标签（含 </script>）又注入回内联脚本，导致脚本提前闭合白屏。
let out = html.replace(
  /<script[^>]*src=["'][^"']+\.js["'][^>]*>\s*<\/script>/,
  () => `<script>\n${safeJs}\n</script>`
);

// 用内联 style 替换外链 css link（同样用函数 replacer，避免 $ 被解释）
if (cssRel) {
  out = out.replace(
    /<link[^>]*href=["'][^"']+\.css["'][^>]*>/,
    () => `<style>\n${safeCss}\n</style>`
  );
}

fs.writeFileSync(outPath, out, "utf-8");

// 校验：不应再有外链资源
const hasExternal = /src=["']\.\/assets|href=["']\.\/assets/.test(out);
const scriptTags = (out.match(/<script/g) || []).length;
const styleTags = (out.match(/<style/g) || []).length;
console.log(`✅ 生成 ${outPath}`);
console.log(`   JS: ${jsRel} (${jsCode.length} bytes)`);
console.log(`   CSS: ${cssRel || "(无)"} (${cssCode.length} bytes)`);
console.log(`   script标签: ${scriptTags}, style标签: ${styleTags}, 仍有外链: ${hasExternal ? "是(异常!)" : "否"}`);
