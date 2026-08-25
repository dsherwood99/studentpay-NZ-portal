import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  collectedThroughLabel,
  comparisonToneClass,
  settlementLagNote,
} from './collections-copy.js';

test('headline and note copy use the formatted cutoff date', () => {
  assert.equal(collectedThroughLabel('2026-08-18'), 'Collected through 18 Aug');
  assert.equal(
    settlementLagNote('2026-08-18'),
    'Data shown through 18 Aug to allow recent collections time to settle.'
  );
  assert.doesNotMatch(collectedThroughLabel('2026-08-18'), /Month to date/i);
});

test('comparison copy uses StudentPay purple for both directions', () => {
  assert.equal(comparisonToneClass(), 'collections-comparison');

  const chartSource = readFileSync(
    fileURLToPath(new URL('../app/components/CollectionsChart.js', import.meta.url)),
    'utf8'
  );
  const cssSource = readFileSync(
    fileURLToPath(new URL('../app/preview/preview.css', import.meta.url)),
    'utf8'
  );

  assert.match(chartSource, /comparisonToneClass\(\)/);
  assert.match(chartSource, /collectedThroughLabel/);
  assert.doesNotMatch(chartSource, /collections-comparison-up/);
  assert.doesNotMatch(chartSource, /Month to date/);
  assert.match(cssSource, /\.collections-comparison\s*\{[^}]*--brand-accent-dark/);
  assert.doesNotMatch(
    cssSource,
    /\.collections-comparison-up\s*\{[^}]*--brand-primary/
  );
});
