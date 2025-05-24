import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/d1proxy.ts'],
	splitting: false,
	target: "node22",
	format: ["esm"],
	dts: true,
	clean: true,
	outExtension({ format }) {
		return { js: (format === "esm" ? ".mjs" : ".js") }
	},
})