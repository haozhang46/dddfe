import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createProject, parseArgs } from './create.js'

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

function makeTemplatesRoot() {
  const root = mkdtempSync(join(tmpdir(), 'dddfe-tpl-'))
  dirs.push(root)
  const demo = join(root, 'demo')
  mkdirSync(join(demo, 'src'), { recursive: true })
  writeFileSync(join(demo, 'package.json'), JSON.stringify({ name: 'demo', version: '0.0.0' }))
  writeFileSync(join(demo, 'src', 'hi.txt'), 'hi')
  mkdirSync(join(demo, 'node_modules', 'x'), { recursive: true })
  writeFileSync(join(demo, 'node_modules', 'x', 'a'), 'skip')
  mkdirSync(join(demo, 'dist'), { recursive: true })
  writeFileSync(join(demo, 'dist', 'out.js'), 'skip')
  return root
}

describe('parseArgs', () => {
  it('defaults template to demo', () => {
    expect(parseArgs(['my-app'])).toEqual({ projectName: 'my-app', template: 'demo' })
  })
  it('reads --template', () => {
    expect(parseArgs(['my-app', '--template', 'demo'])).toEqual({
      projectName: 'my-app',
      template: 'demo',
    })
  })
})

describe('createProject', () => {
  it('fails on unknown template', async () => {
    const templatesRoot = makeTemplatesRoot()
    const cwd = mkdtempSync(join(tmpdir(), 'dddfe-cwd-'))
    dirs.push(cwd)
    await expect(
      createProject({ projectName: 'app', template: 'nope', cwd, templatesRoot }),
    ).rejects.toThrow(/unknown template/i)
  })

  it('fails when target exists', async () => {
    const templatesRoot = makeTemplatesRoot()
    const cwd = mkdtempSync(join(tmpdir(), 'dddfe-cwd-'))
    dirs.push(cwd)
    mkdirSync(join(cwd, 'app'))
    await expect(
      createProject({ projectName: 'app', template: 'demo', cwd, templatesRoot }),
    ).rejects.toThrow(/already exists/i)
  })

  it('copies files, renames package, skips excluded dirs', async () => {
    const templatesRoot = makeTemplatesRoot()
    const cwd = mkdtempSync(join(tmpdir(), 'dddfe-cwd-'))
    dirs.push(cwd)
    const dest = await createProject({
      projectName: 'my-app',
      template: 'demo',
      cwd,
      templatesRoot,
    })
    expect(dest).toBe(join(cwd, 'my-app'))
    expect(existsSync(join(dest, 'src', 'hi.txt'))).toBe(true)
    expect(existsSync(join(dest, 'node_modules'))).toBe(false)
    expect(existsSync(join(dest, 'dist'))).toBe(false)
    const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('my-app')
  })
})
