import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProject, parseArgs, resolveTemplatesRoot } from './create.js'

async function main() {
  const { projectName, template } = parseArgs(process.argv.slice(2))
  const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  const templatesRoot = resolveTemplatesRoot(packageRoot)
  const dest = await createProject({
    projectName,
    template,
    cwd: process.cwd(),
    templatesRoot,
  })

  console.log(`Created ${dest}`)
  console.log(
    'Includes: AGENT.md, .cursor/skills, .cursor/install.sh, .cursor/start.sh, .githooks, docs, scripts/verify.sh',
  )
  console.log('Next:')
  console.log(`  cd ${projectName}`)
  console.log('  git init')
  console.log('  bash .cursor/install.sh   # or: pnpm install')
  console.log('  pnpm verify')
  console.log('  bash .cursor/start.sh     # optional Vite on :5173')
  console.log('Or from this repo: make create NAME=../your-app')
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(message)
  process.exit(1)
})
