import Cloudflare from "cloudflare"
import type { DatabaseQueryParams, DatabaseRawParams } from "cloudflare/resources/d1/database.mjs"
import type { DrizzleConfig } from "drizzle-orm"
import { drizzle as drizzleProxy } from "drizzle-orm/sqlite-proxy"

export type D1Credentials = {
	accountId: string
	databaseId: string
	token: string
}

export function drizzle<TSchema extends Record<string, unknown> = Record<string, never>>(
	{ accountId, token, databaseId }: D1Credentials,
	config?: DrizzleConfig<TSchema>
) {
	const d1Proxy = new D1Proxy({ accountId, apiToken: token })

	return drizzleProxy(async (sql, params, method) => {
		// https://orm.drizzle.team/docs/connect-drizzle-proxy says
		// Drizzle always waits for {rows: string[][]} or {rows: string[]} for the return value.
		// When the method is get, you should return a value as {rows: string[]}.
		// Otherwise, you should return {rows: string[][]}.
		//
		return method === "get" ? d1Proxy.query(databaseId, sql, params) : d1Proxy.rawQuery(databaseId, sql, params)
	}, config)
}

class D1Proxy {
	#cf: Cloudflare
	#accountId: string

	constructor({ accountId, apiToken }: { accountId: string; apiToken: string }) {
		this.#cf = new Cloudflare({ apiToken })
		this.#accountId = accountId
	}

	get d1() {
		return this.#cf.d1.database
	}

	async rawQuery(databaseId: string, sql: string, params: DatabaseRawParams["params"]) {
		const {
			result: [page],
		} = await this.d1.raw(databaseId, { account_id: this.#accountId, sql, params })

		// the "raw" endpoint is optimized to to return entries as array
		// raw results is an object of {columns?: [], rows?: [][]}. We reformat it here to make "rows" non-optional
		return {
			columns: page.results?.columns,
			rows: page.results?.rows ?? [],
		}
	}

	async query(databaseId: string, sql: string, params: DatabaseQueryParams["params"]) {
		const {
			result: [page],
		} = await this.d1.query(databaseId, { account_id: this.#accountId, sql, params })

		// query results is an array of objects. Here we wrap it with {rows: []}
		return { rows: page.results ?? [] }
	}
}
