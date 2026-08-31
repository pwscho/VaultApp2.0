import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const root = path.resolve("out")

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full)
  }
  return files
}

const htmlFiles = await walk(root)
let changed = 0

for (const file of htmlFiles) {
  const before = await readFile(file, "utf8")
  const after = before.replace(/\s+crossorigin=""/g, "")
  if (after !== before) {
    await writeFile(file, after)
    changed++
  }
}

console.log(`strip-crossorigin: updated ${changed} html file(s) in ${root}`)
