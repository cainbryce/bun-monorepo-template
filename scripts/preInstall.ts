/**
 * @file scripts/preInstall.ts
 * @description configures package.json before bun install runs
 */
import { resolve } from "node:path"
import { write, file } from "bun"
const root = resolve(import.meta.dir, "..") //resolve top level dir
const pkgPath = resolve(root, "package.json") //resolve the pkg json path
const pkg = await file(pkgPath).json() //aquire the root pkg file

const name =
	prompt("Package name:", pkg.name) ??
	pkg.name /** grab the package name for your root */
const author =
	prompt("Author:", pkg.author) ??
	"" /** grab the author value you want set for root and new modules */
const repoUrl = prompt("Repository URL:", pkg.repository?.url ?? "") ?? ""
/**
 * repo url. by default this value will appended to author
 * ideally formatted to username/reponame
 * ex cainbryce/bun-monorepo-template
 */
const isPrivate =
	prompt("Private package? (y/N):", "y")?.toLowerCase() ===
	"y" /** if the property private should be set to true or false. This prevents NPM publishing by accident */

pkg.name = name
pkg.author = author
pkg.private = isPrivate

if (repoUrl) {
	pkg.repository = { type: "git", url: repoUrl, directory: "." } //sets pkg property "repository" with values
} else {
	delete pkg.repository //removes if no repourl
}

await write(pkgPath, JSON.stringify(pkg, null, "\t") + "\n") //property and new line delimited pkg json
	.catch((e) => console.error(e))
	.then((r) => r)
