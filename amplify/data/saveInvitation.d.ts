// Types for the AppSync JS resolver so tests can import it under strict tsc.
export function request(ctx: { args: Record<string, unknown> }): unknown;
export function response(ctx: { result?: unknown; error?: { type: string; message: string } }): unknown;
