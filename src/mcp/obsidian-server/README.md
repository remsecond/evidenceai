# Obsidian MCP Server

MCP server that bridges agents to an Obsidian vault via the
[Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)
community plugin.

## Scope

- Read/write access to vault notes for multi-agent cold start / continue.
- Stdio transport (matches sibling servers in `src/mcp/`).
- **No** Express routes, **no** custom indexing, **no** delete tool.

## Tool surface

| Tool            | Purpose                                                                                | Risk     |
| --------------- | -------------------------------------------------------------------------------------- | -------- |
| `health_check`  | Verify the bridge is reachable. Returns `{ ok: false, reason }` on failure (no throw). | None     |
| `list_notes`    | List a folder's children. `recursive: true` walks the subtree.                         | None     |
| `search_notes`  | Plain-text search across content + filenames.                                          | None     |
| `read_note`     | Read content, frontmatter, and stat (incl. mtime) for one note.                        | None     |
| `append_note`   | **Default write path.** Append to an existing note. Errors if missing.                 | Low      |
| `update_note`   | Full-content replacement. Requires explicit `mode`. Supports `expectedMtime` lock.     | **High** |

### Write policy

- For shared memory, ledgers, inbox files, and any append-only log:
  **use `append_note`**. It will not create files and will not clobber prior content.
- For deliberate full rewrites: use `update_note` with `mode="overwrite"` and pass
  `expectedMtime` from a prior `read_note` to detect concurrent edits.
- To create a new note: `update_note` with `mode="create_or_overwrite"`.
- `delete_note` is intentionally not implemented in v1.

## Setup

### 1. Install and configure the Local REST API plugin

In Obsidian:

1. Settings → Community plugins → Browse → install **Local REST API**.
2. Enable the plugin.
3. Open the plugin's settings:
   - Copy the **API key** (this is the bearer token).
   - Note the HTTPS port (default `27124`) and HTTP port (default `27123`, usually
     disabled).
4. Keep Obsidian running while agents need vault access.

### 2. Configure environment

| Variable                      | Required | Default                    | Notes                                                                |
| ----------------------------- | -------- | -------------------------- | -------------------------------------------------------------------- |
| `OBSIDIAN_REST_URL`           | yes      | —                          | e.g. `https://127.0.0.1:27124`                                       |
| `OBSIDIAN_REST_TOKEN`         | yes      | —                          | Bearer token from the plugin settings.                               |
| `OBSIDIAN_VAULT_NAME`         | no       | _(unset)_                  | Informational label only.                                            |
| `OBSIDIAN_DEFAULT_FOLDER`     | no       | `""` (vault root)          | Default folder for `list_notes` when caller omits one.               |
| `OBSIDIAN_INSECURE_TLS`       | no       | `false`                    | Set `true` to accept the plugin's self-signed cert (localhost dev).  |
| `OBSIDIAN_REQUEST_TIMEOUT_MS` | no       | `15000`                    | Per-request timeout.                                                 |

Add an `Obsidian Bridge` section to your `.env` (or shell export them) before
launching the server:

```
OBSIDIAN_REST_URL=https://127.0.0.1:27124
OBSIDIAN_REST_TOKEN=<paste-token-here>
OBSIDIAN_INSECURE_TLS=true
```

### 3. Build and run

```
cd src/mcp/obsidian-server
npm install
npm run build
npm start
```

The server speaks MCP over stdio. Wire it into your agent host the same way the
sibling `pdf-processor-server` and `google-sheets-server` are wired in.

## Testing

### Live round-trip (requires Obsidian running)

This script is intentionally manual — write it once you have Obsidian reachable.
Suggested sequence against a throwaway path like `_mcp-test/cold-start.md`:

1. `health_check` → expect `{ ok: true }`.
2. `update_note` with `mode: "create_or_overwrite"`, content `"# Cold start\n"` →
   expect `created: true`.
3. `read_note` on the same path → content matches; record `stat.mtime`.
4. `append_note` with `"## Appended\nhello\n"` → no error.
5. `read_note` again → content now contains the appended block.
6. `list_notes` with `folder: "_mcp-test"` → entries include `cold-start.md`.
7. `search_notes` for `"cold-start"` → at least one match including our path.
8. Manually edit the note in Obsidian, then call `update_note` with the **old**
   `expectedMtime` → expect a conflict error.

Pass criteria: 1–7 succeed, 8 fails with a conflict-style `McpError`.

Cleanup is manual (no `delete_note` tool in v1).

### Endpoint assumptions to verify on first live run

The client is implemented against the documented Local REST API shape but the
following are flagged as assumptions (see comments in `client.ts`):

| Capability         | Assumed shape                                         |
| ------------------ | ----------------------------------------------------- |
| Server info        | `GET /` → JSON with `service`, `versions`, `authenticated` |
| Read note          | `GET /vault/{path}` with `Accept: application/vnd.olrapi.note+json` |
| Replace/create     | `PUT /vault/{path}` with `Content-Type: text/markdown` |
| Append             | `POST /vault/{path}` with `Content-Type: text/markdown` |
| List folder        | `GET /vault/{folder}/` → `{ files: [...] }`           |
| Simple search      | `POST /search/simple/?query=&contextLength=`          |
| Auth               | `Authorization: Bearer <token>`                       |

If any of these differs in practice, the change is isolated to `client.ts`. The
tool surface in `tools.ts` and the wiring in `index.ts` should not need edits.

## File layout

```
src/mcp/obsidian-server/
├── package.json     # name: obsidian-mcp, MCP SDK + undici deps
├── tsconfig.json    # ES2020, strict, outDir build
├── index.ts         # Server class, stdio transport, env validation
├── client.ts        # HTTP client for Local REST API (assumptions documented)
├── tools.ts         # 6 tool definitions + dispatch
└── README.md
```
