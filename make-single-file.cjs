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
// 必须用【函数 replacer】！bundle 内含 $& / $` / $' 等会被 String.replace 当成替换模式，
// 若用字符串替换会把替换串里的 $ 序列解释掉，造成内容损坏。
const safeJs = jsCode.replace(/<\/script>/gi, () => "<\\/script>");
const safeCss = cssCode.replace(/<\/style>/gi, () => "<\\/style>");

// ⚠️ 关键修复：内联后的脚本【绝不能】留在 <head>！
// Vite 原始产物是 <script type="module">（浏览器自动 defer，DOM 解析完才执行）；
// 内联后变成普通 <script>，会【立即同步执行】，此时 <div id="root"> 还不存在，
// createRoot(null) 抛 React #299，页面全白。
// 所以：① 从 <head> 摘掉外链 script；② CSS 留在 head；③ bundle 插到 </body> 之前。

let out = html;

// 1) 从 <head> 移除外链 script 标签
out = out.replace(
  /<script[^>]*src=["'][^"']+\.js["'][^>]*>\s*<\/script>/,
  () => ""
);

// 2) 用内联 style 替换外链 css link（CSS 在 head 是正确的）
if (cssRel) {
  out = out.replace(
    /<link[^>]*href=["'][^"']+\.css["'][^>]*>/,
    () => `<style>\n${safeCss}\n</style>`
  );
}

// 3) 把 bundle 注入到 </body> 之前（保证 DOM 就绪后再执行）
if (!/<\/body>/i.test(out)) {
  console.error("未找到 </body>，无法注入脚本");
  process.exit(1);
}
out = out.replace(/<\/body>/i, () => `<script>\n${safeJs}\n</script>\n</body>`);

fs.writeFileSync(outPath, out, "utf-8");

// 校验
const hasExternal = /src=["']\.\/assets|href=["']\.\/assets/.test(out);
const scriptTags = (out.match(/<script/g) || []).length;
const styleTags = (out.match(/<style/g) || []).length;
const closeScript = (out.match(/<\/script>/g) || []).length;
const rootIdx = out.toLowerCase().indexOf('<div id="root"');
const scriptIdx = out.toLowerCase().lastIndexOf("<script>");
const orderOk = rootIdx !== -1 && scriptIdx !== -1 && scriptIdx > rootIdx;
console.log(`✅ 生成 ${outPath}`);
console.log(`   JS: ${jsRel} (${jsCode.length} bytes)`);
console.log(`   CSS: ${cssRel || "(无)"} (${cssCode.length} bytes)`);
console.log(`   script标签: ${scriptTags}, </script>: ${closeScript}, style标签: ${styleTags}`);
console.log(`   仍有外链: ${hasExternal ? "是(异常!)" : "否"}`);
console.log(`   脚本在 root 之后: ${orderOk ? "是 ✅" : "否 ❌(会白屏)"}`);
if (scriptTags !== closeScript) {
  console.log(`   ⚠️ script 开闭标签数量不匹配 (${scriptTags} vs ${closeScript})`);
}
