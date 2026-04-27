// MCP tool definitions and dispatch for the Obsidian bridge.
//
// Six tools, deliberately minimal:
//   health_check, list_notes, search_notes, read_note, append_note, update_note
//
// Write policy:
//   - append_note is the DEFAULT write path for shared memory / ledger / inbox
//     files. It refuses to create missing files (errors instead).
//   - update_note exists for full-content replacement and is HIGHER RISK.
//     It is opt-in via an explicit `mode` and supports `expectedMtime` for
//     optimistic concurrency control.
//
// delete_note is intentionally NOT implemented in v1.

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { ObsidianClient, ObsidianClientError } from './client.js';

export const toolDefinitions = [
  {
    name: 'health_check',
    description:
      'Check the Obsidian Local REST API bridge. Returns connection status and server info. Never throws on auth/connection failure; returns { ok: false, reason } so callers can self-diagnose at cold start.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'list_notes',
    description:
      'List notes and subfolders within a vault folder. Pass folder="" or omit for the vault root. Set recursive=true to flatten the entire subtree (use sparingly on large vaults).',
    inputSchema: {
      type: 'object',
      properties: {
        folder: {
          type: 'string',
          description: 'Vault-relative folder path. Empty string or omitted = vault root.',
        },
        recursive: {
          type: 'boolean',
          description: 'If true, walks subfolders client-side and returns a flat list.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'search_notes',
    description:
      'Plain-text search across vault content and filenames. Returns matched paths with optional snippets. Use this before reading to avoid loading the wrong note.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Plain-text query. Required.' },
        limit: {
          type: 'number',
          description: 'Maximum number of matches to return. Default 25.',
        },
        contextLength: {
          type: 'number',
          description: 'Characters of context to include around each match snippet. Default 100.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'read_note',
    description:
      'Read a single note by vault-relative path. Returns content, frontmatter, and stat (mtime, size). Use mtime as expectedMtime for safe update_note calls.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Vault-relative note path, e.g. "inbox/2026-04-27.md".',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'append_note',
    description:
      'PREFERRED write path for shared memory, ledgers, and inbox files. Appends to the END of an existing note. Errors if the note does not exist (will not create). Use update_note with mode="create_or_overwrite" to create.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Vault-relative note path.' },
        content: { type: 'string', description: 'Markdown content to append.' },
        ensureNewline: {
          type: 'boolean',
          description:
            'If true (default), prepends a newline when the existing file does not end with one.',
        },
      },
      required: ['path', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_note',
    description:
      'HIGHER-RISK full-content replacement. Always prefer append_note for shared/ledger files. Requires explicit mode. Pass expectedMtime (from a prior read_note) to fail fast on concurrent edits.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Vault-relative note path.' },
        content: { type: 'string', description: 'Full new markdown content.' },
        mode: {
          type: 'string',
          enum: ['overwrite', 'create_or_overwrite'],
          description:
            '"overwrite" requires the note to exist. "create_or_overwrite" creates if missing.',
        },
        expectedMtime: {
          type: 'number',
          description:
            'Optional optimistic-lock guard. If set, the call fails when the current note mtime does not match.',
        },
      },
      required: ['path', 'content', 'mode'],
      additionalProperties: false,
    },
  },
] as const;

type Args = Record<string, unknown> | undefined;

export async function dispatchTool(
  name: string,
  args: Args,
  client: ObsidianClient,
  defaultFolder: string
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    switch (name) {
      case 'health_check':
        return wrap(await healthCheck(client));
      case 'list_notes':
        return wrap(await listNotes(client, args, defaultFolder));
      case 'search_notes':
        return wrap(await searchNotes(client, args));
      case 'read_note':
        return wrap(await readNote(client, args));
      case 'append_note':
        return wrap(await appendNote(client, args));
      case 'update_note':
        return wrap(await updateNote(client, args));
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (err) {
    if (err instanceof McpError) throw err;
    if (err instanceof ObsidianClientError) {
      const code =
        err.status === 404
          ? ErrorCode.InvalidParams
          : err.status === 401 || err.status === 403
            ? ErrorCode.InvalidRequest
            : ErrorCode.InternalError;
      throw new McpError(code, err.message);
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new McpError(ErrorCode.InternalError, `Tool ${name} failed: ${msg}`);
  }
}

// ---- Tool implementations --------------------------------------------------

async function healthCheck(client: ObsidianClient) {
  try {
    const info = await client.getServerInfo();
    return {
      ok: true,
      service: info.service ?? null,
      versions: info.versions ?? null,
      authenticated: info.authenticated ?? null,
      status: info.status ?? null,
    };
  } catch (err) {
    const reason =
      err instanceof ObsidianClientError
        ? `${err.status} ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, reason };
  }
}

async function listNotes(client: ObsidianClient, args: Args, defaultFolder: string) {
  const folder =
    typeof args?.folder === 'string' ? args.folder : defaultFolder;
  const recursive = args?.recursive === true;
  const entries = recursive
    ? await client.listFolderRecursive(folder)
    : await client.listFolder(folder);
  return { folder: folder || '', recursive, entries };
}

async function searchNotes(client: ObsidianClient, args: Args) {
  const query = args?.query;
  if (typeof query !== 'string' || !query.trim()) {
    throw new McpError(ErrorCode.InvalidParams, 'query is required');
  }
  const limit = typeof args?.limit === 'number' ? args.limit : 25;
  const contextLength = typeof args?.contextLength === 'number' ? args.contextLength : 100;
  const all = await client.simpleSearch(query, contextLength);
  return { query, count: Math.min(all.length, limit), matches: all.slice(0, limit) };
}

async function readNote(client: ObsidianClient, args: Args) {
  const path = requireStringArg(args, 'path');
  const note = await client.getNote(path);
  if (!note) {
    throw new McpError(ErrorCode.InvalidParams, `Note not found: ${path}`);
  }
  return note;
}

async function appendNote(client: ObsidianClient, args: Args) {
  const path = requireStringArg(args, 'path');
  const content = requireStringArg(args, 'content');
  const ensureNewline = args?.ensureNewline !== false;

  // Enforce "errors if note does not exist" — the plugin's POST can be
  // permissive about creation, so we check first.
  const existing = await client.getNote(path);
  if (!existing) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Cannot append: note does not exist: ${path}. Use update_note with mode="create_or_overwrite" to create.`
    );
  }

  let payload = content;
  if (ensureNewline && existing.content && !existing.content.endsWith('\n')) {
    payload = `\n${content}`;
  }

  await client.appendNote(path, payload);
  return { path, bytesAppended: Buffer.byteLength(payload, 'utf8') };
}

async function updateNote(client: ObsidianClient, args: Args) {
  const path = requireStringArg(args, 'path');
  const content = requireStringArg(args, 'content');
  const mode = args?.mode;
  if (mode !== 'overwrite' && mode !== 'create_or_overwrite') {
    throw new McpError(
      ErrorCode.InvalidParams,
      'mode must be "overwrite" or "create_or_overwrite"'
    );
  }
  const expectedMtime =
    typeof args?.expectedMtime === 'number' ? args.expectedMtime : undefined;

  const existing = await client.getNote(path);
  const existed = existing !== null;

  if (mode === 'overwrite' && !existed) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Cannot overwrite: note does not exist: ${path}. Use mode="create_or_overwrite" to create.`
    );
  }
  if (expectedMtime !== undefined && existed && existing!.stat.mtime !== expectedMtime) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Conflict: expectedMtime=${expectedMtime} but current mtime=${existing!.stat.mtime}. Re-read the note before retrying.`
    );
  }

  await client.putNote(path, content);
  return { path, mode, created: !existed };
}

// ---- Helpers ---------------------------------------------------------------

function requireStringArg(args: Args, name: string): string {
  const value = args?.[name];
  if (typeof value !== 'string' || !value) {
    throw new McpError(ErrorCode.InvalidParams, `${name} is required and must be a non-empty string`);
  }
  return value;
}

function wrap(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}
