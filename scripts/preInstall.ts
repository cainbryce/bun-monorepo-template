/**
 * @file scripts/preinstall.ts
 * @description performs pre install setup
 */
import { stderr, stdin, stdout } from "bun"
const _sw = stdout.writer({ highWaterMark: 512 })
const _se = stderr.writer({ highWaterMark: 512 })
const _si = stdin.writer({ highWaterMark: 512 })

const _rootPkg = (prompt(`Enter your root package name:`, "") ?? "").trim()

const _authorName = (
	prompt(`Enter your name for use as author:`, "") ?? ""
).trim()

_sw.write(`${_rootPkg}@${_authorName}`)
_se.write(`${_rootPkg}@${_authorName}`)
_si.write(`${_rootPkg}@${_authorName}`)
