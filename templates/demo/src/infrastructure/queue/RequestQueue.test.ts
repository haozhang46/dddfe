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
})
