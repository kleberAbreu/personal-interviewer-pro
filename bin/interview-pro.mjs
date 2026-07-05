#!/usr/bin/env node
import { createReadStream } from 'node:fs'
import { access, readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const distDir = resolve(projectRoot, 'dist')
const packageJsonPath = resolve(projectRoot, 'package.json')

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function printHelp() {
  console.log(`Personal Interviewer Pro

Usage:
  interview-pro [options]

Options:
  --host <host>    Host to bind. Default: 127.0.0.1
  --port <port>    Port to try first. Default: 4317
  --no-open        Do not open the browser automatically
  --version        Print the installed version
  -h, --help       Show this help
`)
}

function parseArgs(argv) {
  const options = {
    host: '127.0.0.1',
    port: Number(process.env.INTERVIEW_PRO_PORT || 4317),
    open: process.env.INTERVIEW_PRO_OPEN !== '0',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--version') {
      options.version = true
    } else if (arg === '--no-open') {
      options.open = false
    } else if (arg === '--host') {
      options.host = argv[++i]
    } else if (arg === '--port') {
      options.port = Number(argv[++i])
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }

  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error('Port must be a number between 1 and 65535.')
  }

  return options
}

async function readPackageVersion() {
  const raw = await readFile(packageJsonPath, 'utf8')
  return JSON.parse(raw).version
}

async function assertBuildExists() {
  try {
    await access(resolve(distDir, 'index.html'))
  } catch {
    throw new Error(
      `Build not found at ${distDir}.\nRun "npm run build" inside ${projectRoot}, or reinstall with the curl installer.`,
    )
  }
}

function toSafeFilePath(urlPathname) {
  const decodedPath = decodeURIComponent(urlPathname)
  const requestPath = decodedPath === '/' ? '/index.html' : decodedPath
  const filePath = resolve(distDir, `.${requestPath}`)
  const rel = relative(distDir, filePath)

  if (rel.startsWith('..') || isAbsolute(rel)) {
    return null
  }

  return filePath
}

async function resolveRequestPath(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  const filePath = toSafeFilePath(url.pathname)

  if (!filePath) {
    return { status: 403 }
  }

  try {
    const fileStat = await stat(filePath)
    if (fileStat.isFile()) {
      return { status: 200, filePath }
    }
  } catch {
    return { status: 200, filePath: resolve(distDir, 'index.html') }
  }

  return { status: 404 }
}

function writeError(res, status, message) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(message)
}

function createAppServer() {
  return createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      writeError(res, 405, 'Method not allowed')
      return
    }

    const result = await resolveRequestPath(req)

    if (result.status !== 200 || !result.filePath) {
      writeError(res, result.status, result.status === 403 ? 'Forbidden' : 'Not found')
      return
    }

    const ext = extname(result.filePath)
    const isIndex = result.filePath === resolve(distDir, 'index.html')

    res.writeHead(200, {
      'content-type': mimeTypes[ext] || 'application/octet-stream',
      'cache-control': isIndex ? 'no-cache' : 'public, max-age=31536000, immutable',
    })

    if (req.method === 'HEAD') {
      res.end()
      return
    }

    createReadStream(result.filePath).pipe(res)
  })
}

function listen(server, host, port) {
  return new Promise((resolveListen, rejectListen) => {
    const onError = (error) => {
      server.off('listening', onListening)
      rejectListen(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolveListen()
    }

    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })
}

async function startServer(host, preferredPort) {
  let lastError

  for (let port = preferredPort; port < preferredPort + 25 && port <= 65535; port += 1) {
    const server = createAppServer()

    try {
      await listen(server, host, port)
      return { server, port }
    } catch (error) {
      lastError = error
      if (error.code !== 'EADDRINUSE') {
        throw error
      }
    }
  }

  throw lastError || new Error('Could not start the local server.')
}

function openBrowser(url) {
  const commands = {
    darwin: ['open', [url]],
    linux: ['xdg-open', [url]],
    win32: ['cmd', ['/c', 'start', '', url]],
  }
  const command = commands[process.platform]

  if (!command) {
    return
  }

  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  if (options.version) {
    console.log(await readPackageVersion())
    return
  }

  await assertBuildExists()
  const { server, port } = await startServer(options.host, options.port)
  const url = `http://${options.host}:${port}`

  console.log(`Personal Interviewer Pro is running at ${url}`)
  console.log('Press Ctrl+C to stop.')

  if (options.open) {
    openBrowser(url)
  }

  const shutdown = () => {
    server.close(() => process.exit(0))
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error(`interview-pro: ${error.message}`)
  process.exit(1)
})
