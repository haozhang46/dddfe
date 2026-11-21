#!/usr/bin/env node
// Lock the Nx affected rule: a core-lib change runs core-lib tests plus every
// project that depends on core-lib. An unrelated project stays out of that set.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const nxBin = resolve(root, 'node_modules/nx/dist/bin/nx.js')

const env = {
  ...process.env,
  NX_DAEMON: 'false',
  NX_TUI: 'false',
  CI: 'true',
}

function nx(args) {
  return execFileSync(process.execPath, [nxBin, ...args], {
    cwd: root,
    encoding: 'utf8',
    env,
  })
}

function parseJson(text) {
  const start = text.indexOf('{')
  if (start === -1) throw new Error(`nx did not return JSON:\n${text}`)
  return JSON.parse(text.slice(start))
}

function projectGraph() {
  const dir = mkdtempSync(join(tmpdir(), 'nx-graph-'))
  const file = join(dir, 'graph.json')
  try {
    nx(['graph', `--file=${file}`])
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    return parsed.graph ?? parsed
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function affectedTestProjects(file) {
  const stdout = nx([
    'affected:test',
    `--files=${file}`,
    '--graph=stdout',
    '--outputStyle=static',
  ])
  const parsed = parseJson(stdout)
  const tasks = parsed.tasks?.tasks ?? {}
  return Object.keys(tasks)
    .map((task) => task.replace(/:test$/, ''))
    .sort()
}

function dependentsOf(graph, project) {
  return Object.entries(graph.dependencies)
    .filter(([, edges]) => edges.some((edge) => edge.target === project))
    .map(([name]) => name)
    .sort()
}

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

function sameSet(actual, expected) {
  return actual.length === expected.length && actual.every((name, i) => name === expected[i])
}

const graph = projectGraph()
const projects = Object.keys(graph.nodes).sort()
const dependents = dependentsOf(graph, 'core-lib')

if (!projects.includes('core-lib')) {
  fail('project graph is missing core-lib')
}
if (projects.includes('demo')) {
  fail('templates/demo must stay outside the Nx graph (it is a copy-out app, not a workspace project)')
}
if (dependents.length < 2) {
  fail(`core-lib needs at least two dependents so affected:test covers every consumer.\n  dependents: ${dependents.join(', ') || '(none)'}`)
}
if (dependents.includes('create-dddfe')) {
  fail('create-dddfe must not depend on core-lib')
}

const expectedCore = ['core-lib', ...dependents].sort()
const cases = [
  ['packages/core-lib/src/quantity.ts', expectedCore],
  ['packages/order-app/src/lineTotal.ts', ['order-app']],
  ['packages/admin-app/src/stockLabel.ts', ['admin-app']],
  ['packages/create-dddfe/src/create.ts', ['create-dddfe']],
]

for (const [file, expected] of cases) {
  const actual = affectedTestProjects(file)
  if (!sameSet(actual, expected)) {
    fail(
      `nx affected:test --files=${file}\n  expected: ${expected.join(', ')}\n  actual:   ${actual.join(', ')}`,
    )
  } else {
    console.log(`ok  ${file} → ${actual.join(', ')}`)
  }
}

if (process.exitCode) {
  process.exit(process.exitCode)
}

console.log(`core-lib dependents: ${dependents.join(', ')}`)
