# Why is this needed?

In production, it's easy to access D1 with Drizzle via Cloudflare bindings. However, during development, local scripting, or drizzle-kit, different mechanisms are needed to acquire access to the D1 database. This is illustrated in the table below

| Scenario                     | Solution provided or simplified by this package                      | Applicable to                 |
| ---------------------------- | -------------------------------------------------------------------- | ----------------------------- |
| server dev local db          | getPlatformProxy() to obtain miniflare binding                       |
| running scripts on local db  | getPlatformProxy() to obtain miniflare binding                       | drizzle-seed, any node script |
| running scripts on remote db | custom d1-http driver                                                | drizzle-seed, any node script |
| drizzle-kit on local db      | parse wrangler config and locate the miniflare sqlite file           | migrate, studio               |
| drizzle-kit on remote db     | parse wrangler config to get databaseId and format access credential | migrate, studio               |

# Installation

```
pnpm add -D @nerdfolio/drizzle-d1-helpers
```

# Usage

## d1-proxy driver
```typescript

```



```typescript
withLocalD1("DB", async (db) => {
   // do whatever you need with the db that is locally bound to "DB" in wrangler config
});
```

## Remote d1 scripting

```typescript
const { CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_D1_TOKEN: apiToken } =
   process.env;
const d1Credentials = {
   accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
   token: process.env.CLOUDFLARE_API_TOKEN,
   databaseId: D1Config.load("MY_D1").databaseId,
};

withProxyD1(d1Credentials, async (db) => {
   // do work on remote db
});
```

## D1 Credentials for drizzle-kit

`D1Config.load(D1_BINDING_NAME)` will load the corresponding d1 binding from wrangler config. If there
is only one D1 binding in the config, the argument can be left empty. This function returns a `D1Config` class instance.

With it, `d1Config.sqliteLocalFile` will give you a filename that looks like this `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/a9be733ec67eab6dbefcb5090b084c719daf1851f57b2901eda41a3e4683d794.sqlite`

The hash is generated in this package using the same hashing mechanism mentioned by [cloudflare here](https://github.com/cloudflare/miniflare/releases/tag/v3.20230918.0).

Similarly, `d1Config.databaseId` can be used to put together the remote credentials. You'll need to provide the accountId and apiToken yourself. Here is an example drizzle.config.ts

```typescript
export default defineConfig({
   out: "./drizzle/migrations",
   schema: "./drizzle/schema",
   dialect: "sqlite",
   ...getEnvConfig(),
});

function getEnvConfig() {
   if (process.env.NODE_ENV === "production") {
      return {
         driver: "d1-http",
         dbCredentials: {
            accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
            token: process.env.CLOUDFLARE_API_TOKEN,
            databaseId: D1Config.load("MY_D1").databaseId,
         },
      };
   }

   // else dev/local
   return {
      dbCredentials: {
         url: `file:${D1Config.load("MY_D1").sqliteLocalFile}`,
      },
   };
}
```

# Happy Coding!!
