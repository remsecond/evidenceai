// HTTP client for the Obsidian Local REST API plugin.
//
// ENDPOINT ASSUMPTIONS (verify live before relying on these in production):
//   GET    /                            -> { status, service, versions, authenticated }
//   GET    /vault/{path}                -> note body or JSON (Accept-driven)
//   PUT    /vault/{path}                -> create or replace note
//   POST   /vault/{path}                -> append to existing note
//   GET    /vault/{folder}/             -> { files: ["a.md", "sub/", ...] } (trailing slash required)
//   POST   /search/simple/?query=&contextLength=
//
// Auth: Authorization: Bearer <token>
// TLS:  Plugin defaults to HTTPS on 27124 with a self-signed cert.
//       Set OBSIDIAN_INSECURE_TLS=true for localhost development.

import { Agent, fetch } from 'undici';

export interface ServerInfo {
  status?: string;
  service?: string;
  versions?: { obsidian?: string; self?: string };
  authenticated?: boolean;
  raw: unknown;
}

export interface NoteStat {
  ctime: number;
  mtime: number;
  size: number;
}

export interface NoteJson {
  path: string;
  content: string;
  frontmatter?: Record<string, unknown>;
  tags?: string[];
  stat: NoteStat;
}

export interface ListEntry {
  path: string;
  type: 'file' | 'folder';
}

export interface SearchMatch {
  path: string;
  score?: number;
  matches?: Array<{
    context: string;
    match: { start: number; end: number };
  }>;
}

export class ObsidianClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'ObsidianClientError';
  }
}

export interface ObsidianClientOptions {
  baseUrl: string;
  token: string;
  insecureTls?: boolean;
  requestTimeoutMs?: number;
}

export class ObsidianClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly dispatcher: Agent | undefined;

  constructor(opts: ObsidianClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.token = opts.token;
    this.timeoutMs = opts.requestTimeoutMs ?? 15000;
    this.dispatcher = opts.insecureTls
      ? new Agent({ connect: { rejectUnauthorized: false } })
      : undefined;
  }

  // ---- Server info / health ------------------------------------------------

  async getServerInfo(): Promise<ServerInfo> {
    const res = await this.request('GET', '/', { accept: 'application/json' });
    const body = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }
    if (!res.ok) {
      throw new ObsidianClientError(res.status, `Server info failed: ${res.status}`, body);
    }
    const obj = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>;
    return {
      status: typeof obj.status === 'string' ? obj.status : undefined,
      service: typeof obj.service === 'string' ? obj.service : undefined,
      versions: (obj.versions as ServerInfo['versions']) ?? undefined,
      authenticated: typeof obj.authenticated === 'boolean' ? obj.authenticated : undefined,
      raw: parsed,
    };
  }

  // ---- Notes ---------------------------------------------------------------

  // Returns null if the note is missing (404). Throws on any other failure.
  async getNote(path: string): Promise<NoteJson | null> {
    const res = await this.request('GET', vaultPath(path), {
      accept: 'application/vnd.olrapi.note+json',
    });
    if (res.status === 404) return null;
    const body = await res.text();
    if (!res.ok) {
      throw new ObsidianClientError(res.status, `Read failed for ${path}: ${res.status}`, body);
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body) as Record<string, unknown>;
    } catch (e) {
      throw new ObsidianClientError(res.status, `Read returned non-JSON for ${path}`, body);
    }
    const stat = (parsed.stat ?? {}) as Partial<NoteStat>;
    return {
      path: typeof parsed.path === 'string' ? parsed.path : path,
      content: typeof parsed.content === 'string' ? parsed.content : '',
      frontmatter:
        parsed.frontmatter && typeof parsed.frontmatter === 'object'
          ? (parsed.frontmatter as Record<string, unknown>)
          : undefined,
      tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]) : undefined,
      stat: {
        ctime: typeof stat.ctime === 'number' ? stat.ctime : 0,
        mtime: typeof stat.mtime === 'number' ? stat.mtime : 0,
        size: typeof stat.size === 'number' ? stat.size : 0,
      },
    };
  }

  // Replace or create a note. Caller decides creation policy.
  async putNote(path: string, content: string): Promise<void> {
    const res = await this.request('PUT', vaultPath(path), {
      contentType: 'text/markdown',
      body: content,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ObsidianClientError(res.status, `Write failed for ${path}: ${res.status}`, body);
    }
  }

  // Append to a note. NOTE: the plugin's POST may auto-create a missing file;
  // tools.ts performs an explicit existence check before calling this.
  async appendNote(path: string, content: string): Promise<void> {
    const res = await this.request('POST', vaultPath(path), {
      contentType: 'text/markdown',
      body: content,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ObsidianClientError(res.status, `Append failed for ${path}: ${res.status}`, body);
    }
  }

  // ---- Listing -------------------------------------------------------------

  // List immediate children of a folder. `folder` is relative to vault root;
  // pass "" for root. Returns ListEntry[] with normalized paths.
  async listFolder(folder: string): Promise<ListEntry[]> {
    const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');
    const url = normalizedFolder ? `/vault/${encodePath(normalizedFolder)}/` : '/vault/';
    const res = await this.request('GET', url, { accept: 'application/json' });
    if (res.status === 404) {
      throw new ObsidianClientError(404, `Folder not found: ${folder || '/'}`);
    }
    const body = await res.text();
    if (!res.ok) {
      throw new ObsidianClientError(res.status, `List failed for ${folder}: ${res.status}`, body);
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body) as Record<string, unknown>;
    } catch {
      throw new ObsidianClientError(res.status, `List returned non-JSON for ${folder}`, body);
    }
    const files = Array.isArray(parsed.files) ? (parsed.files as string[]) : [];
    return files.map((name) => {
      const isFolder = name.endsWith('/');
      const cleanName = isFolder ? name.slice(0, -1) : name;
      const fullPath = normalizedFolder ? `${normalizedFolder}/${cleanName}` : cleanName;
      return { path: fullPath, type: isFolder ? 'folder' : 'file' };
    });
  }

  async listFolderRecursive(folder: string): Promise<ListEntry[]> {
    const out: ListEntry[] = [];
    const stack = [folder];
    const visited = new Set<string>();
    while (stack.length) {
      const current = stack.pop() as string;
      const key = current.replace(/^\/+|\/+$/g, '');
      if (visited.has(key)) continue;
      visited.add(key);
      const entries = await this.listFolder(current);
      for (const entry of entries) {
        out.push(entry);
        if (entry.type === 'folder') stack.push(entry.path);
      }
    }
    return out;
  }

  // ---- Search --------------------------------------------------------------

  async simpleSearch(query: string, contextLength = 100): Promise<SearchMatch[]> {
    const params = new URLSearchParams({
      query,
      contextLength: String(contextLength),
    });
    const res = await this.request('POST', `/search/simple/?${params.toString()}`, {
      accept: 'application/json',
    });
    const body = await res.text();
    if (!res.ok) {
      throw new ObsidianClientError(res.status, `Search failed: ${res.status}`, body);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new ObsidianClientError(res.status, 'Search returned non-JSON', body);
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const obj = (item ?? {}) as Record<string, unknown>;
      const path =
        typeof obj.filename === 'string'
          ? obj.filename
          : typeof obj.path === 'string'
            ? obj.path
            : '';
      return {
        path,
        score: typeof obj.score === 'number' ? obj.score : undefined,
        matches: Array.isArray(obj.matches)
          ? (obj.matches as SearchMatch['matches'])
          : undefined,
      };
    });
  }

  // ---- Internal ------------------------------------------------------------

  private async request(
    method: string,
    pathAndQuery: string,
    opts: { accept?: string; contentType?: string; body?: string } = {}
  ) {
    const url = `${this.baseUrl}${pathAndQuery}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };
    if (opts.accept) headers['Accept'] = opts.accept;
    if (opts.contentType) headers['Content-Type'] = opts.contentType;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, {
        method,
        headers,
        body: opts.body,
        dispatcher: this.dispatcher,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

function vaultPath(path: string): string {
  const trimmed = path.replace(/^\/+/, '');
  if (!trimmed) {
    throw new ObsidianClientError(400, 'Note path is required');
  }
  return `/vault/${encodePath(trimmed)}`;
}

function encodePath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}
