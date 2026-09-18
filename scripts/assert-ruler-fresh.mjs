#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Asserts the local harness checkout's published-type face is fresh for the
// `typecheck` ruler: every `paths` target in tsconfig.json must exist, and
// each target's mtime must be at least as new as the newest file under the
// corresponding package's src/ directory. Red = the checkout ruler would
// silently measure a stale type face (or fall back to node_modules for a
// missing target) - exactly the false green this assertion exists to catch.
// A runner with no harness clone (GitHub Actions) reports the face as not
// verifiable there and exits 0; the `typecheck:ci` ruler still measures the
// published line on that runner, so no ruler is left unguarded.
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const tsconfig = JSON.parse(readFileSync(join(repoRoot, 'tsconfig.json'), 'utf8'))
const paths = tsconfig.compilerOptions?.paths ?? {}
const targets = Object.values(paths).flat()
if (targets.length === 0) {
  console.log('fresh: no paths targets (ruler measures the published line only)')
  process.exit(0)
}

const checkoutRoot = resolve(repoRoot, '..', '..', '..', '..', 'deepseek-harness')
if (!existsSync(checkoutRoot)) {
  console.log('fresh: harness checkout absent - the checkout face is not verifiable on this runner; skipping')
  process.exit(0)
}

function newestMtime(dir) {
  let newest = 0
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      newest = Math.max(newest, newestMtime(p))
    } else {
      newest = Math.max(newest, statSync(p).mtimeMs)
    }
  }
  return newest
}

const failures = []
const fresh = []
for (const rel of targets) {
  const abs = resolve(repoRoot, rel)
  if (!existsSync(abs)) {
    failures.push(`missing target: ${rel} (ruler falls back to node_modules = false green)`)
    continue
  }
  const targetMtime = statSync(abs).mtimeMs
  const srcDir = join(dirname(dirname(dirname(abs))), 'src')
  if (!existsSync(srcDir)) {
    fresh.push(`target ok (no src peer in checkout): ${rel}`)
    continue
  }
  const srcNewest = newestMtime(srcDir)
  if (srcNewest > targetMtime) {
    failures.push(
      `stale target: ${rel} (src newer than types by ${Math.round((srcNewest - targetMtime) / 1000)}s)`,
    )
  } else {
    fresh.push(`fresh: ${rel}`)
  }
}

console.log(`targets=${targets.length} fresh=${fresh.length} failures=${failures.length}`)
if (failures.length > 0) {
  console.error('STALE RULER:')
  for (const f of failures) console.error('  ' + f)
  process.exit(1)
}
console.log('ruler fresh: all checkout paths targets are at least as new as their src')
