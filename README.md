[![npm version](https://img.shields.io/npm/v/@itrocks/sql-functions?logo=npm)](https://www.npmjs.org/package/@itrocks/sql-functions)
[![npm downloads](https://img.shields.io/npm/dm/@itrocks/sql-functions)](https://www.npmjs.org/package/@itrocks/sql-functions)
[![GitHub](https://img.shields.io/github/last-commit/itrocks-ts/sql-functions?color=2dba4e&label=commit&logo=github)](https://github.com/itrocks-ts/sql-functions)
[![issues](https://img.shields.io/github/issues/itrocks-ts/sql-functions)](https://github.com/itrocks-ts/sql-functions/issues)
[![discord](https://img.shields.io/discord/1314141024020467782?color=7289da&label=discord&logo=discord&logoColor=white)](https://25.re/ditr)

# sql-functions

Library of SQL functions mapping logical expressions to SQL syntax.

*This documentation was written by an artificial intelligence and may contain errors or approximations.
It has not yet been fully reviewed by a human. If anything seems unclear or incomplete,
please feel free to contact the author of this package.*

## Installation

```bash
npm i @itrocks/sql-functions
```

## Usage

`@itrocks/sql-functions` provides a tiny abstraction to represent logical
comparisons ("equal to", "greater than", "LIKE", …) as objects that can then
be converted into SQL fragments and bound values.

Each helper (`equal`, `greater`, `lessOrEqual`, `like`, …) simply returns a
`SqlFunction` describing one comparison, with:

- a human‑readable `name` (for logging / debugging),
- an `sql` fragment such as `" = ?"` or `" LIKE ?"`,
- and the corresponding comparison `value`.

Typically, you do **not** execute SQL directly with this package. Instead, you
plug the returned `SqlFunction` objects into your own query‑builder utilities
or ORM, which know how to combine several comparisons into a full
`WHERE` clause.

### Minimal example

```ts
import { equal } from '@itrocks/sql-functions'

// Build a simple equality condition on a column
const condition = equal('john.doe@example.com')

console.log(condition.name) // "equal"
console.log(condition.sql)  // " = ?"
console.log(condition.value) // "john.doe@example.com"

// A very small helper to format a WHERE clause
function buildWhere (column: string, fn: typeof condition) {
  return {
    sql: `${column}${fn.sql}`,
    values: [fn.value]
  }
}

const where = buildWhere('user.email', condition)
// where.sql    => "user.email = ?"
// where.values => ["john.doe@example.com"]
```

### Complete example: dynamic filters

The library becomes useful as soon as you need to build dynamic `WHERE`
clauses depending on user input.

```ts
import {
  equal,
  greaterOrEqual,
  like,
  type SqlFunction
} from '@itrocks/sql-functions'
import type { Pool } from 'mysql2/promise'

type UserFilter = {
  email?: string
  nameContains?: string
  minCreatedAt?: Date
}

type WherePart = {
  sql: string
  value: any
}

function toWhereParts (filter: UserFilter): WherePart[] {
  const parts: WherePart[] = []

  if (filter.email) {
    const fn = equal(filter.email)
    parts.push({ sql: `user.email${fn.sql}`, value: fn.value })
  }

  if (filter.nameContains) {
    const fn = like(`%${filter.nameContains}%`)
    parts.push({ sql: `user.name${fn.sql}`, value: fn.value })
  }

  if (filter.minCreatedAt) {
    const fn = greaterOrEqual(filter.minCreatedAt)
    parts.push({ sql: `user.created_at${fn.sql}`, value: fn.value })
  }

  return parts
}

function joinWhere (parts: WherePart[]): { sql: string; values: any[] } {
  if (!parts.length) return { sql: '', values: [] }

  const sql = 'WHERE ' + parts.map(p => p.sql).join(' AND ')
  const values = parts.map(p => p.value)

  return { sql, values }
}

export async function findUsers (db: Pool, filter: UserFilter) {
  const whereParts = toWhereParts(filter)
  const where = joinWhere(whereParts)

  const sql = `
    SELECT id, email, name, created_at
    FROM user
    ${where.sql}
    ORDER BY created_at DESC
  `

  const [rows] = await db.query(sql, where.values)
  return rows
}
```

In this example:

- `equal`, `like` and `greaterOrEqual` create small `SqlFunction` objects.
- Your own helper functions unwrap them into SQL fragments and values.
- You keep SQL safe and parameterized, while keeping the comparison logic
  readable and testable.

## API

### `class SqlFunction`

Represents a single SQL comparison (operator + value).

```ts
class SqlFunction {
  name: string
  sql: string
  value: any

  constructor(name: string, sql: string, value: any)
}
```

#### Properties

- `name: string` – Name of the logical operation. For instances created via the
  helpers, this matches the helper name (`"equal"`, `"greater"`, …). This is
  mostly useful for debugging, logging or introspection.
- `sql: string` – SQL comparison fragment, always starting with a space and
  containing a single positional placeholder: one of `" = ?"`, `" > ?"`,
  `" >= ?"`, `" < ?"`, `" <= ?"` or `" LIKE ?"`.
- `value: any` – The comparison value to bind to the placeholder when you
  execute your SQL.

#### Constructor

```ts
constructor(name: string, sql: string, value: any)
```

You rarely call the constructor directly; instead, you use one of the helper
functions below to avoid repeating the SQL fragments.

### Helper functions

All helpers take a single `value: any` and return a new `SqlFunction`. The
`name` property is set to the helper function name, and the `sql` property is
set to the corresponding operator + placeholder.

#### `equal(value: any): SqlFunction`

Creates a `SqlFunction` representing an equality comparison: `column = ?`.

Typical usage:

```ts
const fn = equal(42)
// fn.name === 'equal'
// fn.sql  === ' = ?'
// fn.value === 42
```

#### `greater(value: any): SqlFunction`

Creates a `SqlFunction` representing a strict "greater than" comparison:
`column > ?`.

#### `greaterOrEqual(value: any): SqlFunction`

Creates a `SqlFunction` representing a `>=` comparison: `column >= ?`.

#### `less(value: any): SqlFunction`

Creates a `SqlFunction` representing a strict "less than" comparison:
`column < ?`.

#### `lessOrEqual(value: any): SqlFunction`

Creates a `SqlFunction` representing a `<=` comparison: `column <= ?`.

#### `like(value: any): SqlFunction`

Creates a `SqlFunction` representing a `LIKE` comparison: `column LIKE ?`.

You are responsible for adding any wildcards (`%`, `_`, …) to `value` if you
need them (for example `like('%john%')`).

## Typical use cases

- **Dynamic search filters** – Convert optional user filters (form fields,
  API query parameters) into comparison objects, and then into a parameterized
  `WHERE` clause.
- **Query builder internals** – Use `SqlFunction` as an internal
  representation of comparisons in a small query builder, then generate raw
  SQL + bound values from it.
- **Reusable comparison logic** – Wrap common filters ("active users",
  "created in the last 30 days", …) in small functions that return
  preconfigured `SqlFunction` instances.
- **Safer string concatenation** – Avoid building SQL with interpolated
  values; replace them with reusable comparison helpers that always return a
  fragment + placeholder + value tuple.
