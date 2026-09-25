/*
 * 回忆画廊的「额外」插图清单（可选，可留空）。
 *
 * 画廊现在会自动收录：
 *   1) 剧本里所有“特殊 CG / overlay / gallery”（节点字段）—— 无需在此登记；
 *   2) 手机相册照片（data/story/phone.js 的 photos）。
 * 本文件只用于登记上面两类之外的“自定义插图”（例如尚未接入剧情的 CG 原画）。
 *
 * 登记格式（图片路径相对 sign&log/；也可只填 unlock，src 缺省时按资源 id 反查）：
 *   { src: 'photo&video/example.webp', unlock: 'ch1-cg-blue', title: '标题', note: '说明' }
 * unlock 填对应剧情节点实际展示的 cg / overlay / gallery 资源 ID；玩家触发该图片后才会在画廊出现。
 */
window.ILY_GALLERY = window.ILY_GALLERY || [];
