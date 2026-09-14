# 女主 RPG 素材

使用内置 image_gen，依据用户提供的两张参考图生成。成品为 `airi-rpg-sheet.png`，256 × 128，透明背景，4 列 × 2 行，每格 64 × 64。人物统一高 56 像素、脚底基线 60 像素。

第一行：正面、背面、左侧、右侧待机。第二行：左行走两帧、右行走两帧。生成的左行走姿势重复，第二帧取右行走第二帧镜像。使用 `tools/prepare-airi-sprites.cjs` 去除色键背景、裁切、对齐并以最近邻缩小。

生成提示词：

Use case: stylized-concept. Create a production RPG pixel-art sprite sheet based on these two reference images (character design references). Heroine: dark royal-blue bob hair, blue eyes, light blue short-sleeve calf-length dress with blue shading, pale yellow crossbody bag, blue shoes. Faithfully preserve this design. TRUE transparent background, no white background, no text or grid. Sheet exactly 4 columns by 2 rows of equal square cells, 1024x512 overall. Eight full-body sprites, one centered in each cell, consistent scale, feet on same baseline in every cell, crisp pixel-art, suitable for rendering each cell at 64x64. Row 1: front idle, back idle, left-facing idle, right-facing idle. Row 2: left walk contact pose A, left walk opposite contact pose B, right walk contact pose A, right walk opposite contact pose B. Walking poses alternate legs and arms, body and head maintain identical proportions and location, matching reference 2. Each sprite entirely inside its cell with ample transparent padding, no shadows, no extra figures. Body height 220 pixels in each 256-pixel cell. Use chunky intentional pixel clusters, no smooth painted shading.

最终修订提示词：

Edit this sprite sheet for game integration. Remove ALL gray checkerboard squares and watermark-like lines; replace with a perfectly flat solid pure magenta (#ff00ff) background for chroma-key extraction, no checker pattern. Preserve the 4-column 2-row layout and all characters. Correct bottom row: first TWO sprites must face LEFT, last TWO sprites face RIGHT. Within each pair alternate near leg forward versus near leg back and alternate arm swing for a two-frame walking cycle, ensure clearly different poses. All 8 sprites same height and pixel-art scale, horizontally centered in their equal-sized cells, align soles at identical position relative to cell bottom. Output 1024x512. Blue bob, blue dress, yellow shoulder bag, blue shoes unchanged. No text, no grid, no watermark.
