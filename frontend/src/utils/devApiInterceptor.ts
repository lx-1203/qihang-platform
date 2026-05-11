type RequestRecord = {
  id: number
  url: string
  method: string
  status: number
  startTime: number
  endTime: number
  duration: number
  requestHeaders: Record<string, string>
  requestBody: string | null
  responseHeaders: Record<string, string>
  responseBody: string | null
  error: string | null
}

const MAX_RECORDS = 500
let nextId = 1
const requests: RequestRecord[] = []

function addRecord(record: Omit<RequestRecord, 'id'>): void {
  const entry: RequestRecord = { id: nextId++, ...record }
  requests.push(entry)
  if (requests.length > MAX_RECORDS) {
    requests.splice(0, requests.length - MAX_RECORDS)
  }
}

export function getRequests(): ReadonlyArray<Readonly<RequestRecord>> {
  return requests
}

export function clearRequests(): void {
  requests.length = 0
  nextId = 1
}

function safeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => { result[key] = value })
    return result
  }
  if (Array.isArray(headers)) {
    const result: Record<string, string> = {}
    for (const [key, value] of headers) { result[key] = value }
    return result
  }
  return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, String(v ?? '')]))
}

function safeBody(body: BodyInit | null): string | null {
  if (body === null || body === undefined) return null
  if (typeof body === 'string') return body.length > 4096 ? body.slice(0, 4096) + '...(truncated)' : body
  if (body instanceof FormData) return '[FormData]'
  if (body instanceof URLSearchParams) return body.toString()
  if (body instanceof Blob) return `[Blob: ${body.type} ${body.size}bytes]`
  if (body instanceof ArrayBuffer) return `[ArrayBuffer: ${body.byteLength}bytes]`
  if (body instanceof DataView) return `[DataView: ${body.byteLength}bytes]`
  if (body instanceof ReadableStream) return '[ReadableStream]'
  return String(body).slice(0, 4096)
}

function notProd(): boolean {
  return import.meta.env.DEV
}

// ====== 拦截 XMLHttpRequest ======
if (notProd()) {
  const OrigXHR = window.XMLHttpRequest
  const OrigOpen = OrigXHR.prototype.open
  const OrigSend = OrigXHR.prototype.send
  const OrigSetRequestHeader = OrigXHR.prototype.setRequestHeader

  const xhrMeta = new WeakMap<XMLHttpRequest, { method: string; url: string; startTime: number; reqHeaders: Record<string, string> }>()

  OrigXHR.prototype.open = function (method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null): void {
    const urlStr = url instanceof URL ? url.href : String(url)
    xhrMeta.set(this as unknown as XMLHttpRequest, {
      method: method.toUpperCase(),
      url: urlStr,
      startTime: 0,
      reqHeaders: {},
    })
    OrigOpen.call(this, method, url, async ?? true, username, password)
  } as typeof XMLHttpRequest.prototype.open

  OrigXHR.prototype.setRequestHeader = function (name: string, value: string): void {
    const meta = xhrMeta.get(this as unknown as XMLHttpRequest)
    if (meta) {
      meta.reqHeaders[name] = value
    }
    OrigSetRequestHeader.call(this, name, value)
  } as typeof XMLHttpRequest.prototype.setRequestHeader

  OrigXHR.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
    const meta = xhrMeta.get(this as unknown as XMLHttpRequest)
    if (!meta) {
      OrigSend.call(this, body)
      return
    }
    meta.startTime = Date.now()
    const startTime = meta.startTime

    this.addEventListener('loadend', () => {
      const endTime = Date.now()
      addRecord({
        url: meta.url,
        method: meta.method,
        status: this.status === 0 ? 0 : this.status,
        startTime,
        endTime,
        duration: endTime - startTime,
        requestHeaders: { ...meta.reqHeaders },
        requestBody: safeBody(body ?? null),
        responseHeaders: {},
        responseBody: this.responseText ? (this.responseText.length > 4096 ? this.responseText.slice(0, 4096) + '...(truncated)' : this.responseText) : null,
        error: this.status >= 400 ? `HTTP ${this.status}` : null,
      })
    })

    OrigSend.call(this, body)
  } as typeof XMLHttpRequest.prototype.send
}

// ====== 拦截 fetch ======
if (notProd()) {
  const origFetch = window.fetch.bind(window)

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const startTime = Date.now()
    const urlStr = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : String(input)
    const method = init?.method?.toUpperCase() || (input instanceof Request ? input.method?.toUpperCase() : 'GET') || 'GET'
    const reqHeaders = safeHeaders(init?.headers as HeadersInit)
    const reqBody = safeBody(init?.body ?? null)

    let status = 0
    let endTime = Date.now()
    let resHeaders: Record<string, string> = {}
    let resBody: string | null = null
    let error: string | null = null

    try {
      const response = await origFetch(input, init)
      status = response.status
      endTime = Date.now()
      resHeaders = safeHeaders(response.headers)
      try {
        const cloned = response.clone()
        const text = await cloned.text()
        resBody = text.length > 4096 ? text.slice(0, 4096) + '...(truncated)' : text
      } catch {
        // body unreadable
      }
      if (status >= 400) {
        error = `HTTP ${status}`
      }
      addRecord({
        url: urlStr,
        method,
        status,
        startTime,
        endTime,
        duration: endTime - startTime,
        requestHeaders: reqHeaders,
        requestBody: reqBody,
        responseHeaders: resHeaders,
        responseBody: resBody,
        error,
      })
      return response
    } catch (err: unknown) {
      endTime = Date.now()
      addRecord({
        url: urlStr,
        method,
        status: 0,
        startTime,
        endTime,
        duration: endTime - startTime,
        requestHeaders: reqHeaders,
        requestBody: reqBody,
        responseHeaders: {},
        responseBody: null,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  }
}
