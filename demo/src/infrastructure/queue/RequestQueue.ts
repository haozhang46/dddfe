export type QueueTask<T> = (signal: AbortSignal) => Promise<T>

export type EnqueueOptions = {
  key?: string
  signal?: AbortSignal
}

export class RequestQueue {
  private chain: Promise<unknown> = Promise.resolve()
  private inflight = new Map<string, AbortController>()

  enqueue<T>(task: QueueTask<T>, options: EnqueueOptions = {}): Promise<T> {
    const { key, signal: outer } = options

    if (key) {
      this.inflight.get(key)?.abort()
      this.inflight.delete(key)
    }

    const local = new AbortController()
    if (key) this.inflight.set(key, local)

    const merged = mergeSignals(local.signal, outer)

    const run = this.chain.then(async () => {
      if (merged.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      try {
        return await task(merged)
      } finally {
        if (key && this.inflight.get(key) === local) {
          this.inflight.delete(key)
        }
      }
    })

    this.chain = run.then(
      () => undefined,
      () => undefined,
    )

    return run
  }
}

function mergeSignals(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const ctrl = new AbortController()
  for (const s of signals) {
    if (!s) continue
    if (s.aborted) {
      ctrl.abort(s.reason)
      return ctrl.signal
    }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true })
  }
  return ctrl.signal
}
