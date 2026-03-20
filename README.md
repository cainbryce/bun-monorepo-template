# bun-monorepo-template

## What is this
This is a mono repo template specifically tailored for the bun eco system
Please do not use this yet, it's a work in progress and will not work. :)

### Use this template (don't)
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
