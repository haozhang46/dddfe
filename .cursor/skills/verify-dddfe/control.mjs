#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const skillDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(skillDir, '../../..')
const demoDir = join(repoRoot, 'templates/demo')
const runDir = join(skillDir, 'run')
const statePath = join(runDir, 'state.json')
const artifactRoot = join(skillDir, 'artifacts')

function logDaemon(message) {
  mkdirSync(runDir, { recursive: true })
  appendFileSync(join(runDir, 'daemon.log'), `${message}\n`)
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function readState() {
  if (!existsSync(statePath)) return null
  return JSON.parse(readFileSync(statePath, 'utf8'))
}

function writeState(state) {
  mkdirSync(runDir, { recursive: true })
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`)
}

function alive(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function parseArgs(argv) {
  const positionals = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next == null || next.startsWith('--')) flags[key] = true
      else {
        flags[key] = next
        i++
      }
    } else positionals.push(arg)
  }
  return { positionals, flags }
}

function artifactPath(input) {
  const path = resolve(skillDir, input)
  if (!path.startsWith(artifactRoot + '/') && path !== artifactRoot) {
    throw new Error(`Evidence must stay under ${artifactRoot}. Got ${path}.`)
  }
  mkdirSync(dirname(path), { recursive: true })
  return path
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let last = 'no response'
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      const text = await response.text()
      if (response.ok && text.includes('id="root"') && text.includes('<title>demo</title>')) return
      last = `HTTP ${response.status}`
    } catch (err) {
      last = err instanceof Error ? err.message : String(err)
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200))
  }
  throw new Error(`Vite did not become usable at ${url} (${last}). Read ${join(runDir, 'vite.log')}.`)
}

function locator(page, flags) {
  if (flags.label) return page.getByLabel(String(flags.label), { exact: true })
  if (flags.role && flags.name) {
    return page.getByRole(String(flags.role), { name: String(flags.name), exact: true })
  }
  throw new Error('Pass --label, or both --role and --name, using the words in the feature file.')
}

async function handle(page, body) {
  if (body.cmd === 'ping') return { url: page.url() }
  if (body.cmd === 'open') {
    await page.goto(body.urlBase + body.path, { waitUntil: 'domcontentloaded' })
    return { url: page.url() }
  }
  if (body.cmd === 'click') {
    await locator(page, body).click({ timeout: 8000 })
    return { url: page.url() }
  }
  if (body.cmd === 'fill') {
    await locator(page, body).fill(String(body.value), { timeout: 8000 })
    return { url: page.url() }
  }
  if (body.cmd === 'select') {
    const box = locator(page, body)
    await box.locator(`option[value="${body.value}"]`).waitFor({ state: 'attached', timeout: 8000 })
    await box.selectOption(String(body.value))
    return { url: page.url() }
  }
  if (body.cmd === 'value') {
    const value = await locator(page, body).inputValue({ timeout: 8000 })
    return { value }
  }
  if (body.cmd === 'options') {
    const options = await locator(page, body).locator('option').allTextContents()
    return { options: options.map((item) => item.trim()).filter(Boolean) }
  }
  if (body.cmd === 'wait-text') {
    await page.waitForFunction((text) => document.body.innerText.includes(text), body.text, { timeout: 8000 })
    return { url: page.url() }
  }
  if (body.cmd === 'url') return { url: page.url() }
  if (body.cmd === 'screenshot') {
    const path = artifactPath(body.path)
    await page.screenshot({ path, fullPage: true })
    return { path }
  }
  if (body.cmd === 'snapshot') {
    const path = artifactPath(body.path)
    const tree = await page.locator('body').ariaSnapshot()
    writeFileSync(path, `${tree}\n`)
    return { path }
  }
  if (body.cmd === 'storage-get') {
    const value = await page.evaluate((key) => sessionStorage.getItem(key), body.key)
    if (value == null) throw new Error(`sessionStorage ${body.key} is empty. Log in through the page button first.`)
    return { value }
  }
  if (body.cmd === 'storage-absent') {
    const value = await page.evaluate((key) => sessionStorage.getItem(key), body.key)
    if (value != null) throw new Error(`sessionStorage ${body.key} is still set. Click 退出 before expecting it gone.`)
    return { absent: true }
  }
  throw new Error(`Unknown control command ${body.cmd}.`)
}

async function daemon(port) {
  const viteBin = join(demoDir, 'node_modules/vite/bin/vite.js')
  if (!existsSync(viteBin)) {
    logDaemon(`Missing ${viteBin}. Run: cd templates/demo && pnpm install`)
    process.exit(1)
  }
  mkdirSync(runDir, { recursive: true })
  const viteLog = join(runDir, 'vite.log')
  const logFd = openSync(viteLog, 'w')
  const vite = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: demoDir,
    stdio: ['ignore', logFd, logFd],
  })
  const url = `http://127.0.0.1:${port}`
  let browser
  let page
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/') {
      response.writeHead(404)
      response.end()
      return
    }
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
      if (body.cmd === 'shutdown') {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ ok: true }))
        setTimeout(() => {
          void shutdown(0)
        }, 20)
        return
      }
      const result = await handle(page, { ...body, urlBase: url })
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ ok: true, ...result }))
    } catch (err) {
      response.writeHead(400, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }))
    }
  })

  async function shutdown(code) {
    server.close()
    await browser?.close().catch(() => {})
    if (vite.exitCode == null) vite.kill('SIGTERM')
    process.exit(code)
  }

  try {
    await waitForHttp(`${url}/login`, 30000)
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
    const context = await browser.newContext()
    page = await context.newPage()
    page.on('dialog', (dialog) => {
      void dialog.dismiss()
    })
    await page.goto(`${url}/login`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: '登录', exact: true }).waitFor({ timeout: 15000 })
    await new Promise((resolvePromise, reject) => {
      server.listen(0, '127.0.0.1', () => resolvePromise())
      server.on('error', reject)
    })
    const controlPort = server.address().port
    writeState({
      status: 'ready',
      daemonPid: process.pid,
      vitePid: vite.pid,
      port,
      controlPort,
      url,
      runId: `${Date.now()}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err)
    logDaemon(message)
    await shutdown(1)
  }
}

async function callControl(command) {
  const state = readState()
  if (!state || state.status !== 'ready') {
    fail('No verification instance is ready. Run: node .cursor/skills/verify-dddfe/control.mjs launch')
  }
  let response
  try {
    response = await fetch(`http://127.0.0.1:${state.controlPort}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(command),
    })
  } catch (err) {
    fail(`Control port ${state.controlPort} did not answer (${err instanceof Error ? err.message : err}). Run stop, then launch.`)
  }
  const payload = await response.json()
  if (!payload.ok) fail(payload.error || 'control command failed')
  return payload
}

async function launch(port) {
  const existing = readState()
  if (existing && alive(existing.daemonPid)) {
    console.log(`${existing.url} already running (pid ${existing.daemonPid}). Refusing to start a second instance in this checkout.`)
    return
  }
  rmSync(runDir, { recursive: true, force: true })
  mkdirSync(runDir, { recursive: true })
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'daemon', '--port', String(port)], {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  const deadline = Date.now() + 40000
  while (Date.now() < deadline) {
    const state = readState()
    if (state?.status === 'ready' && alive(state.daemonPid)) {
      console.log(`ready ${state.url}`)
      return
    }
    if (!alive(child.pid) && !readState()) {
      const daemonLog = join(runDir, 'daemon.log')
      const detail = existsSync(daemonLog) ? readFileSync(daemonLog, 'utf8') : 'no daemon.log'
      fail(`Launch exited before ready.\n${detail}`)
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200))
  }
  fail(`Launch timed out. Read ${join(runDir, 'vite.log')}.`)
}

async function doctor() {
  const state = readState()
  if (!state) fail('doctor: no run state. Run launch first.')
  if (!alive(state.daemonPid)) fail(`doctor: daemon pid ${state.daemonPid} is not running. Run launch again.`)
  if (!alive(state.vitePid)) fail(`doctor: vite pid ${state.vitePid} is not running. Run stop, then launch.`)
  let response
  try {
    response = await fetch(`${state.url}/login`)
  } catch (err) {
    fail(`doctor: cannot reach ${state.url}/login (${err instanceof Error ? err.message : err}). Run stop, then launch.`)
  }
  const html = await response.text()
  if (!response.ok || !html.includes('id="root"') || !html.includes('<title>demo</title>')) {
    fail(`doctor: ${state.url}/login is not the demo shell.`)
  }
  const ping = await callControl({ cmd: 'ping' })
  console.log(`doctor ok ${state.url} vite=${state.vitePid} page=${ping.url}`)
}

async function stop() {
  const state = readState()
  if (!state) {
    rmSync(runDir, { recursive: true, force: true })
    console.log('stopped')
    return
  }
  if (alive(state.daemonPid)) {
    await fetch(`http://127.0.0.1:${state.controlPort}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cmd: 'shutdown' }),
    }).catch(() => {})
    const deadline = Date.now() + 5000
    while (Date.now() < deadline && (alive(state.daemonPid) || alive(state.vitePid))) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100))
    }
  }
  if (alive(state.vitePid)) process.kill(state.vitePid, 'SIGTERM')
  if (alive(state.daemonPid)) process.kill(state.daemonPid, 'SIGTERM')
  rmSync(runDir, { recursive: true, force: true })
  console.log('stopped')
}

const { positionals, flags } = parseArgs(process.argv.slice(2))
const [group, action] = positionals

if (group === 'daemon') {
  await daemon(Number(flags.port || 4173))
} else if (group === 'launch') {
  await launch(Number(flags.port || process.env.DDDFE_VERIFY_PORT || 4173))
} else if (group === 'doctor') {
  await doctor()
} else if (group === 'stop') {
  await stop()
} else if (group === 'browser' && action === 'open') {
  const result = await callControl({ cmd: 'open', path: positionals[2] })
  console.log(result.url)
} else if (group === 'browser' && action === 'click') {
  const result = await callControl({ cmd: 'click', role: flags.role, name: flags.name, label: flags.label })
  console.log(result.url)
} else if (group === 'browser' && action === 'fill') {
  const result = await callControl({ cmd: 'fill', label: flags.label, role: flags.role, name: flags.name, value: flags.value })
  console.log(result.url)
} else if (group === 'browser' && action === 'select') {
  const result = await callControl({ cmd: 'select', label: flags.label, value: flags.value })
  console.log(result.url)
} else if (group === 'browser' && action === 'value') {
  const result = await callControl({ cmd: 'value', label: flags.label })
  console.log(result.value)
} else if (group === 'browser' && action === 'options') {
  const result = await callControl({ cmd: 'options', label: flags.label })
  console.log(result.options.join('\n'))
} else if (group === 'browser' && action === 'wait-text') {
  const text = positionals.slice(2).join(' ')
  const result = await callControl({ cmd: 'wait-text', text })
  console.log(result.url)
} else if (group === 'browser' && action === 'url') {
  const result = await callControl({ cmd: 'url' })
  console.log(result.url)
} else if (group === 'browser' && action === 'screenshot') {
  const result = await callControl({ cmd: 'screenshot', path: flags.path })
  console.log(result.path)
} else if (group === 'browser' && action === 'snapshot') {
  const result = await callControl({ cmd: 'snapshot', path: flags.path })
  console.log(result.path)
} else if (group === 'storage' && action === 'get') {
  const result = await callControl({ cmd: 'storage-get', key: positionals[2] })
  console.log(result.value)
} else if (group === 'storage' && action === 'absent') {
  await callControl({ cmd: 'storage-absent', key: positionals[2] })
  console.log('absent')
} else {
  fail(`Usage:
  node .cursor/skills/verify-dddfe/control.mjs launch [--port 4173]
  node .cursor/skills/verify-dddfe/control.mjs doctor
  node .cursor/skills/verify-dddfe/control.mjs stop
  node .cursor/skills/verify-dddfe/control.mjs browser open /login
  node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "以 editor 登录"
  node .cursor/skills/verify-dddfe/control.mjs browser wait-text "订单 Form · DDD Demo"
  node .cursor/skills/verify-dddfe/control.mjs browser fill --label "数量" --value 3
  node .cursor/skills/verify-dddfe/control.mjs browser select --label "省" --value 浙江
  node .cursor/skills/verify-dddfe/control.mjs browser screenshot --path artifacts/login/order.png
  node .cursor/skills/verify-dddfe/control.mjs storage get dddfe.authJson`)
}
