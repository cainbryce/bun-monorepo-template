# bun-monorepo-template

### Use this template
This will create the template in your cwd
```bash
bun create cainbryce/bun-monorepo-template
```

### Adding monopkg-b as a dep to monopkg-a

```jsonc
//package.json
{
	"dependencies": {
		"pkgNameInMonoRepo": "workspaces:*",
		/** 
         workspaces:* resolves to the version defined in the target package's package.json
         "pkgNameInMonoRepo" would be the 'name' property defined in the target package's package.json
        */
	},
}
```
