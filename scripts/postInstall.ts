/**
 * @file scripts/postInstall.ts
 */
for (const _f of new Bun.Glob("**/**/*").scanSync()) {
	console.info(_f)
}
