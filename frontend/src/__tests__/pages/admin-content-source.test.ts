import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('admin content page copy cleanup', () => {
  it('leans the mixed content model toward resources and content in user-facing copy', () => {
    const source = readSource('src/pages/admin/Content.tsx');

    expect(source).toContain('内容资源');
    expect(source).toContain('资料资源库');
    expect(source).toContain('资源详情');
    expect(source).toContain('搜索资源名称、发布者...');
    expect(source).toContain("tab === 'courses' ? '资源'");

    expect(source).not.toContain('课程管理');
    expect(source).not.toContain('课程详情');
    expect(source).not.toContain('搜索课程名称、讲师...');
    expect(source).not.toContain('暂无课程数据');
  });
});
