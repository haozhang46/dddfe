import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { createProject, ensureDotEnv, parseArgs } from './create.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const realTemplatesRoot = resolve(packageRoot, '..', '..', 'templates')

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

  it('copies agent scaffold (skills, githooks, docs, verify) from real demo template', async () => {
    expect(existsSync(join(realTemplatesRoot, 'demo', 'package.json'))).toBe(true)
    const cwd = mkdtempSync(join(tmpdir(), 'dddfe-cwd-'))
    dirs.push(cwd)
    const dest = await createProject({
      projectName: 'scaffold-app',
      template: 'demo',
      cwd,
      templatesRoot: realTemplatesRoot,
    })

    const mustExist = [
      'AGENT.md',
      'agent.md',
      '.cursor/skills/ddd-development-workflow.md',
      '.cursor/skills/when-to-use-formal-verification.md',
      '.cursor/install.sh',
      '.cursor/start.sh',
      '.cursor/environment.json',
      '.githooks/pre-commit',
      'scripts/verify.sh',
      'scripts/registry.mjs',
      'registry.json',
      'components.json',
      'r/form.json',
      'docs/SUMMARY.md',
      'oxlint/ddd-plugin.js',
      'oxlint/check-css-bem.js',
      '.oxlintrc.json',
      '.oxfmtrc.json',
      '.gitignore',
      '.env.example',
      '.env',
    ]
    for (const rel of mustExist) {
      expect(existsSync(join(dest, rel)), rel).toBe(true)
    }

    const gitignore = readFileSync(join(dest, '.gitignore'), 'utf8')
    expect(gitignore).toMatch(/^\.env$/m)
    expect(gitignore).toMatch(/!\.env\.example/)

    const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8')) as {
      name: string
      scripts: Record<string, string>
    }
    expect(pkg.name).toBe('scaffold-app')
    expect(pkg.scripts.lint).toMatch(/oxlint/)
    expect(pkg.scripts['fmt:check']).toMatch(/oxfmt/)
    expect(pkg.scripts.verify).toBe('./scripts/verify.sh')
    expect(pkg.scripts.prepare).toMatch(/core\.hooksPath/)

    expect(statSync(join(dest, '.githooks/pre-commit')).mode & 0o111).toBeTruthy()
    expect(statSync(join(dest, 'scripts/verify.sh')).mode & 0o111).toBeTruthy()
    expect(statSync(join(dest, '.cursor/install.sh')).mode & 0o111).toBeTruthy()
    expect(statSync(join(dest, '.cursor/start.sh')).mode & 0o111).toBeTruthy()
  })

  it('ensureDotEnv seeds .env once from .env.example', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dddfe-env-'))
    dirs.push(root)
    writeFileSync(join(root, '.env.example'), 'VITE_API=\n')
    expect(await ensureDotEnv(root)).toBe(true)
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('VITE_API=\n')
    expect(await ensureDotEnv(root)).toBe(false)
  })
})
