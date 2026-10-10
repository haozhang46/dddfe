import { existsSync } from 'node:fs'
import { access, cp, readFile, writeFile } from 'node:fs/promises'
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

const EXCLUDED_NAMES = new Set(['node_modules', 'dist', '.git', '.DS_Store'])

function shouldExclude(name: string): boolean {
  return EXCLUDED_NAMES.has(name) || name.endsWith('.tsbuildinfo')
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

  return dest
}
