/**
 * Layer rules for this template. Each message names the file or function to use instead.
 * See agent.md "Enforced by lint".
 */

const UI_PACKAGES = ['react', 'react-dom', 'react-router', 'react-router-dom']
const APP_IO_PACKAGES = [
  ...UI_PACKAGES,
  'rxjs',
  'axios',
  'ky',
  'got',
  'node-fetch',
  'fs',
  'http',
  'https',
  'node:fs',
  'node:http',
  'node:https',
]
const STORAGE = new Set(['localStorage', 'sessionStorage'])
const SECTION_CALLS = new Set(['applyChange', 'ensureCityValid', 'setPath'])

function filePath(context) {
  return String(context.filename ?? '').replaceAll('\\', '/')
}

function srcRel(filename) {
  const match = filename.match(/(?:^|\/)(src\/.*)$/)
  return match ? match[1] : filename
}

function layerOf(filename) {
  const match = srcRel(filename).match(/^src\/(domain|application|infrastructure|presentation)\//)
  return match ? match[1] : null
}

function domainBc(filename) {
  const match = srcRel(filename).match(/^src\/domain\/([^/]+)\//)
  return match ? match[1] : null
}

function isTestFile(filename) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(filename)
}

function isSection(filename) {
  return /^src\/presentation\/pages\/[^/]+\/components\//.test(srcRel(filename))
}

function stripExt(path) {
  return path.replace(/\.(tsx?|jsx?)$/, '')
}

function resolveRelative(fromFile, specifier) {
  const dir = srcRel(fromFile).slice(0, srcRel(fromFile).lastIndexOf('/'))
  const parts = `${dir}/${specifier}`.split('/')
  const out = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return out.join('/')
}

function matchesPackage(specifier, name) {
  return specifier === name || specifier.startsWith(`${name}/`)
}

function isImmer(specifier) {
  return matchesPackage(specifier, 'immer')
}

function isVitest(specifier) {
  return matchesPackage(specifier, 'vitest')
}

function isUiPackage(specifier) {
  return UI_PACKAGES.some((name) => matchesPackage(specifier, name))
}

function isAppIoPackage(specifier) {
  return APP_IO_PACKAGES.some((name) => matchesPackage(specifier, name))
}

function targetPath(fromFile, specifier) {
  if (specifier.startsWith('.')) return resolveRelative(fromFile, specifier)
  return specifier
}

function splitLayer(path) {
  const normalized = stripExt(path)
  const match = normalized.match(
    /(?:^|\/)src\/(domain|application|infrastructure|presentation)(?:\/(.*))?$/,
  )
  if (!match) return null
  return { layer: match[1], rest: match[2] ?? '' }
}

function parseDomain(path) {
  const normalized = stripExt(path)
  const match =
    normalized.startsWith('src/') || normalized.includes('/src/')
      ? normalized.match(/(?:^|\/)src\/domain\/([^/]+)(?:\/(.*))?$/)
      : normalized.match(/(?:^|\/)domain\/([^/]+)(?:\/(.*))?$/)
  if (!match) return null
  const rest = match[2] ?? ''
  return { bc: match[1], deep: rest !== '' && rest !== 'index' }
}

function sourceValue(node) {
  const value = node.source?.value
  return typeof value === 'string' ? value : null
}

function isTypeOnly(node) {
  if (node.importKind === 'type' || node.exportKind === 'type') return true
  const specs = node.specifiers ?? []
  if (specs.length === 0) return false
  return specs.every((spec) => spec.importKind === 'type' || spec.exportKind === 'type')
}

function moduleVisitors(visit) {
  function visitNode(node) {
    const specifier = sourceValue(node)
    if (specifier == null) return
    visit(node, specifier, isTypeOnly(node))
  }

  return {
    ImportDeclaration: visitNode,
    ExportAllDeclaration: visitNode,
    ExportNamedDeclaration: visitNode,
  }
}

function calleeName(callee) {
  if (!callee) return null
  if (callee.type === 'Identifier') return callee.name
  if (
    callee.type === 'MemberExpression' &&
    callee.computed === false &&
    callee.property?.type === 'Identifier'
  ) {
    return callee.property.name
  }
  return null
}

function ioVisitors(report) {
  return {
    CallExpression(node) {
      if (calleeName(node.callee) === 'fetch') report(node, 'fetch')
    },
    NewExpression(node) {
      const name = calleeName(node.callee)
      if (name === 'XMLHttpRequest' || name === 'WebSocket') report(node, name)
    },
    MemberExpression(node) {
      if (node.object?.type === 'Identifier' && STORAGE.has(node.object.name)) {
        report(node, node.object.name)
        return
      }
      if (
        node.computed === false &&
        node.property?.type === 'Identifier' &&
        STORAGE.has(node.property.name) &&
        node.object?.type === 'Identifier'
      ) {
        report(node, node.property.name)
      }
    },
    Identifier(node) {
      if (!STORAGE.has(node.name)) return
      const parent = node.parent
      if (parent?.type === 'MemberExpression' && (parent.object === node || parent.property === node)) {
        return
      }
      report(node, node.name)
    },
  }
}

function allowedDomainImport(filename, specifier) {
  if (specifier.startsWith('.')) {
    const info = splitLayer(targetPath(filename, specifier))
    return info?.layer === 'domain'
  }
  if (isImmer(specifier)) return true
  if (isTestFile(filename) && isVitest(specifier)) return true
  return false
}

function badMutationName(name) {
  return /^apply[A-Z].+Change$/.test(name) || /^(update|mutate)[A-Z]/.test(name)
}

function isFunctionValue(node) {
  return (
    node?.type === 'ArrowFunctionExpression' ||
    node?.type === 'FunctionExpression' ||
    node?.type === 'FunctionDeclaration'
  )
}

const domainPurity = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      import:
        'Domain stays pure. Do not import `{{specifier}}` from `src/domain`. Call it from an application use case through a port in `src/application/ports`, and keep React in `src/presentation`. `immer` is the only runtime package domain may import.',
      io: 'Domain stays pure. Do not use `{{api}}` in `src/domain`. Add a port in `src/application/ports` and implement it in `src/infrastructure`.',
    },
  },
  create(context) {
    const filename = filePath(context)
    if (layerOf(filename) !== 'domain') return {}
    return {
      ...moduleVisitors((node, specifier) => {
        if (allowedDomainImport(filename, specifier)) return
        context.report({ node, messageId: 'import', data: { specifier } })
      }),
      ...ioVisitors((node, api) => {
        context.report({ node, messageId: 'io', data: { api } })
      }),
    }
  },
}

const domainBarrel = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      deep: 'Import `{{bc}}` from its public barrel `src/domain/{{bc}}`, not `{{specifier}}`. Files inside that bounded context stay private.',
    },
  },
  create(context) {
    const filename = filePath(context)
    const own = domainBc(filename)
    return moduleVisitors((node, specifier) => {
      const target = parseDomain(targetPath(filename, specifier))
      if (!target?.deep) return
      if (own != null && own === target.bc) return
      context.report({
        node,
        messageId: 'deep',
        data: { bc: target.bc, specifier },
      })
    })
  },
}

const applicationBoundary = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      import:
        'Application depends on ports, not adapters. Do not import `{{specifier}}`. Declare the dependency in `src/application/ports` and construct the adapter in `createDeps`.',
      io: 'Application orchestrates ports. Do not use `{{api}}` here. Add a method on a port in `src/application/ports` and implement it in `src/infrastructure`.',
    },
  },
  create(context) {
    const filename = filePath(context)
    if (layerOf(filename) !== 'application') return {}
    return {
      ...moduleVisitors((node, specifier) => {
        if (specifier.startsWith('.')) {
          const info = splitLayer(targetPath(filename, specifier))
          if (info?.layer === 'infrastructure' || info?.layer === 'presentation') {
            context.report({ node, messageId: 'import', data: { specifier } })
          }
          return
        }
        if (isAppIoPackage(specifier)) {
          context.report({ node, messageId: 'import', data: { specifier } })
        }
      }),
      ...ioVisitors((node, api) => {
        context.report({ node, messageId: 'io', data: { api } })
      }),
    }
  },
}

const infrastructureBoundary = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      import:
        'Infrastructure implements ports and does not render UI. Do not import `{{specifier}}`. Import the port from `src/application/ports` and wire this adapter in `createDeps`.',
    },
  },
  create(context) {
    const filename = filePath(context)
    if (layerOf(filename) !== 'infrastructure') return {}
    return moduleVisitors((node, specifier) => {
      if (isUiPackage(specifier)) {
        context.report({ node, messageId: 'import', data: { specifier } })
        return
      }
      if (!specifier.startsWith('.')) return
      const info = splitLayer(targetPath(filename, specifier))
      if (!info) return
      if (info.layer === 'presentation') {
        context.report({ node, messageId: 'import', data: { specifier } })
        return
      }
      if (info.layer === 'application' && info.rest !== 'ports' && !info.rest.startsWith('ports/')) {
        context.report({ node, messageId: 'import', data: { specifier } })
      }
    })
  },
}

const sectionViewModel = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      import:
        'Page sections render a ViewModel only. Do not import `{{specifier}}`. Forward edits with `orchestrator.changeField(path, value)` on the page. Use `import type` from `src/domain/<bc>` when you only need a type.',
      call: 'Page sections do not run domain mutations. Do not call `{{name}}`. Forward the edit with `orchestrator.changeField(path, value)`.',
    },
  },
  create(context) {
    const filename = filePath(context)
    if (!isSection(filename)) return {}
    return {
      ...moduleVisitors((node, specifier, typeOnly) => {
        const resolved = specifier.startsWith('.') ? targetPath(filename, specifier) : specifier
        const info = specifier.startsWith('.') ? splitLayer(resolved) : null
        if (info?.layer === 'application' || info?.layer === 'infrastructure') {
          context.report({ node, messageId: 'import', data: { specifier } })
          return
        }
        const domain = parseDomain(resolved)
        if (domain && !typeOnly) {
          context.report({ node, messageId: 'import', data: { specifier } })
        }
      }),
      CallExpression(node) {
        const name = calleeName(node.callee)
        if (name != null && SECTION_CALLS.has(name)) {
          context.report({ node, messageId: 'call', data: { name } })
        }
      },
    }
  },
}

const applyChangeName = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      rename:
        'Name this draft mutation `applyChange`. Distinguish the `{{bc}}` bounded context by importing `src/domain/{{bc}}`, not by renaming the function to `{{name}}`.',
    },
  },
  create(context) {
    const filename = filePath(context)
    if (layerOf(filename) !== 'domain') return {}
    const bc = domainBc(filename) ?? '<bc>'
    function report(node, name) {
      if (!badMutationName(name)) return
      context.report({ node, messageId: 'rename', data: { name, bc } })
    }
    return {
      FunctionDeclaration(node) {
        if (node.id?.name) report(node.id, node.id.name)
      },
      VariableDeclarator(node) {
        if (node.id?.type === 'Identifier' && isFunctionValue(node.init)) {
          report(node.id, node.id.name)
        }
      },
    }
  },
}

const plugin = {
  meta: { name: 'ddd' },
  rules: {
    'domain-purity': domainPurity,
    'domain-barrel': domainBarrel,
    'application-boundary': applicationBoundary,
    'infrastructure-boundary': infrastructureBoundary,
    'section-viewmodel': sectionViewModel,
    'apply-change-name': applyChangeName,
  },
}

export default plugin
