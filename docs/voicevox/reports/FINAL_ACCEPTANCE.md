# VOICEVOX 全项目最终验收

日期：2026-09-17。执行：当前 Codex 会话。

## 结论

T1、P1-P6 软件工作包技术验收通过，可以进入日语翻译、选声、人工调音和配音制作。此结论针对当前工作区实现，不等于全篇日语翻译、音频生产、人工听审或许可核对完成。正式 `voice-manifest.js` 当前仍为空。

## 覆盖与证据

| 范围 | 本次验收结果 |
| --- | --- |
| T1 有效剧本及翻译稿 | 回归覆盖已发布增删改、插入顺序、稳定 ID、角色稿、事务回导、源文漂移和已校对导出 |
| P1/P2 导入与批量制作 | 回归覆盖 CSV 多行字段、重复与错误输入、工程保存重开及备份、串行队列、WAV 导出 |
| P3 精细调音 | 回归覆盖查询编辑、撤销恢复、无声 mora、可选辅音、停顿及数值边界 |
| P4 游戏关联与发布 | 回归覆盖增量同步、人工成果保留、源指纹、稳定音频文件名；补齐校对状态撤销后的发布拒绝 |
| P5 加固 | 5,000 条工程往返、工作表筛选分页和队列持久化；无效 WAV、失败重试、重启恢复、取消迟到结果、跨站请求和离线引擎回归通过 |
| P6 游戏播放 | 浏览器通过真实 PCM WAV 夹具播放、中文字幕、推进/回滚/读档/跳过、模式切换、菜单、pagehide、过期音频降级、持久设置及 390px 布局 |

- `npm test`：修复后再次运行，117/117 通过，无失败、取消或跳过。原始输出：`outputs/voicevox-acceptance-tests.txt`。
- Python 剧本规则：1/1 通过，输出：`outputs/voicevox-acceptance-python.txt`。系统 `python` 的 uv 启动器报权限错误，因此改用已配置的 bundled Python，命令参数为 `-B -m unittest discover -s tests -p test_script_rules.py`。Node 剧本规则已包含在全量测试中。
- `node tools/check-voicevox-p6.cjs`：通过。服务启动命令：`node tools/serve.mjs --port 8099 --no-open`。输出：`outputs/voicevox-acceptance-browser.txt`。
- 编辑器浏览器冒烟：1440×1000，载入 1,599 条候选，每页最多 200 条；实际连接引擎、选择台词、填写日语、选择 style 2、生成真实查询、搜索空结果及清除筛选均通过，零 pageerror。测试编辑未保存到工程。输出与已目视检查截图：`outputs/voicevox-acceptance-editor.txt`、`outputs/voicevox-acceptance-editor.png`。
- 真实引擎：0.25.2，127 个动态风格；style 2 对 `これは最終確認です。` 合成返回 84,524 字节有效 WAV。通过现有 engine-client 与 isValidWav 验证，仅内存处理，不写生产音频。
- `git diff --check` 通过；Git 的 LF/CRLF 提示不是内容错误。

## 本次修复

`tools/voicevox/voice-publication.mjs` 原先只匹配源指纹、文本、风格与查询；旧任务已合成后，即使条目退回草稿仍可发布。现在服务端要求非空日语且 `translationStatus === 'proofread'`，否则返回 `TRANSLATION_NOT_READY`。P4 测试新增草稿、待译、缺失状态三种拒绝断言，并验证拒绝后原 manifest 不变。

总控书修正 T1 的过时“未开始”状态及初始勘查中的合成状态，README 链接本报告，快速开始明确发布校对门槛及整份 manifest 替换语义。

## 制作边界

- 全篇日语译稿、人工发音/情绪/角色适配听审及所用音声库许可尚未完成；自动化通过不能代替这些工作。
- 5,000 条验证使用模拟引擎，不是 5,000 次真实合成性能测试。
- “发布所选”替换整份 manifest，不做增量追加。每次需选择全部希望保留在游戏中的已完成条目；指南已明确。
- 发布后的播放沿用现有剧情节奏，不等待语音结束；浏览器自动播放限制仍适用。
- 工作区原有未提交开发内容予以保留，本次未提交 Git、未发布生产 WAV、未改写正式中文字幕。
