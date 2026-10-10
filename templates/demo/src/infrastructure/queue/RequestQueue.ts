import { Subject, concatMap } from 'rxjs'

export type QueueTask<T> = (signal: AbortSignal) => Promise<T>

export type EnqueueOptions = {
  key?: string
  signal?: AbortSignal
}

type Job = {
  run: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

export class RequestQueue {
  private readonly jobs$ = new Subject<Job>()
  private readonly inflight = new Map<string, AbortController>()

  private readonly subscription = this.jobs$
    .pipe(
      concatMap(async (job) => {
        try {
          job.resolve(await job.run())
        } catch (error) {
          job.reject(error)
        }
      }),
    )
    .subscribe()

  enqueue<T>(task: QueueTask<T>, options: EnqueueOptions = {}): Promise<T> {
    const { key, signal: outer } = options

    if (key) {
      this.inflight.get(key)?.abort()
      this.inflight.delete(key)
    }

    const local = new AbortController()
    if (key) this.inflight.set(key, local)

    const merged = mergeSignals(local.signal, outer)

    return new Promise<T>((resolve, reject) => {
      this.jobs$.next({
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
    })
  }

  dispose(): void {
    this.subscription.unsubscribe()
    this.jobs$.complete()
    for (const ctrl of this.inflight.values()) ctrl.abort()
    this.inflight.clear()
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
