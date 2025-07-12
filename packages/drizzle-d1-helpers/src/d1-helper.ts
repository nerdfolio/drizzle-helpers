import crypto from "node:crypto"
import { existsSync } from "node:fs"
import path from "node:path"
import { unstable_readConfig } from "wrangler"
import { useLocalD1, useProxyD1 } from "./use-helpers"

export type { BoundD1, ProxyD1 } from "./use-helpers"

type D1HelperOpts = {environment?: string}
export class D1Helper {
	#requestedBinding: string
	#cfg?: ReturnType<typeof loadRawD1Config>
	#environment?: string

	#cfAccountId?: string
	#cfToken?: string
	#persistToDir?: string // accomodate getPlatformProxy's persistTo  or wrangler cli's --persist-to

	private constructor(binding = "", opts?: D1HelperOpts) {
		// save binding name for lazy config loading later
		// because not all usecases require explicit config file loading
		this.#requestedBinding = binding
		this.#environment = opts?.environment;
	}

	static get(bindingName?: string, opts?: D1HelperOpts) {
		return new D1Helper(bindingName, opts)
	}

	get #c() {
		if (!this.#cfg) {
			this.#cfg = loadRawD1Config(this.#requestedBinding, this.#environment)
		}
		return this.#cfg
	}

	get binding() {
		return this.#requestedBinding || this.#c.binding
	}

	get localDatabaseId() {
		return this.#c.preview_database_id || this.#c.database_id || ""
	}

	get databaseId() {
		return this.#c.database_id ?? ""
	}

	get migrationsDir() {
		return this.#c.migrations_dir ?? ""
	}

	get migrationsTable() {
		return this.#c.migrations_table ?? ""
	}

	get wranglerStateDir() {
		// if persistToDir is set, use that,
		// otherwise use default location relative to wrangler config file
		// NOTE: https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy says
		// wrangler adds a /v3 suffix to dir whereas getPlatformProxy uses persistTo directly
		return this.#persistToDir ?? path.relative(".", path.join(this.#c.wranglerConfigDir ?? "", ".wrangler/state/v3"))
	}

	get sqliteLocalFile() {
		const uniqueKey = "miniflare-D1DatabaseObject" as const
		const miniflarePath = `${this.wranglerStateDir}/d1/${uniqueKey}`
		const hash = durableObjectNamespaceIdFromName(uniqueKey, this.localDatabaseId)
		const filename = path.join(miniflarePath, `${hash}.sqlite`)

		if (!existsSync(filename)) {
			throw new Error(`Could not find Sqlite file: [${filename}] for databaseId [${this.localDatabaseId}]`)
		}

		return filename
	}

	withCfCredentials(accountId: string | undefined, token: string | undefined) {
		if (!accountId || accountId.trim() === "") {
			throw new Error("cloudflare accountId is empty. Check your env vars.")
		}

		if (!token || token.trim() === "") {
			throw new Error("cloudflare d1Token is empty. Check your env vars.")
		}

		const copy = new D1Helper(this.binding)
		Object.assign(copy, this)

		copy.#cfAccountId = accountId
		copy.#cfToken = token

		return copy
	}

	withPersistTo(persistTo: string) {
		const copy = new D1Helper(this.binding)
		Object.assign(copy, this)
		copy.#persistToDir = persistTo
		return copy
	}

	get proxyCredentials() {
		if (!this.#cfAccountId || !this.#cfToken) {
			throw new Error("cloudflare accountId and/or cloudflare d1Token not set. Call .setCfCredentials() first.")
		}

		return {
			accountId: this.#cfAccountId,
			token: this.#cfToken,
			databaseId: this.localDatabaseId
		}
	}

	get sqliteLocalFileCredentials() {
		// NOTE 5/15/2025: currently this is only used by drizzle-kit.
		// Local scripts use bindings from getPlatformProxy()
		//
		return {
			url: `file:${this.sqliteLocalFile}`,
		}
	}

	async useLocalD1<Env>(doWerk: Parameters<typeof useLocalD1>[1]) {
		return useLocalD1(this.binding as keyof Env, doWerk)
	}

	async useProxyD1(doWerk: Parameters<typeof useProxyD1>[1]
	) {
		return useProxyD1(this.proxyCredentials, doWerk)
	}
}


function loadRawD1Config(bindingName?: string, environment?: string) {
	const fullCfg = unstable_readConfig({env: environment})
	const { d1_databases, configPath } = fullCfg

	if (!bindingName && d1_databases.length > 1) {
		throw new Error("There are more than one D1 database in wrangler config. Please specify which.")
	}

	// find and return the specified binding
	const config = (!bindingName && d1_databases.length === 1) ?
		d1_databases[0] :
		d1_databases.find((d1: { binding: string }) => d1.binding === bindingName)

	if (!config) {
		throw new Error(`Could not find wrangler config for D1 binding: [${bindingName}]`)
	}

	return { ...config, wranglerConfigDir: configPath ? path.dirname(configPath) : undefined }
}

function durableObjectNamespaceIdFromName(uniqueKey: string, name: string) {
	// In v3.2, miniflare uses durable object to implement D1 and hashes the local sqlite filename.
	// See the following for more context:
	// https://github.com/cloudflare/workers-sdk/issues/4548 (understand the hash of the local D1 filename)
	// https://github.com/cloudflare/miniflare/releases/tag/v3.20230918.0
	//
	// This function is copied from these links
	//
	const key = crypto.createHash("sha256").update(uniqueKey).digest()
	const nameHmac = crypto.createHmac("sha256", key).update(name).digest().subarray(0, 16)
	const hmac = crypto.createHmac("sha256", key).update(nameHmac).digest().subarray(0, 16)
	return Buffer.concat([nameHmac, hmac]).toString("hex")
}
