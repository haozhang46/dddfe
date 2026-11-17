import { describe, expect, it } from 'vitest'
import { RequestQueue } from './RequestQueue'

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const id = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

describe('RequestQueue', () => {
  it('runs tasks serially', async () => {
    const queue = new RequestQueue()
    const order: number[] = []

    const a = queue.enqueue(async () => {
      await wait(30)
      order.push(1)
      return 1
    })
    const b = queue.enqueue(async () => {
      order.push(2)
      return 2
    })

    await expect(Promise.all([a, b])).resolves.toEqual([1, 2])
    expect(order).toEqual([1, 2])
    queue.dispose()
  })

  it('aborts previous task with the same key', async () => {
    const queue = new RequestQueue()

    const first = queue.enqueue(async (signal) => {
      await wait(50, signal)
      return 'old'
    }, { key: 'x' })

    const second = queue.enqueue(async () => 'new', { key: 'x' })

    await expect(first).rejects.toMatchObject({ name: 'AbortError' })
    await expect(second).resolves.toBe('new')
    queue.dispose()
  })

  it('runs a higher-priority waiting job before an earlier lower-priority job', async () => {
    const queue = new RequestQueue()
    const order: string[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const blocker = queue.enqueue(async () => {
      order.push('running')
      await gate
    })
    const low = queue.enqueue(async () => {
      order.push('low')
    }, { priority: 0 })
    const high = queue.enqueue(async () => {
      order.push('high')
    }, { priority: 10 })

    release()
    await Promise.all([blocker, low, high])
    expect(order).toEqual(['running', 'high', 'low'])
    queue.dispose()
  })

  it('keeps enqueue order for equal priority', async () => {
    const queue = new RequestQueue()
    const order: number[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const blocker = queue.enqueue(async () => {
      await gate
    })
    const jobs = [1, 2, 3].map((n) =>
      queue.enqueue(async () => {
        order.push(n)
        return n
      }, { priority: 1 }),
    )

    release()
    await blocker
    await expect(Promise.all(jobs)).resolves.toEqual([1, 2, 3])
    expect(order).toEqual([1, 2, 3])
    queue.dispose()
  })

  it('does not preempt the job that has already started', async () => {
    const queue = new RequestQueue()
    const order: string[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const running = queue.enqueue(async () => {
      order.push('low-start')
      await gate
      order.push('low-end')
    }, { priority: 0 })
    const high = queue.enqueue(async () => {
      order.push('high')
    }, { priority: 100 })

    expect(order).toEqual(['low-start'])
    release()
    await Promise.all([running, high])
    expect(order).toEqual(['low-start', 'low-end', 'high'])
    queue.dispose()
  })

  it('rejects work still waiting when disposed', async () => {
    const queue = new RequestQueue()
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const running = queue.enqueue(async () => {
      await gate
      return 'done'
    })
    const queued = queue.enqueue(async () => 'later', { priority: 5 })

    queue.dispose()
    await expect(queued).rejects.toMatchObject({ name: 'AbortError' })
    release()
    await expect(running).resolves.toBe('done')
  })
})
