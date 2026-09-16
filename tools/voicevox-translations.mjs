import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { exportApprovedScripts, exportTranslationBundle, exportVoiceRoleBatches, importGeneratedDraft, importTranslationFiles } from './voicevox/translation-workflow.mjs';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function usage() {
  console.log(`用法：
  node tools/voicevox-translations.mjs export [--out 目录] [--project 翻译工程.json] [--include-narration]
  node tools/voicevox-translations.mjs import <TSV/CSV/JSON 文件或目录...> [--out 翻译工程.json] [--allow-missing] [--include-narration]
  node tools/voicevox-translations.mjs import-draft <紧凑初稿.json> [--out 翻译工程.json]
  node tools/voicevox-translations.mjs export-voice-batches [--project 翻译工程.json] [--out 目录] [--role-map 映射.json]
  node tools/voicevox-translations.mjs export-ready [--project 翻译工程.json] [--out 目录]

默认只处理已发布有效剧本中归类为“台词”的项目。只有 proofread（已校对）状态可导出给正式批量合成。`);
}

export async function main(args = process.argv.slice(2)) {
  const command = args[0];
  const includeNarration = args.includes('--include-narration');
  if (command === 'export') {
    const output = resolve(option('--out', 'game/data/voice/translations/export'));
    const result = await exportTranslationBundle(output, {
      includeNarration,
      projectFile: resolve(option('--project', 'game/data/voice/translations.json')),
      roleMapFile: resolve(option('--role-map', 'game/data/voice/speaker-role-map.json'))
    });
    console.log(`已导出 ${result.total} 条到 ${output}（${result.speakers.length} 个角色文件）。`);
    return;
  }
  if (command === 'import') {
    const inputs = args.slice(1).filter((value, index, all) => !value.startsWith('--') && !['--out'].includes(all[index - 1]));
    if (!inputs.length) throw new Error('import 至少需要一个文件或目录。');
    const output = resolve(option('--out', 'game/data/voice/translations.json'));
    const result = await importTranslationFiles(inputs.map(resolve), output, { allowMissing: args.includes('--allow-missing'), includeNarration });
    for (const warning of result.warnings) console.warn(`警告 [${warning.code}] ${warning.message}`);
    for (const error of result.errors) console.error(`错误 [${error.code}] ${error.message}`);
    if (!result.written) throw new Error(`回导失败：${result.errors.length} 个错误，未写入任何内容。`);
    console.log(`已回导 ${result.accepted.length} 条到 ${output}；其中 proofread ${result.accepted.filter(line => line.translationStatus === 'proofread').length} 条。`);
    return;
  }
  if (command === 'import-draft') {
    if (!args[1] || args[1].startsWith('--')) throw new Error('import-draft 需要一个初稿 JSON 文件。');
    const output = resolve(option('--out', 'game/data/voice/translations.json'));
    const result = await importGeneratedDraft(resolve(args[1]), output);
    console.log(`已合并 ${result.imported} 条翻译初稿到 ${output}；工程现有 ${result.total} 条。`);
    return;
  }
  if (command === 'export-ready') {
    const project = resolve(option('--project', 'game/data/voice/translations.json'));
    const output = resolve(option('--out', 'game/data/voice/translations/ready'));
    const roleMap = resolve(option('--role-map', 'game/data/voice/speaker-role-map.json'));
    const result = await exportApprovedScripts(project, output, roleMap);
    console.log(`已导出 ${result.count} 条已校对日语台词到 ${output}。`);
    return;
  }
  if (command === 'export-voice-batches') {
    const project = resolve(option('--project', 'game/data/voice/translations.json'));
    const output = resolve(option('--out', 'game/data/voice/voicevox-import'));
    const roleMap = resolve(option('--role-map', 'game/data/voice/speaker-role-map.json'));
    const result = await exportVoiceRoleBatches(project, output, roleMap);
    console.log(`已按 ${result.files.length} 个配音角色导出 ${result.total} 条到 ${output}。`);
    return;
  }
  usage();
  if (command) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
