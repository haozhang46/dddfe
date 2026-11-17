import { existsSync } from 'node:fs'
import { access, chmod, cp, readFile, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { basename, join, resolve } from 'node:path'

export type ParsedArgs = {
  projectName: string
  template: string
}

export type CreateProjectOptions = {
  projectName: string
  template: string
  cwd: string
  templatesRoot: string
}

const EXCLUDED_NAMES = new Set(['node_modules', 'dist', '.git', '.DS_Store', '.env'])

function shouldExclude(name: string): boolean {
  // Never copy local secrets; .env.example is kept and used to seed .env
  return (
    EXCLUDED_NAMES.has(name) ||
    name.endsWith('.tsbuildinfo') ||
    (name.startsWith('.env.') && name !== '.env.example')
  )
}

/** Create `.env` from `.env.example` when missing (idempotent). */
export async function ensureDotEnv(projectRoot: string): Promise<boolean> {
  const envPath = join(projectRoot, '.env')
  if (existsSync(envPath)) return false
  const examplePath = join(projectRoot, '.env.example')
  if (!existsSync(examplePath)) return false
  await writeFile(envPath, await readFile(examplePath, 'utf8'), 'utf8')
  return true
}

export function parseArgs(argv: string[]): ParsedArgs {
  let template = 'demo'
  const positionals: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--template') {
      const value = argv[++i]
      if (!value) throw new Error('Missing value for --template')
      template = value
      continue
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`)
    }
    positionals.push(arg)
  }

  const projectName = positionals[0]
  if (!projectName) {
    throw new Error('Usage: create-dddfe <project-name> [--template demo]')
  }

  return { projectName, template }
}

/** Bundled `package/templates` when published; else monorepo `../../templates`. */
export function resolveTemplatesRoot(packageRoot: string): string {
  const bundled = join(packageRoot, 'templates')
  if (existsSync(bundled)) return bundled
  return resolve(packageRoot, '..', '..', 'templates')
}

export async function createProject(opts: CreateProjectOptions): Promise<string> {
  const { projectName, template, cwd, templatesRoot } = opts
  const templateDir = join(templatesRoot, template)

  try {
    await access(templateDir, constants.R_OK)
  } catch {
    throw new Error(`Unknown template: ${template}`)
  }

  const dest = resolve(cwd, projectName)
  if (existsSync(dest)) {
    throw new Error(`Target already exists: ${dest}`)
  }

  await cp(templateDir, dest, {
    recursive: true,
    filter: (src) => {
      const name = basename(src)
      return !shouldExclude(name)
    },
  })

  const pkgPath = join(dest, 'package.json')
  const pkgRaw = await readFile(pkgPath, 'utf8')
  const pkg = JSON.parse(pkgRaw) as Record<string, unknown>
  pkg.name = basename(dest)
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')

  // Ensure hooks / verify / env scripts are executable after copy (cp may drop +x)
  for (const rel of [
    '.githooks/pre-commit',
    'scripts/verify.sh',
    '.cursor/install.sh',
    '.cursor/start.sh',
  ]) {
    const file = join(dest, rel)
    if (existsSync(file)) {
      await chmod(file, 0o755)
    }
  }

  await ensureDotEnv(dest)

  return dest
}
