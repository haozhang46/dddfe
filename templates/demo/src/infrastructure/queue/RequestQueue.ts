export type QueueTask<T> = (signal: AbortSignal) => Promise<T>

export type EnqueueOptions = {
  /** Same key aborts the previous task still queued or running (latest-wins). */
  key?: string
  signal?: AbortSignal
  /**
   * Higher values run first among jobs that have not started.
   * The job already running is not preempted. Default 0.
   * Equal priority keeps enqueue order.
   */
  priority?: number
}

/** Shared levels for the app-wide queue. Higher runs sooner. */
export const QueuePriority = {
  /** Login, loads, and queries the user is waiting on. */
  userWaiting: 10,
  /** Autosave and other work that can sit behind an interactive read. */
  background: 0,
} as const

type Job = {
  priority: number
  run: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

export class RequestQueue {
  private readonly pending: Job[] = []
  private readonly inflight = new Map<string, AbortController>()
  private pumping = false
  private disposed = false

  enqueue<T>(task: QueueTask<T>, options: EnqueueOptions = {}): Promise<T> {
    const { key, signal: outer } = options
    const priority = options.priority ?? 0

    if (this.disposed) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'))
    }

    if (key) {
      this.inflight.get(key)?.abort()
      this.inflight.delete(key)
    }

    const local = new AbortController()
    if (key) this.inflight.set(key, local)

    const merged = mergeSignals(local.signal, outer)

    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        priority,
        run: async () => {
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
        },
        resolve: resolve as (value: unknown) => void,
        reject,
      })
      this.kick()
    })
  }

  dispose(): void {
    this.disposed = true
    for (const ctrl of this.inflight.values()) ctrl.abort()
    this.inflight.clear()
    const queued = this.pending.splice(0)
    const abort = new DOMException('Aborted', 'AbortError')
    for (const job of queued) job.reject(abort)
  }

  private kick(): void {
    if (this.pumping || this.disposed) return
    this.pumping = true
    void this.pump()
  }

  private async pump(): Promise<void> {
    try {
      for (;;) {
        if (this.disposed) return
        const job = this.takeNext()
        if (!job) return
        try {
          job.resolve(await job.run())
        } catch (error) {
          job.reject(error)
        }
      }
    } finally {
      this.pumping = false
      if (!this.disposed && this.pending.length > 0) this.kick()
    }
  }

  /** Highest priority; earliest enqueue wins ties. */
  private takeNext(): Job | undefined {
    if (this.pending.length === 0) return undefined
    let best = 0
    for (let i = 1; i < this.pending.length; i++) {
      if (this.pending[i].priority > this.pending[best].priority) best = i
    }
    return this.pending.splice(best, 1)[0]
  }
}

/** App-wide singleton — constructed once, injected via createAppDeps. */
export const requestQueue = new RequestQueue()

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
