/**
 * Layer rules for this template. Each message names the file or function to use instead.
 * See agent.md "Enforced by lint".
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

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

const BASE_REL = 'src/presentation/components/base'
const BASE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

const BASE_SCENARIOS = {
  DatePicker: {
    elements: [{ name: 'input', types: ['date', 'datetime-local', 'month', 'week', 'time'] }],
    packages: ['react-datepicker', '@mui/x-date-pickers'],
  },
  Form: {
    elements: [{ name: 'form' }],
    packages: ['formik'],
  },
  Text: {
    elements: ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((name) => ({ name })),
    packages: [],
  },
  Input: {
    elements: [
      { name: 'input', types: ['text', 'email', 'password', 'search', 'tel', 'url', ''] },
      { name: 'textarea' },
    ],
    packages: [],
  },
  Select: {
    elements: [{ name: 'select' }],
    packages: [],
  },
  Button: {
    elements: [{ name: 'button' }],
    packages: [],
  },
}

const discoveredBaseComponents = new Map()

function isBasePath(path) {
  const normalized = stripExt(path).replaceAll('\\', '/')
  return (
    normalized === BASE_REL ||
    normalized.startsWith(`${BASE_REL}/`) ||
    normalized.endsWith(`/${BASE_REL}`) ||
    normalized.includes(`/${BASE_REL}/`)
  )
}

function isBaseSpecifier(filename, specifier) {
  if (specifier.startsWith('.')) return isBasePath(resolveRelative(filename, specifier))
  return isBasePath(specifier)
}

function componentFileExists(cwd, name) {
  const dir = join(cwd, BASE_REL)
  return BASE_EXTENSIONS.some(
    (ext) => existsSync(join(dir, `${name}${ext}`)) || existsSync(join(dir, name, `index${ext}`)),
  )
}

function discoverBaseComponents(cwd) {
  if (discoveredBaseComponents.has(cwd)) return discoveredBaseComponents.get(cwd)
  const found = Object.keys(BASE_SCENARIOS).filter((name) => componentFileExists(cwd, name))
  discoveredBaseComponents.set(cwd, found)
  return found
}

function activeBaseComponents(context) {
  const option = context.options?.[0]
  if (option && Array.isArray(option.components)) {
    return option.components.filter((name) => BASE_SCENARIOS[name])
  }
  return discoverBaseComponents(context.cwd || process.cwd())
}

function jsxTag(name) {
  if (name?.type === 'JSXIdentifier') return { kind: 'id', name: name.name }
  if (name?.type === 'JSXMemberExpression' && name.property?.type === 'JSXIdentifier' && name.object?.type === 'JSXIdentifier') {
    return { kind: 'member', object: name.object.name, name: name.property.name }
  }
  return null
}

function literalAttr(value) {
  if (!value) return { known: true, value: '' }
  if (value.type === 'Literal' && typeof value.value === 'string') return { known: true, value: value.value }
  if (value.type === 'JSXExpressionContainer') {
    const expr = value.expression
    if (expr?.type === 'Literal' && typeof expr.value === 'string') return { known: true, value: expr.value }
    if (expr?.type === 'TemplateLiteral' && expr.expressions?.length === 0) {
      return { known: true, value: expr.quasis?.[0]?.value?.cooked ?? '' }
    }
    return { known: false }
  }
  return { known: false }
}

function elementType(opening) {
  for (const attr of opening.attributes ?? []) {
    if (attr.type !== 'JSXAttribute') continue
    if (attr.name?.type === 'JSXIdentifier' && attr.name.name === 'type') return literalAttr(attr.value)
  }
  return { known: true, value: '' }
}

function componentForElement(active, tag, typeInfo) {
  for (const name of active) {
    for (const element of BASE_SCENARIOS[name].elements) {
      if (element.name !== tag) continue
      if (!element.types) return name
      if (!typeInfo.known) continue
      if (element.types.includes(typeInfo.value)) return name
    }
  }
  return null
}

function packageComponent(active, specifier) {
  for (const name of active) {
    if ((BASE_SCENARIOS[name].packages ?? []).some((pkg) => matchesPackage(specifier, pkg))) return name
  }
  return null
}

function importedExportName(spec) {
  if (spec.type === 'ImportDefaultSpecifier') return spec.local?.name ?? null
  if (spec.type === 'ImportSpecifier') return spec.imported?.name ?? spec.local?.name ?? null
  return null
}

function describeElement(tag, typeInfo) {
  if (tag === 'input' && typeInfo.known && typeInfo.value) return `\`<input type="${typeInfo.value}">\``
  return `\`<${tag}>\``
}

const baseComponent = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          components: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      instead: 'Use `{{component}}` from `src/presentation/components/base/{{component}}` instead of {{found}}.',
    },
  },
  create(context) {
    const filename = filePath(context)
    if (!srcRel(filename).startsWith('src/')) return {}
    if (isBasePath(srcRel(filename))) return {}
    const activeNames = activeBaseComponents(context)
    if (activeNames.length === 0) return {}
    const active = new Set(activeNames)
    const allowedLocals = new Set()
    const forbiddenLocals = new Set()
    const allowedNamespaces = new Set()

    function report(node, component, found) {
      context.report({ node, messageId: 'instead', data: { component, found } })
    }

    function visitModule(node) {
      const specifier = sourceValue(node)
      if (specifier == null) return
      if (isBaseSpecifier(filename, specifier)) {
        for (const spec of node.specifiers ?? []) {
          if (spec.type === 'ImportNamespaceSpecifier') {
            allowedNamespaces.add(spec.local.name)
            continue
          }
          const exported = importedExportName(spec)
          if (exported && active.has(exported)) allowedLocals.add(spec.local.name)
        }
        return
      }
      const fromPackage = packageComponent(active, specifier)
      if (fromPackage) {
        for (const spec of node.specifiers ?? []) {
          if (spec.local?.name === fromPackage) forbiddenLocals.add(spec.local.name)
        }
        report(node, fromPackage, `\`${specifier}\``)
        return
      }
      for (const spec of node.specifiers ?? []) {
        const exported = importedExportName(spec)
        if (!exported || !active.has(exported)) continue
        if (spec.local?.name) forbiddenLocals.add(spec.local.name)
        report(spec, exported, `importing \`${exported}\` from \`${specifier}\``)
      }
    }

    return {
      ...moduleVisitors(visitModule),
      JSXOpeningElement(node) {
        const tag = jsxTag(node.name)
        if (!tag) return
        if (tag.kind === 'member') {
          if (!active.has(tag.name) || allowedNamespaces.has(tag.object)) return
          report(node, tag.name, `\`<${tag.object}.${tag.name}>\``)
          return
        }
        const typeInfo = tag.name === 'input' ? elementType(node) : { known: true, value: '' }
        const component = componentForElement(active, tag.name, typeInfo)
        if (component) {
          report(node, component, describeElement(tag.name, typeInfo))
          return
        }
        if (!active.has(tag.name) || allowedLocals.has(tag.name) || forbiddenLocals.has(tag.name)) return
        if (tag.name[0] === tag.name[0].toUpperCase()) report(node, tag.name, `\`<${tag.name}>\``)
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
    'base-component': baseComponent,
  },
}

export default plugin
