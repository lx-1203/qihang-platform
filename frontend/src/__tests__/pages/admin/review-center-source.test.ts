import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('admin review center wiring', () => {
  it('adds the review center page to admin routing and navigation', () => {
    const routesSource = readRepoFile('src/routes/index.tsx');
    const adminLayoutSource = readRepoFile('src/layouts/AdminLayout.tsx');

    expect(routesSource).toContain('ReviewCenter');
    expect(routesSource).toMatch(/path:\s*['"]review-center['"]/);
    expect(adminLayoutSource).toContain('/admin/review-center');
    expect(adminLayoutSource).toContain('审核中心');
  });
});
