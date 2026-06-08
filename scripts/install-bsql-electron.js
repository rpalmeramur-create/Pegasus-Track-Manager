/**
 * Downloads the better-sqlite3 prebuilt for Electron after npm install.
 * Needed because better-sqlite3 is a native module compiled for Node.js;
 * we swap in the Electron-specific binary so the Electron main process can load it.
 */
const https = require('https')
const fs    = require('fs')
const path  = require('path')
const { execSync } = require('child_process')
const os = require('os')

const BSQL_VERSION  = '12.10.0'
const ELECTRON_ABI  = '130'   // Electron 33.x
const PLATFORM      = 'win32'
const ARCH          = 'x64'

const fileName = `better-sqlite3-v${BSQL_VERSION}-electron-v${ELECTRON_ABI}-${PLATFORM}-${ARCH}.tar.gz`
const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BSQL_VERSION}/${fileName}`
const tmpFile = path.join(os.tmpdir(), fileName)
const extractDir = path.join(os.tmpdir(), 'bsql-electron-extract')
const destDir  = path.join(__dirname, '..', 'node_modules', 'better-sqlite3', 'build', 'Release')
const destFile = path.join(destDir, 'better_sqlite3.node')

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    function get(u) {
      https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location)
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
        res.pipe(file)
        file.on('finish', () => file.close(resolve))
      }).on('error', reject)
    }
    get(url)
  })
}

;(async () => {
  if (fs.existsSync(destFile)) {
    console.log('better-sqlite3 Electron prebuilt already in place.')
    return
  }
  console.log('Installing better-sqlite3 Electron prebuilt...')
  fs.mkdirSync(destDir, { recursive: true })
  fs.mkdirSync(extractDir, { recursive: true })
  await download(url, tmpFile)
  execSync(`tar -xzf "${tmpFile}" -C "${extractDir}"`)
  fs.copyFileSync(path.join(extractDir, 'build', 'Release', 'better_sqlite3.node'), destFile)
  fs.rmSync(tmpFile, { force: true })
  fs.rmSync(extractDir, { recursive: true, force: true })
  console.log('better-sqlite3 Electron prebuilt installed.')
})().catch(e => {
  console.warn('Warning: could not install better-sqlite3 Electron prebuilt:', e.message)
  console.warn('Run scripts/install-bsql-electron.js manually if Electron cannot load the database.')
})
