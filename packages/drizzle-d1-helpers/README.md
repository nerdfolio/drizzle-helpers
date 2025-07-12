# drizzle-d1-helpers

## Why is this needed?

In production, it's easy to access D1 with Drizzle via Cloudflare bindings. However, during development, local scripting, or drizzle-kit, different mechanisms are needed to acquire access to the D1 database. This is illustrated in the table below

| Scenario                     | Solution provided or simplified by this package                      | Applicable to                 |
| ---------------------------- | -------------------------------------------------------------------- | ----------------------------- |
| server dev local db          | getPlatformProxy() to obtain miniflare binding                       |
| running scripts on local db  | getPlatformProxy() to obtain miniflare binding                       | drizzle-seed, any node script |
| running scripts on remote db | custom d1-http driver                                                | drizzle-seed, any node script |
| drizzle-kit on local db      | parse wrangler config and locate the miniflare sqlite file           | migrate, studio               |
| drizzle-kit on remote db     | parse wrangler config to get databaseId and format access credential | migrate, studio               |

## Installation

```console

pnpm add -D @nerdfolio/drizzle-d1-helpers

```

# Usage

## Obtain a D1Helper for a particular D1 binding

```typescript
import { D1Helper } from "@nerdfolio/drizzle-d1-helpers";

const helper = D1Helper.get("MY_D1_DB");

// If you only have 1 D1 binding in your wrangler config, you don't
// have to specify it's name.
// If you have more than 1 binding, this code will throw

const helper2 = D1Helper.get();


// If you have bindings defined for a specific worker environment

const developmentEnvHelper = D1Helper.get("MY_D1_DB", {environment: "development"})
```

## Get proxy credentials

```typescript
console.log(
   D1Helper.get(MY_D1_BINDING).withCfCredentials(
      process.env.CLOUDFLARE_ACCOUNT_ID,
      process.env.CLOUDFLARE_D1_TOKEN
   ).proxyCredentials
);

//
// {accountId: "....", token: "....", databaseId: "..."}
//
```

## Get local sqlite file or credentials

```typescript
console.log(D1Helper.get().sqliteLocalFileCredentials);

// {url: "file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/a8bef33e667eba6dbefcb5090b02c4719daf1851f75b3901eda4b71e462fa5d2.sqlite"}

// If you use `wrangler dev` with the `--persist-to` dir, this info lives out side of
// wrangler config, so you must set it in order for D1Helper to calculate the local
// file path correctly

console.log(D1Helper.get().withPersistTo("my-wrangler-path")).sqliteLocalFile;

// my-wrangler-path/d1/miniflare-D1DatabaseObject/a8bef33e667eba6dbefcb5090b02c4719daf1851f75b3901eda4b71e462fa5d2.sqlite
//
```

## Acquire d1 and run an async function with it

```typescript
// Using D1Helper for proxy d1
D1Helper.get()
   .withCfCredentials(
      process.env.CLOUDFLARE_ACCOUNT_ID,
      process.env.CLOUDFLARE_D1_TOKEN
   )
   .useProxyD1(async (db) => {
      // run some code with db
   });

// Using D1Helper for local sqlite d1
D1Helper.get().useLocalD1(async (db) => {
   // run some code with db
});

// There are also useProxyD1 and useLocalD1
useProxyD1({ accoundId, token, databaseId }, async () => {
   // do work
});

useLocalD1("MY_D1", async (db) => {
   // do work
});
```

# Happy Coding!