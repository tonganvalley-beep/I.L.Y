# ILY / 爱理 配音制作记录

日期：2026-09-20

## 本次制作

- 使用 VOICEVOX Engine 0.25.2，对已校对日语稿合成 ILY 200 条、爱理 234 条，共 434 条。
- 主声线为四国めたん「甜美」（style 0）与「性感」（style 4）；移除低语后本批次 392/434（90.3%）使用两种主声线。
- 依据语境辅以「普通」（2）和「ツンツン」（6）；完全不使用低语音色，轻声场景改用速度、抑扬和停顿参数表现。
- 基于语境调整语速、音高、抑扬、元音/停顿长度；对「爱理」「基生」「大好き」「ねえ」等命中字符执行 bounded mora 微调，并将命中记录写入 `line.tuning.pronunciation`。
- 生成并发布 434 个 WAV，稳定 ID 清单写入 `game/data/voice/voice-manifest.js`；旧的其它已发布条目按稳定 ID 保留。

## 验证

- `node --test tests/voicevox-production-policy.test.mjs tests/voicevox-tuning.test.mjs`：5/5 通过。
- `npm test`：150/150 通过。
- 工程中 434 条目标均有 AudioQuery、`proofread` 状态和已记录的生成音频；其中 143 条包含字符级发音微调记录。

## 可追溯性

实现策略位于 `tools/voicevox/production-voice-policy.mjs`，批处理入口为 `tools/voicevox/finish-ily-airi.mjs`。每条台词保留文本、风格和基础调音快照；完整旧 AudioQuery 由工程 `.bak` 备份保留。
