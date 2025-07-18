import { drizzle as drizzleD1 } from "drizzle-orm/d1"
import { getPlatformProxy } from "wrangler"
import { drizzle as drizzleD1Proxy } from "@nerdfolio/drizzle-d1-proxy"

export type BoundD1 = ReturnType<typeof drizzleD1>
export type ProxyD1 = ReturnType<typeof drizzleD1Proxy>

export async function useLocalD1<Env>(bindingName: keyof Env, doWerk: (db: BoundD1) => Promise<void>, environment?: string) {
	const platform = await getPlatformProxy<Env>({environment})

	const binding = platform.env[bindingName]
	if (!binding) {
		throw new Error(`Could not find D1 binding: [${bindingName.toString()}]. Check your wrangler config file.`)
	}

	const db = drizzleD1(binding)
	await doWerk(db)
	await platform.dispose()
}

export async function useProxyD1(
	{ accountId, token, databaseId }: { accountId: string; token: string; databaseId: string },
	doWerk: (db: ProxyD1) => Promise<void>
) {
	const db = drizzleD1Proxy({ accountId, token, databaseId })
	await doWerk(db)
}
