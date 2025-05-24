# Why is this needed?

Facilitate access to d1 via drizzle sqlite proxy. As of May 2025, drizzle-kit has a `d1-http` driver option but it's not exported, thus not useable in typical drizzle-orm scenarios.

For simplicity, actual interaction with Cloudflare is done via cloudflare SDK

## Installation

```console

pnpm add @nerdfolio/drizzle-d1-proxy

```

## Usage

```typescript
import {drizzle as drizzleD1Proxy}

const db = drizzleD1Proxy({ accountId, token, databaseId })

// Then use db just like any other Drizzle Sqlite db

```
