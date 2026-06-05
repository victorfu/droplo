import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readRuleFile(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('Firestore rules keep site password secrets server-only', async () => {
  const rules = await readRuleFile('../firestore.rules');

  assert.match(
    rules,
    /match\s+\/siteSecrets\/\{siteId\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/
  );
});

test('Storage rules prevent direct public reads of uploaded site files', async () => {
  const rules = await readRuleFile('../storage.rules');

  assert.match(
    rules,
    /match\s+\/sites\/\{siteId\}\/\{allPaths=\*\*\}\s*\{[\s\S]*?allow\s+read:\s*if\s+false;/
  );
});
