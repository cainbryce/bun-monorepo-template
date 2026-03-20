import { parseArgs } from "node:util"
import { resolve } from "node:path"
import { rm } from "node:fs/promises"
import { existsSync, readdirSync } from "node:fs"

const { values, positionals } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		name: { type: "string", short: "n" },
		force: { type: "boolean", short: "f" },
	},
	allowPositionals: true,
})

let name = values.name ?? positionals[0]
if (!name) name = prompt("Package name to delete >") ?? ""

if (!name) {
	console.error("No package name provided")
	process.exit(1)
}

const pkgDir = resolve(import.meta.dir, "../packages", name)

if (!existsSync(pkgDir)) {
	console.error(`Package "${name}" does not exist at packages/${name}`)
	process.exit(1)
}

if (!values.force) {
	const contents = readdirSync(pkgDir, { recursive: true }) as string[]
	console.log(`\nPackage "${name}" contains ${contents.length} file(s):`)
	for (const f of contents) console.log(`  ${f}`)

	const confirm = prompt(
		`\nDelete packages/${name}? This cannot be undone. (y/N) >`
	)
	if (confirm?.toLowerCase() !== "y") {
		console.log("Aborted")
		process.exit(0)
	}
}

await rm(pkgDir, { recursive: true, force: true })
console.log(`✓ Deleted packages/${name}`)
