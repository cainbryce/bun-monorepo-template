import { parseArgs } from "node:util"
import { resolve } from "node:path"

const { values, positionals } = parseArgs({
	args: Bun.argv.slice(2),
	options: { name: { type: "string", short: "n" } },
	allowPositionals: true,
})

let name = values.name ?? positionals[0]
if (!name) name = prompt("Please provide a package name >") ?? "noname"

const pkgDir = resolve(import.meta.dir, "../packages", name)

if (await Bun.file(resolve(pkgDir, "package.json")).exists()) {
	console.error(`Package "${name}" already exists at packages/${name}`)
	process.exit(1)
}

const packageJson = {
	name: `${name}`,
	version: "0.0.1",
	module: "index.ts",
	type: "module",
	types: "types/index.d.ts",
	exports: { ".": "./index.ts", "./types": "./types/index.d.ts" },
}

const devDependencies: Record<string, string> = {}

const addNode = prompt("Add @types/node? (y/N) >")
if (addNode?.toLowerCase() === "y") devDependencies["@types/node"] = "latest"

const addBun = prompt("Add @types/bun? (y/N) >")
if (addBun?.toLowerCase() === "y") devDependencies["@types/bun"] = "latest"

const dependencies: Record<string, string> = {}

const additional = prompt(
	"Additional deps? (comma separated, prefix dev_ or dep_) >"
)

if (additional?.trim()) {
	const entries = additional
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)

	const results = await Promise.all(
		entries.map(async (entry) => {
			const isDev = entry.startsWith("dev_")
			const isDep = entry.startsWith("dep_")
			const pkg =
				isDev ? entry.slice(4)
				: isDep ? entry.slice(4)
				: entry

			const res = await fetch(`https://registry.npmjs.org/${pkg}`, {
				method: "HEAD",
			}).catch(() => null)

			if (!res || res.status === 404) {
				console.warn(`  ⚠ "${pkg}" not found on npm, skipping`)
				return null
			}

			return { pkg, isDev: isDev || !isDep }
		})
	)

	for (const r of results) {
		if (!r) continue
		if (r.isDev) devDependencies[r.pkg] = "latest"
		else dependencies[r.pkg] = "latest"
	}
}

if (Object.keys(dependencies).length)
	(packageJson as Record<string, unknown>)["dependencies"] = dependencies

if (Object.keys(devDependencies).length)
	(packageJson as Record<string, unknown>)["devDependencies"] =
		devDependencies

const indexTs = ``

const srcIndex = ``

const indexTypes = ``

const testFile = `import { test, expect } from "bun:test"

test("${name}: placeholder", () => {
	expect(true).toBe(true)
})
`

const bunfig = `[test]
root = "./__tests__"
`

const tsconfig = `{
	"extends": "../../tsconfig.json",
	"include": ["src", "types", "__tests__"]
}
`

const readme = `# ${name}\n`

const write = (path: string, data: string) =>
	Bun.write(resolve(pkgDir, path), data, { createPath: true }).then(() =>
		console.log(`  -> packages/${name}/${path}`)
	)

await Promise.all([
	write("package.json", JSON.stringify(packageJson, null, "\t") + "\n"),
	write("index.ts", indexTs),
	write("src/index.ts", srcIndex),
	write("types/index.d.ts", indexTypes),
	write("__tests__/index.test.ts", testFile),
	write("bunfig.toml", bunfig),
	write("tsconfig.json", tsconfig),
	write("README.md", readme),
])

console.log(`\n✓ packages/${name} created`)
