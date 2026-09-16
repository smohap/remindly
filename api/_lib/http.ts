import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readEnv, type BillingEnv } from './env.js'

export function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status)
  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(body))
}

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown

/** Turn uncaught errors into a JSON 500 with the message, instead of an opaque platform error. */
export function withErrors(handler: Handler): Handler {
  return async (req, res) => {
    try {
      return await handler(req, res)
    } catch (e) {
      console.error('[remindly api]', e)
      if (!res.headersSent) json(res, 500, { error: 'internal_error', message: e instanceof Error ? e.message : String(e) })
    }
  }
}

/** Common preamble: POST only, env present. Returns null after replying. */
export function guard(req: VercelRequest, res: VercelResponse): BillingEnv | null {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'method_not_allowed' })
    return null
  }
  const env = readEnv()
  if (!env) {
    json(res, 503, { error: 'billing_not_configured' })
    return null
  }
  return env
}

export function originOf(req: VercelRequest, bodyOrigin: unknown): string {
  if (typeof bodyOrigin === 'string' && /^https?:\/\//.test(bodyOrigin)) return bodyOrigin
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? ''
  return `${proto}://${host}`
}
