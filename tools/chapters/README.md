# 后续章节公共生成器

本目录只保存第二章、第三章和最终章共用的解析、演出、地图与资源生成规则，不再保存章节正文。

正文与单章生成入口分别位于：

- `tools/chapter2/source.txt` 与 `tools/chapter2/build.py`
- `tools/chapter3/source.txt` 与 `tools/chapter3/build.py`
- `tools/final/source.txt` 与 `tools/final/build.py`

日常修改文案时运行对应的 `npm run build:chapter2`、`npm run build:chapter3` 或 `npm run build:final`。只有需要同时重建全部故事和各章节素材清单时，才运行 `npm run build:story`。
