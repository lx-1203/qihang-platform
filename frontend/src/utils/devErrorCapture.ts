type ErrorRecord = {
  id: number
  type: 'error' | 'unhandledrejection' | 'console_error'
  message: string
  stack: string | null
  timestamp: number
  url: string
}

const MAX_RECORDS = 500
let nextId = 1
const errors: ErrorRecord[] = []

function addRecord(record: Omit<ErrorRecord, 'id'>): void {
  const entry: ErrorRecord = { id: nextId++, ...record }
  errors.push(entry)
  if (errors.length > MAX_RECORDS) {
    errors.splice(0, errors.length - MAX_RECORDS)
  }
}

export function getErrors(): ReadonlyArray<Readonly<ErrorRecord>> {
  return errors
}

export function clearErrors(): void {
  errors.length = 0
  nextId = 1
}

function notProd(): boolean {
  return import.meta.env.DEV
}

if (notProd()) {
  const origOnError = window.onerror
  window.onerror = function (message, source, lineno, colno, error) {
    addRecord({
      type: 'error',
      message: typeof message === 'string' ? message : (message?.toString?.() ?? String(message)),
      stack: error?.stack ?? null,
      timestamp: Date.now(),
      url: typeof source === 'string' ? source : '',
    })
    if (typeof origOnError === 'function') {
      return origOnError(message, source, lineno, colno, error)
    }
    return false
  }

  window.addEventListener('unhandledrejection', (event) => {
    addRecord({
      type: 'unhandledrejection',
      message: event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'unknown'),
      stack: event.reason instanceof Error ? event.reason.stack ?? null : null,
      timestamp: Date.now(),
      url: location.href,
    })
  })

  const origConsoleError = console.error.bind(console)
  console.error = function (...args: unknown[]) {
    const first = args[0]
    let message = ''
    let stack: string | null = null
    if (first instanceof Error) {
      message = first.message
      stack = first.stack ?? null
    } else {
      message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
    }
    addRecord({
      type: 'console_error',
      message,
      stack,
      timestamp: Date.now(),
      url: location.href,
    })
    origConsoleError(...args)
  }
}
