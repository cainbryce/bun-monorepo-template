import { parseArgs } from "node:util"
import { resolve, relative } from "node:path"
import { existsSync, readdirSync, statSync } from "node:fs"

const { values, positionals } = parseArgs({
	args: Bun.argv.slice(2),
	options: { name: { type: "string", short: "n" } },
	allowPositionals: true,
})

let name = values.name ?? positionals[0]
if (!name) name = prompt("Package name >") ?? ""

if (!name) {
	console.error("No package name provided")
	process.exit(1)
}

const root = resolve(import.meta.dir, "..")
const pkgDir = resolve(root, "packages", name)

if (!existsSync(pkgDir)) {
	console.error(`Package "${name}" does not exist at packages/${name}`)
	process.exit(1)
}

const pkgJsonPath = resolve(pkgDir, "package.json")
const pkg = await Bun.file(pkgJsonPath)
	.json()
	.catch(() => null)

const files = readdirSync(pkgDir, { recursive: true }) as string[]
let totalSize = 0

const sourceFiles = files.filter((f) => {
	const full = resolve(pkgDir, f)
	const stat = statSync(full)
	if (!stat.isDirectory()) {
		totalSize += stat.size
		return true
	}
	return false
})

const srcFiles = sourceFiles.filter((f) => f.startsWith("src/"))
const testFiles = sourceFiles.filter((f) => f.startsWith("__tests__/"))
const typeFiles = sourceFiles.filter((f) => f.startsWith("types/"))

const entrypoint = resolve(pkgDir, "index.ts")
const buildImports: { path: string; kind: string; external: boolean }[] = []
const internalModules: string[] = []

if (existsSync(entrypoint)) {
	const build = await Bun.build({ entrypoints: [entrypoint], metafile: true })

	if (build.metafile) {
		for (const [inputPath, meta] of Object.entries(build.metafile.inputs)) {
			const rel = relative(root, resolve(pkgDir, inputPath))
			if (rel.startsWith("packages/" + name)) internalModules.push(rel)

			for (const imp of meta.imports) {
				buildImports.push({
					path: imp.path,
					kind: imp.kind,
					external: imp.external ?? false,
				})
			}
		}
	}
}

const externalImports = buildImports.filter((i) => i.external)
const localImports = buildImports.filter((i) => !i.external)

const exportLines: string[] = []
if (existsSync(entrypoint)) {
	const content = await Bun.file(entrypoint).text()
	for (const line of content.split("\n")) {
		if (line.startsWith("export")) exportLines.push(line.trim())
	}
}

const packagesDir = resolve(root, "packages")
const consumers: string[] = []
if (existsSync(packagesDir)) {
	for (const sibling of readdirSync(packagesDir)) {
		if (sibling === name) continue
		const siblingEntry = resolve(packagesDir, sibling, "index.ts")
		if (!existsSync(siblingEntry)) continue

		const siblingBuild = await Bun.build({
			entrypoints: [siblingEntry],
			metafile: true,
			external: ["*"],
		}).catch(() => null)

		if (!siblingBuild?.metafile) continue

		for (const meta of Object.values(siblingBuild.metafile.inputs)) {
			if (meta.imports.some((i) => i.path === pkg?.name)) {
				consumers.push(sibling)
				break
			}
		}
	}
}

const fmt = (bytes: number) => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

console.log(`\n┌─ ${name} ─────────────────────────────────`)
console.log(`│`)

if (pkg) {
	console.log(`│  name:       ${pkg.name}`)
	console.log(`│  version:    ${pkg.version}`)
	console.log(`│  module:     ${pkg.module ?? "—"}`)
	console.log(`│  types:      ${pkg.types ?? "—"}`)

	if (pkg.exports) {
		console.log(`│`)
		console.log(`│  exports:`)
		for (const [key, val] of Object.entries(pkg.exports))
			console.log(`│    ${key} → ${val}`)
	}

	if (pkg.dependencies && Object.keys(pkg.dependencies).length) {
		console.log(`│`)
		console.log(`│  dependencies:`)
		for (const [dep, ver] of Object.entries(pkg.dependencies))
			console.log(`│    ${dep}: ${ver}`)
	}

	if (pkg.devDependencies && Object.keys(pkg.devDependencies).length) {
		console.log(`│`)
		console.log(`│  devDependencies:`)
		for (const [dep, ver] of Object.entries(pkg.devDependencies))
			console.log(`│    ${dep}: ${ver}`)
	}

	if (pkg.peerDependencies && Object.keys(pkg.peerDependencies).length) {
		console.log(`│`)
		console.log(`│  peerDependencies:`)
		for (const [dep, ver] of Object.entries(pkg.peerDependencies))
			console.log(`│    ${dep}: ${ver}`)
	}
}

console.log(`│`)
console.log(`│  files:      ${sourceFiles.length} files, ${fmt(totalSize)}`)
console.log(`│    src/       ${srcFiles.length} file(s)`)
console.log(`│    types/     ${typeFiles.length} file(s)`)
console.log(`│    __tests__/ ${testFiles.length} file(s)`)

if (exportLines.length) {
	console.log(`│`)
	console.log(`│  barrel exports (index.ts):`)
	for (const line of exportLines) console.log(`│    ${line}`)
} else {
	console.log(`│`)
	console.log(`│  barrel exports: (empty)`)
}

console.log(`│`)
console.log(`│  build graph:`)
console.log(`│    internal modules: ${internalModules.length}`)
for (const m of internalModules) console.log(`│      ${m}`)

if (localImports.length) {
	console.log(`│    local imports: ${localImports.length}`)
	for (const i of localImports) console.log(`│      ${i.path} (${i.kind})`)
}

if (externalImports.length) {
	const unique = [...new Set(externalImports.map((i) => i.path))]
	console.log(`│    external imports: ${unique.length}`)
	for (const p of unique) console.log(`│      ${p}`)
}

if (!buildImports.length && !internalModules.length) {
	console.log(`│    (empty — no imports resolved)`)
}

if (consumers.length) {
	console.log(`│`)
	console.log(`│  consumed by:`)
	for (const c of consumers) console.log(`│    packages/${c}`)
} else {
	console.log(`│`)
	console.log(`│  consumed by: (none)`)
}

console.log(`│`)
console.log(`│  path: ${relative(root, pkgDir)}`)
console.log(`│`)
console.log(`└──────────────────────────────────────────`)
