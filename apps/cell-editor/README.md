# Cell Editor

Standalone layered electrochemical cell editor built on `@pascal-app/{core,viewer,editor}`.

## Run locally

```bash
bun install
cd apps/cell-editor
bun dev
```

Open [http://localhost:3004](http://localhost:3004).

## Tests

```bash
cd apps/cell-editor
bun test
```

## Domain docs

- [CONTEXT.md](./CONTEXT.md) — vocabulary and v0.1 scope
- [docs/adr/](./docs/adr/) — architecture decisions

Default scene values live in `src/lib/defaults.ts` and can be replaced with your `CellDesign` reference numbers.
