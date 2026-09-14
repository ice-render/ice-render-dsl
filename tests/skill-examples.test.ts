// 文档即契约：把 SKILL 与提示词里的 ```json 代码块抽出来跑校验。
//
// 为什么值得单独测：Agent 唯一的"说明书"就是这两份文档，一旦里面出现不存在的字段、写错的端口、
// 悬空的节点 id，Agent 会照着抄 —— 而这类错误不会在别处暴露（没人会去手动跑文档里的例子）。
// 这里把"文档里的完整文档必须能通过 validateDsl"变成回归：文档腐化 = 测试红。
import fs from 'node:fs';
import path from 'node:path';
import { validateDsl } from '../src';

const ROOT = path.resolve(__dirname, '..');
const DOCS = ['skills/ice-render-dsl/SKILL.md', 'prompts/agent-prompt.md'];

/** 抽出所有 ```json 代码块。 */
function jsonBlocks(markdown: string): string[] {
  const out: string[] = [];
  const re = /```json\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown))) {
    out.push(match[1]);
  }
  return out;
}

describe('SKILL / 提示词里的 JSON 例子', () => {
  for (const rel of DOCS) {
    describe(rel, () => {
      const markdown = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const blocks = jsonBlocks(markdown);

      it('至少包含 2 个 JSON 代码块（防止抽取逻辑失效导致"测试空转"）', () => {
        expect(blocks.length).toBeGreaterThanOrEqual(2);
      });

      it('每个 JSON 代码块都是合法 JSON', () => {
        blocks.forEach((block) => {
          expect(() => JSON.parse(block)).not.toThrow();
        });
      });

      it('每个"完整文档"（含 nodes）都能通过 validateDsl，且没有 error 级诊断', () => {
        const documents = blocks
          .map((block) => JSON.parse(block))
          .filter((doc) => doc && typeof doc === 'object' && Array.isArray(doc.nodes));

        expect(documents.length).toBeGreaterThan(0);
        // 一份"每个示例都不合法"的清单：断言比空数组，失败时直接看到 code @ path
        const broken = documents
          .map((doc, index) => ({ index, result: validateDsl(doc) }))
          .filter(({ result }) => !result.valid)
          .map(({ index, result }) => ({
            example: index + 1,
            problems: result.diagnostics.filter((d) => d.severity === 'error').map((d) => `${d.code} @ ${d.path}`),
          }));
        expect(broken).toEqual([]);
      });

      it('编排示例里的 targets / autoplay 都能被解析（结构自洽）', () => {
        const documents = blocks
          .map((block) => JSON.parse(block))
          .filter((doc) => doc && typeof doc === 'object' && Array.isArray(doc.nodes) && doc.orchestration);
        documents.forEach((doc) => {
          const ids = new Set(doc.nodes.map((n: any) => n.id));
          const groupNames = Object.keys(doc.orchestration.groups || {});
          if (doc.orchestration.autoplay) {
            expect(groupNames).toContain(doc.orchestration.autoplay);
          }
          for (const group of Object.values<any>(doc.orchestration.groups || {})) {
            for (const track of group.tracks || []) {
              for (const target of track.targets || []) {
                expect(ids.has(target)).toBe(true);
              }
            }
          }
        });
      });

      it('片段示例（节点 / 连线 / 编排块）都是合法 JSON 对象', () => {
        const fragments = blocks
          .map((block) => JSON.parse(block))
          .filter((doc) => doc && typeof doc === 'object' && !Array.isArray(doc.nodes));
        fragments.forEach((fragment) => {
          expect(typeof fragment).toBe('object');
        });
      });
    });
  }
});
