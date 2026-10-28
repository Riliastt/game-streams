import { createWriteStream, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { join, relative } from 'node:path'
import { cwd } from 'node:process'
import archiver from 'archiver'

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, files)
    else files.push(p)
  }
  return files
}

const root = cwd()
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html missing. Run npm run build first.')
  process.exit(1)
}

const outPath = join(root, 'game-streams-yandex.zip')
if (existsSync(outPath)) unlinkSync(outPath)

const output = createWriteStream(outPath)
const archive = archiver('zip', { zlib: { level: 9 } })

archive.on('error', (err) => {
  throw err
})

const done = new Promise((resolve, reject) => {
  output.on('close', resolve)
  archive.on('error', reject)
})

archive.pipe(output)

for (const file of walk(dist)) {
  const name = relative(dist, file).replaceAll('\\', '/')
  // Platform serves real /sdk.js; keep local mock out of production zip
  if (name === 'sdk.js') continue
  // Store promo assets are for console upload only — not part of the game build
  if (name === 'art/store' || name.startsWith('art/store/')) continue
  archive.file(file, { name })
}

await archive.finalize()
await done
console.log(`Created ${outPath} (${archive.pointer()} bytes)`)
