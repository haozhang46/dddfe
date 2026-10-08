# 前端 DDD + XState + 请求队列 完整骨架

> 分层：`Domain` → `Application` → `Infrastructure` → `Presentation`（Headless XState）

## 核心要点

| 规则 | 说明 |
|------|------|
| Domain 纯业务 | 无网络、无请求队列、无 XState、无 UI |
| Infrastructure 扛 IO | HTTP、请求队列、`AbortSignal` 封装在仓储实现内 |
| Presentation 编排 | XState 负责事件编排、状态流转、内存版本号兜底 |
| 依赖倒置 | 领域/应用依赖抽象仓储接口，不依赖 HTTP 实现 |

```
┌─────────────────────────────────────────────────────────┐
│ Presentation（XState Headless Service）                  │
│  事件编排 · 状态机 · 内存 version 兜底 · 订阅 UI         │
└──────────────────────────┬──────────────────────────────┘
                           │ 调用用例 / 仓储端口
┌──────────────────────────▼──────────────────────────────┐
│ Application（用例 + 抽象仓储接口）                        │
│  编排领域对象 · 定义 Repository Port                     │
└──────────────────────────┬──────────────────────────────┘
                           │ 依赖倒置（接口）
┌──────────────────────────▼──────────────────────────────┐
│ Domain（实体 / 值对象 / 领域服务）                        │
│  纯函数业务规则 · 无副作用                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Infrastructure（HttpRepository + RequestQueue）           │
│  实现仓储接口 · 串行/去重队列 · AbortController           │
└─────────────────────────────────────────────────────────┘
```

---

## 目录

```text
src/
├── domain/
│   ├── cart/
│   │   ├── Cart.ts              # 聚合根 / 实体
│   │   ├── CartItem.ts          # 值对象或实体
│   │   ├── Money.ts             # 值对象
│   │   └── cartRules.ts         # 纯业务规则
│   └── shared/
│       └── Result.ts            # 可选：领域结果类型
│
├── application/
│   ├── ports/
│   │   └── CartRepository.ts    # 抽象仓储接口（Port）
│   └── use-cases/
│       ├── LoadCart.ts
│       ├── AddCartItem.ts
│       └── CheckoutCart.ts
│
├── infrastructure/
│   ├── http/
│   │   ├── HttpClient.ts
│   │   └── dto/
│   │       └── CartDto.ts
│   ├── queue/
│   │   └── RequestQueue.ts      # 请求队列 + AbortSignal
│   └── repositories/
│       └── HttpCartRepository.ts
│
└── presentation/
    ├── machines/
    │   └── cartMachine.ts       # XState 状态机
    ├── services/
    │   └── cartService.ts       # Headless Service（createActor）
    └── adapters/
        └── createCartDeps.ts    # 组装依赖注入
```

---

## Domain 领域层

**职责**：表达业务概念与不变式。只接收/返回领域对象或原始数据，不做 IO。

### `domain/shared/Result.ts`

```ts
export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
```

### `domain/cart/Money.ts`

```ts
export type Money = Readonly<{
  amount: number; // 最小货币单位，如分
  currency: string;
}>;

export function money(amount: number, currency = 'CNY'): Money {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error('Money.amount must be a non-negative integer');
  }
  return Object.freeze({ amount, currency });
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error('Currency mismatch');
  return money(a.amount + b.amount, a.currency);
}
```

### `domain/cart/CartItem.ts`

```ts
import type { Money } from './Money';

export type CartItem = Readonly<{
  skuId: string;
  quantity: number;
  unitPrice: Money;
}>;

export function createCartItem(
  skuId: string,
  quantity: number,
  unitPrice: Money,
): CartItem {
  if (!skuId) throw new Error('skuId required');
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('quantity must be positive integer');
  }
  return Object.freeze({ skuId, quantity, unitPrice });
}
```

### `domain/cart/cartRules.ts`

```ts
import type { CartItem } from './CartItem';
import { addMoney, money, type Money } from './Money';

export function calcSubtotal(items: readonly CartItem[]): Money {
  if (items.length === 0) return money(0);
  return items.reduce(
    (sum, item) =>
      addMoney(sum, money(item.unitPrice.amount * item.quantity, item.unitPrice.currency)),
    money(0, items[0].unitPrice.currency),
  );
}

/** 同 SKU 合并数量；纯函数，返回新数组 */
export function upsertItem(
  items: readonly CartItem[],
  next: CartItem,
): CartItem[] {
  const idx = items.findIndex((i) => i.skuId === next.skuId);
  if (idx === -1) return [...items, next];
  const merged = {
    ...items[idx],
    quantity: items[idx].quantity + next.quantity,
  };
  return items.map((i, n) => (n === idx ? Object.freeze(merged) : i));
}
```

### `domain/cart/Cart.ts`

```ts
import type { CartItem } from './CartItem';
import { calcSubtotal, upsertItem } from './cartRules';
import type { Money } from './Money';

export type Cart = Readonly<{
  id: string;
  /** 服务端资源版本；领域只持有，不负责网络乐观锁细节 */
  version: number;
  items: readonly CartItem[];
}>;

export function createCart(id: string, version = 0, items: readonly CartItem[] = []): Cart {
  return Object.freeze({ id, version, items: Object.freeze([...items]) });
}

export function addItem(cart: Cart, item: CartItem): Cart {
  return Object.freeze({
    ...cart,
    items: Object.freeze(upsertItem(cart.items, item)),
  });
}

export function cartSubtotal(cart: Cart): Money {
  return calcSubtotal(cart.items);
}

/** 应用服务端回写后的版本（仍是纯数据变换） */
export function withVersion(cart: Cart, version: number): Cart {
  return Object.freeze({ ...cart, version });
}
```

> Domain **禁止**：`fetch`、`axios`、`RequestQueue`、`createMachine`、`AbortController`、React/Vue 引用。

---

## Application 应用层（抽象仓储接口）

**职责**：定义用例与 Port（仓储抽象）；编排领域对象；不关心 HTTP / 队列实现。

### `application/ports/CartRepository.ts`

```ts
import type { Cart } from '../../domain/cart/Cart';
import type { CartItem } from '../../domain/cart/CartItem';

/**
 * 仓储端口：领域/应用只依赖此接口。
 * signal 由上层（Presentation / Infrastructure 调用方）传入，
 * 便于取消；队列策略在 Infrastructure 内消化。
 */
export interface CartRepository {
  load(cartId: string, signal?: AbortSignal): Promise<Cart>;

  save(cart: Cart, signal?: AbortSignal): Promise<Cart>;

  addItem(
    cartId: string,
    item: CartItem,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<Cart>;
}
```

### `application/use-cases/LoadCart.ts`

```ts
import type { Cart } from '../../domain/cart/Cart';
import type { CartRepository } from '../ports/CartRepository';

export type LoadCart = (cartId: string, signal?: AbortSignal) => Promise<Cart>;

export function createLoadCart(repo: CartRepository): LoadCart {
  return (cartId, signal) => repo.load(cartId, signal);
}
```

### `application/use-cases/AddCartItem.ts`

```ts
import { addItem, type Cart } from '../../domain/cart/Cart';
import { createCartItem } from '../../domain/cart/CartItem';
import type { Money } from '../../domain/cart/Money';
import type { CartRepository } from '../ports/CartRepository';

export type AddCartItemInput = {
  cartId: string;
  skuId: string;
  quantity: number;
  unitPrice: Money;
  /** 客户端当前已知版本，用于乐观并发 */
  expectedVersion: number;
};

export type AddCartItem = (
  input: AddCartItemInput,
  signal?: AbortSignal,
) => Promise<Cart>;

/**
 * 用例可选：本地先算领域结果再交给仓储；
 * 或直接委托仓储（服务端权威）。此处演示「领域先行 + 仓储持久化」。
 */
export function createAddCartItem(repo: CartRepository): AddCartItem {
  return async (input, signal) => {
    const item = createCartItem(input.skuId, input.quantity, input.unitPrice);
    // 若需要离线/乐观 UI，可先 load → addItem(domain) → save
    // 这里走仓储原子接口，由服务端合并并校验 version
    return repo.addItem(input.cartId, item, input.expectedVersion, signal);
  };
}
```

### `application/use-cases/CheckoutCart.ts`

```ts
import type { Cart } from '../../domain/cart/Cart';
import { cartSubtotal } from '../../domain/cart/Cart';
import type { CartRepository } from '../ports/CartRepository';

export type CheckoutCart = (
  cartId: string,
  expectedVersion: number,
  signal?: AbortSignal,
) => Promise<{ cart: Cart; payable: ReturnType<typeof cartSubtotal> }>;

export function createCheckoutCart(repo: CartRepository): CheckoutCart {
  return async (cartId, expectedVersion, signal) => {
    const cart = await repo.load(cartId, signal);
    if (cart.version !== expectedVersion) {
      throw new Error('VERSION_CONFLICT');
    }
    if (cart.items.length === 0) {
      throw new Error('EMPTY_CART');
    }
    // 真实项目会调用 CheckoutRepository；此处仅演示领域校验 + 读模型
    return { cart, payable: cartSubtotal(cart) };
  };
}
```

---

## Infrastructure 基础设施层（Http 仓储 + 请求队列）

**职责**：实现 Port；封装网络、DTO 映射、请求队列、`AbortSignal` 合并与取消。

### `infrastructure/queue/RequestQueue.ts`

```ts
export type QueueTask<T> = (signal: AbortSignal) => Promise<T>;

export type EnqueueOptions = {
  /** 同 key 新任务入队时，取消仍在排队/执行的旧任务（适配备注类写操作） */
  key?: string;
  /** 外部取消信号 */
  signal?: AbortSignal;
};

/**
 * 简单串行队列 + 可选 key 去重（latest-wins）。
 * 网络细节只活在 Infrastructure。
 */
export class RequestQueue {
  private chain: Promise<unknown> = Promise.resolve();
  private inflight = new Map<string, AbortController>();

  enqueue<T>(task: QueueTask<T>, options: EnqueueOptions = {}): Promise<T> {
    const { key, signal: outer } = options;

    if (key) {
      this.inflight.get(key)?.abort();
      this.inflight.delete(key);
    }

    const local = new AbortController();
    if (key) this.inflight.set(key, local);

    const merged = mergeSignals(local.signal, outer);

    const run = this.chain.then(async () => {
      if (merged.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      try {
        return await task(merged);
      } finally {
        if (key && this.inflight.get(key) === local) {
          this.inflight.delete(key);
        }
      }
    });

    // 不让单个失败打断整条链
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );

    return run;
  }
}

function mergeSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const ctrl = new AbortController();
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) {
      ctrl.abort(s.reason);
      return ctrl.signal;
    }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}
```

### `infrastructure/http/HttpClient.ts`

```ts
export type HttpClient = {
  get<T>(url: string, init?: RequestInit): Promise<T>;
  post<T>(url: string, body: unknown, init?: RequestInit): Promise<T>;
  patch<T>(url: string, body: unknown, init?: RequestInit): Promise<T>;
};

export function createFetchHttpClient(baseUrl: string): HttpClient {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    return res.json() as Promise<T>;
  };

  return {
    get: (url, init) => request(url, { ...init, method: 'GET' }),
    post: (url, body, init) =>
      request(url, { ...init, method: 'POST', body: JSON.stringify(body) }),
    patch: (url, body, init) =>
      request(url, { ...init, method: 'PATCH', body: JSON.stringify(body) }),
  };
}
```

### `infrastructure/http/dto/CartDto.ts`

```ts
import { createCart, type Cart } from '../../../domain/cart/Cart';
import { createCartItem } from '../../../domain/cart/CartItem';
import { money } from '../../../domain/cart/Money';

export type CartDto = {
  id: string;
  version: number;
  items: Array<{
    skuId: string;
    quantity: number;
    unitPrice: { amount: number; currency: string };
  }>;
};

export function toDomain(dto: CartDto): Cart {
  return createCart(
    dto.id,
    dto.version,
    dto.items.map((i) =>
      createCartItem(i.skuId, i.quantity, money(i.unitPrice.amount, i.unitPrice.currency)),
    ),
  );
}

export function toDto(cart: Cart): CartDto {
  return {
    id: cart.id,
    version: cart.version,
    items: cart.items.map((i) => ({
      skuId: i.skuId,
      quantity: i.quantity,
      unitPrice: { amount: i.unitPrice.amount, currency: i.unitPrice.currency },
    })),
  };
}
```

### `infrastructure/repositories/HttpCartRepository.ts`

```ts
import type { Cart } from '../../domain/cart/Cart';
import type { CartItem } from '../../domain/cart/CartItem';
import type { CartRepository } from '../../application/ports/CartRepository';
import type { HttpClient } from '../http/HttpClient';
import { toDomain, toDto, type CartDto } from '../http/dto/CartDto';
import { RequestQueue } from '../queue/RequestQueue';

export function createHttpCartRepository(
  http: HttpClient,
  queue: RequestQueue = new RequestQueue(),
): CartRepository {
  return {
    load(cartId, signal) {
      return queue.enqueue(
        async (qSignal) => {
          const dto = await http.get<CartDto>(`/carts/${cartId}`, { signal: qSignal });
          return toDomain(dto);
        },
        { key: `cart:load:${cartId}`, signal },
      );
    },

    save(cart, signal) {
      return queue.enqueue(
        async (qSignal) => {
          const dto = await http.patch<CartDto>(
            `/carts/${cart.id}`,
            toDto(cart),
            {
              signal: qSignal,
              headers: { 'If-Match': String(cart.version) },
            },
          );
          return toDomain(dto);
        },
        { key: `cart:write:${cart.id}`, signal },
      );
    },

    addItem(cartId, item, expectedVersion, signal) {
      return queue.enqueue(
        async (qSignal) => {
          const dto = await http.post<CartDto>(
            `/carts/${cartId}/items`,
            {
              skuId: item.skuId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              expectedVersion,
            },
            { signal: qSignal },
          );
          return toDomain(dto);
        },
        // 写操作 latest-wins：快速连点只保留最后一次意图 + 串行执行
        { key: `cart:write:${cartId}`, signal },
      );
    },
  };
}
```

---

## Presentation 表示层（XState Headless Service）

**职责**：事件编排与 UI 状态；调用用例；用内存 `requestId` / `epoch` 丢弃过期响应；**不**实现业务不变式，**不**直接 `fetch`。

### `presentation/adapters/createCartDeps.ts`

```ts
import { createLoadCart } from '../../application/use-cases/LoadCart';
import { createAddCartItem } from '../../application/use-cases/AddCartItem';
import { createCheckoutCart } from '../../application/use-cases/CheckoutCart';
import { createFetchHttpClient } from '../../infrastructure/http/HttpClient';
import { RequestQueue } from '../../infrastructure/queue/RequestQueue';
import { createHttpCartRepository } from '../../infrastructure/repositories/HttpCartRepository';

export function createCartDeps(baseUrl: string) {
  const http = createFetchHttpClient(baseUrl);
  const queue = new RequestQueue();
  const repo = createHttpCartRepository(http, queue);

  return {
    loadCart: createLoadCart(repo),
    addCartItem: createAddCartItem(repo),
    checkoutCart: createCheckoutCart(repo),
  };
}

export type CartDeps = ReturnType<typeof createCartDeps>;
```

### `presentation/machines/cartMachine.ts`

```ts
import { assign, fromPromise, setup } from 'xstate';
import type { Cart } from '../../domain/cart/Cart';
import type { Money } from '../../domain/cart/Money';
import type { CartDeps } from '../adapters/createCartDeps';

export type CartContext = {
  cartId: string;
  cart: Cart | null;
  error: string | null;
  /**
   * 内存版本号 / 请求世代：每次发起异步意图 +1。
   * 回调时比对，过期则丢弃（队列 Abort 之外的兜底）。
   */
  epoch: number;
};

export type CartEvent =
  | { type: 'HYDRATE'; cartId: string }
  | { type: 'RELOAD' }
  | {
      type: 'ADD_ITEM';
      skuId: string;
      quantity: number;
      unitPrice: Money;
    }
  | { type: 'CHECKOUT' }
  | { type: 'CLEAR_ERROR' };

export function createCartMachine(deps: CartDeps) {
  return setup({
    types: {
      context: {} as CartContext,
      events: {} as CartEvent,
      input: {} as { cartId: string },
    },
    actors: {
      loadCart: fromPromise(
        async ({
          input,
        }: {
          input: { cartId: string; signal: AbortSignal };
        }) => deps.loadCart(input.cartId, input.signal),
      ),
      addItem: fromPromise(
        async ({
          input,
        }: {
          input: {
            cartId: string;
            skuId: string;
            quantity: number;
            unitPrice: Money;
            expectedVersion: number;
            signal: AbortSignal;
          };
        }) =>
          deps.addCartItem(
            {
              cartId: input.cartId,
              skuId: input.skuId,
              quantity: input.quantity,
              unitPrice: input.unitPrice,
              expectedVersion: input.expectedVersion,
            },
            input.signal,
          ),
      ),
    },
  }).createMachine({
    id: 'cart',
    initial: 'idle',
    context: ({ input }) => ({
      cartId: input.cartId,
      cart: null,
      error: null,
      epoch: 0,
    }),
    states: {
      idle: {
        on: {
          HYDRATE: {
            target: 'loading',
            actions: assign(({ event }) => ({
              cartId: event.cartId,
              error: null,
            })),
          },
          RELOAD: 'loading',
          ADD_ITEM: {
            guard: ({ context }) => context.cart !== null,
            target: 'mutating',
          },
        },
      },
      loading: {
        entry: assign(({ context }) => ({
          epoch: context.epoch + 1,
          error: null,
        })),
        invoke: {
          src: 'loadCart',
          input: ({ context }) => {
            const ac = new AbortController();
            // XState v5：可将 signal 经 input 传入；
            // 若用 actor 生命周期取消，可在 onDone 外结合系统 AbortSignal。
            return { cartId: context.cartId, signal: ac.signal, _ac: ac };
          },
          onDone: {
            target: 'ready',
            actions: assign(({ context, event }) => {
              // epoch 兜底：若期间又发起了更新代请求，可在自定义逻辑中丢弃
              return { cart: event.output as Cart, error: null };
            }),
          },
          onError: {
            target: 'idle',
            actions: assign(({ event }) => ({
              error: stringifyError(event.error),
            })),
          },
        },
        on: {
          RELOAD: {
            target: 'loading',
            reenter: true,
            actions: assign(({ context }) => ({ epoch: context.epoch + 1 })),
          },
        },
      },
      ready: {
        on: {
          RELOAD: 'loading',
          ADD_ITEM: 'mutating',
          CHECKOUT: 'checkout',
          CLEAR_ERROR: { actions: assign({ error: null }) },
        },
      },
      mutating: {
        entry: assign(({ context }) => ({
          epoch: context.epoch + 1,
          error: null,
        })),
        invoke: {
          src: 'addItem',
          input: ({ context, event }) => {
            if (event.type !== 'ADD_ITEM' || !context.cart) {
              throw new Error('Invalid ADD_ITEM');
            }
            const ac = new AbortController();
            return {
              cartId: context.cartId,
              skuId: event.skuId,
              quantity: event.quantity,
              unitPrice: event.unitPrice,
              expectedVersion: context.cart.version,
              signal: ac.signal,
            };
          },
          onDone: {
            target: 'ready',
            actions: assign(({ context, event }) => {
              const next = event.output as Cart;
              // 内存版本兜底：服务端 version 回写；若过期 epoch 可选择忽略
              return { cart: next, error: null };
            }),
          },
          onError: {
            target: 'ready',
            actions: assign(({ event }) => ({
              error: stringifyError(event.error),
            })),
          },
        },
      },
      checkout: {
        // 同理 invoke checkoutCart…
        type: 'final',
      },
    },
  });
}

function stringifyError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
```

### 更稳妥的 epoch 丢弃模式（推荐补丁）

队列 `Abort` 解决「传输层」竞态；`epoch` 解决「状态机已离开 / 快速切换」时的过期写回：

```ts
// 在 invoke onDone 中：
onDone: {
  target: 'ready',
  guard: ({ context, event }) => {
    const meta = event.output as { cart: Cart; epoch: number };
    return meta.epoch === context.epoch;
  },
  actions: assign(({ event }) => ({
    cart: (event.output as { cart: Cart }).cart,
  })),
},
```

发起请求时把当时的 `epoch` 打进 actor input，resolve 时原样带回，与当前 context 比对。

### `presentation/services/cartService.ts`（Headless）

```ts
import { createActor } from 'xstate';
import { createCartDeps } from '../adapters/createCartDeps';
import { createCartMachine } from '../machines/cartMachine';
import { money } from '../../domain/cart/Money';

/** 与 UI 框架无关的 Headless Service */
export function createCartService(baseUrl: string, cartId: string) {
  const deps = createCartDeps(baseUrl);
  const machine = createCartMachine(deps);
  const actor = createActor(machine, { input: { cartId } });

  actor.start();
  actor.send({ type: 'HYDRATE', cartId });

  return {
    subscribe: actor.subscribe.bind(actor),
    send: actor.send.bind(actor),
    getSnapshot: () => actor.getSnapshot(),
    stop: () => actor.stop(),

    // 可选：面向 UI 的门面，避免组件直接拼事件
    addItem(skuId: string, quantity: number, amount: number) {
      actor.send({
        type: 'ADD_ITEM',
        skuId,
        quantity,
        unitPrice: money(amount),
      });
    },
    reload() {
      actor.send({ type: 'RELOAD' });
    },
  };
}

export type CartService = ReturnType<typeof createCartService>;
```

---

## 使用示例

### 1）在 React / Vue 中挂载 Headless Service

```ts
// React 示例（伪代码）
import { useEffect, useSyncExternalStore } from 'react';
import { createCartService } from './presentation/services/cartService';

const service = createCartService(import.meta.env.VITE_API, 'cart-1');

export function CartView() {
  const snap = useSyncExternalStore(
    (cb) => {
      const sub = service.subscribe(cb);
      return () => sub.unsubscribe();
    },
    () => service.getSnapshot(),
  );

  useEffect(() => () => service.stop(), []);

  const cart = snap.context.cart;

  return (
    <div>
      <p>state: {String(snap.value)}</p>
      <p>version: {cart?.version ?? '-'}</p>
      <ul>
        {cart?.items.map((i) => (
          <li key={i.skuId}>
            {i.skuId} × {i.quantity}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => service.addItem('sku-1', 1, 100)}>
        Add
      </button>
      <button type="button" onClick={() => service.reload()}>
        Reload
      </button>
      {snap.context.error && <p role="alert">{snap.context.error}</p>}
    </div>
  );
}
```

### 2）单测：Domain 无需 mock 网络

```ts
import { createCart, addItem, cartSubtotal } from '../domain/cart/Cart';
import { createCartItem } from '../domain/cart/CartItem';
import { money } from '../domain/cart/Money';

const cart = createCart('c1');
const next = addItem(cart, createCartItem('sku-1', 2, money(100)));
assert(cartSubtotal(next).amount === 200);
```

### 3）单测：Application 只 mock Port

```ts
import { createAddCartItem } from '../application/use-cases/AddCartItem';
import type { CartRepository } from '../application/ports/CartRepository';
import { createCart } from '../domain/cart/Cart';
import { money } from '../domain/cart/Money';

const repo: CartRepository = {
  load: async () => createCart('c1', 1),
  save: async (c) => c,
  addItem: async () => createCart('c1', 2, []),
};

const add = createAddCartItem(repo);
await add({
  cartId: 'c1',
  skuId: 'sku-1',
  quantity: 1,
  unitPrice: money(100),
  expectedVersion: 1,
});
```

### 4）集成：替换仓储实现即可（依赖倒置）

```ts
// 测试 / Storybook：InMemoryCartRepository 实现同一 Port
// 生产：HttpCartRepository + RequestQueue
// Presentation 与 Domain 均无需改动
```

---

## 分层职责与竞态防护小结

### 分层职责

| 层 | 做什么 | 不做什么 |
|----|--------|----------|
| **Domain** | 实体、值对象、不变式、纯计算 | 网络、队列、XState、UI、DTO |
| **Application** | 用例编排、定义 Repository Port | 具体 HTTP、队列策略、组件状态 |
| **Infrastructure** | HttpClient、DTO↔Domain、RequestQueue、Abort | 业务规则、UI 状态机 |
| **Presentation** | XState 事件/状态、epoch 兜底、订阅 UI | 直接 fetch、复制领域规则 |

### 竞态防护（三道闸）

```text
用户连点 / 快速切换
        │
        ▼
① Infrastructure RequestQueue
   · 同 key 串行
   · latest-wins 时 abort 旧任务
   · 合并外部 AbortSignal
        │
        ▼
② 服务端乐观并发
   · expectedVersion / If-Match
   · 冲突返回 VERSION_CONFLICT → 用例/状态机处理刷新
        │
        ▼
③ Presentation 内存 epoch
   · 每次异步意图 +1
   · onDone 比对 epoch，过期响应丢弃
   · 防止「已离开状态仍 assign」
```

| 手段 | 所在层 | 防什么 |
|------|--------|--------|
| `RequestQueue` + `AbortSignal` | Infrastructure | 重复请求、乱序完成、无效传输 |
| `expectedVersion` / `If-Match` | Application 入参 + Infra 头 | 多端/多页写冲突 |
| `epoch` / requestId | Presentation (XState) | 过期响应写回内存、状态机错乱 |

### 依赖方向（必须遵守）

```text
Presentation → Application → Domain
      ↓              ↓
Infrastructure 实现 Application 的 Port
Domain ✗→ Infrastructure / XState / HTTP
```

### 落地检查清单

- [ ] Domain 文件无 `fetch` / XState / 队列 import
- [ ] 所有 IO 经 `CartRepository`（或其它 Port）
- [ ] 写路径带 `expectedVersion` 或等价并发令牌
- [ ] 仓储实现内部使用 `RequestQueue`，并对写操作设稳定 `key`
- [ ] XState invoke 的 `onDone` 有 epoch/requestId 丢弃逻辑
- [ ] UI 只依赖 Headless Service 的 `subscribe` / `send`，不直连 HTTP

---

## 扩展建议（可选）

1. **按聚合拆队列 key**：`cart:write:${id}` / `order:write:${id}`，避免全局单队列过粗。
2. **读请求**：可并行或不入「写队列」；或单独 `ReadQueue`。
3. **领域事件**：Application 在用例成功后 `emit`，Presentation 订阅刷新，而不是在 Domain 里发事件总线到 UI。
4. **错误类型**：用 `Result` / 判别联合替代抛字符串，便于状态机 `guard`。
5. **XState v5 `AbortSignal`**：优先使用系统在 invoke 时注入的 `signal`（若版本支持），与队列 `mergeSignals` 对齐。

---

## 巨型 Form：怎么写这个 State

### 一句话结论

> **XState 只编排生命周期（load / edit / autosave / submit / conflict）**；  
> **字段值放 Form 库或本地 store**；  
> **业务校验与不变式放 Domain**；  
> **不要把几百个字段的每次 keystroke 都 `assign` 进 machine context。**

把「巨型表单」拆成两类状态：

| 类型 | 放哪 | 例子 |
|------|------|------|
| **编排状态**（少、离散） | XState | `loading` → `editing` → `autosaving` → `submitting` → `success` |
| **草稿数据**（大、高频） | Form 库 / `useState` / store | 姓名、地址、明细行、附件 meta… |
| **业务真相**（可测） | Domain `FormDraft` 聚合 | `validateSection` / `canSubmit` / `applyPatch` |

```text
UI 输入（高频）
    │  受控组件 / RHF / Formily …
    ▼
localDraft（Presentation 本地）
    │  blur / debounce / 切步 / 点保存 时同步一次
    ▼
Domain FormDraft（纯校验、算 canSubmit）
    │  用例 SaveDraft / SubmitForm
    ▼
Infrastructure（队列 + Abort + version）
    ▲
XState 只知道：正在存吗？能否提交？冲突了吗？当前第几步？
```

### 反模式（巨型 Form 最容易踩）

```ts
// ❌ 每个字段都在 machine context，每次 onChange 发 FIELD_CHANGE
context: {
  name: '', phone: '', address1: '', /* … 200 个字段 */
  lineItems: [/* … */],
}
on: {
  FIELD_CHANGE: { actions: assign(/* 每次击键触发全局订阅 */) }
}
```

后果：重渲染风暴、事件爆炸、Domain 被 UI 形状污染、很难测。

### 推荐：双轨 Context

Machine **只持摘要 + 服务端版本**，完整草稿在 Form 侧；需要 IO 时再「快照」进去。

```ts
// presentation/machines/giantFormMachine.ts（骨架）
type FormMachineContext = {
  formId: string;
  /** 服务端乐观锁 */
  version: number;
  /** 与请求队列配合的世代号 */
  epoch: number;
  /** 摘要，不是全量字段 */
  dirty: boolean;
  sectionErrors: Partial<Record<SectionId, string>>;
  lastSavedAt: number | null;
  conflict: boolean;
  /**
   * 仅在 load/save/submit 边界持有「已提交快照」。
   * 编辑过程中的权威草稿在 formApi，不在这里每键更新。
   */
  committed: FormDraft | null;
};

type FormMachineEvent =
  | { type: 'HYDRATE'; formId: string }
  | { type: 'DRAFT_DIRTY' } // Form 侧通知：有未保存修改
  | { type: 'AUTOSAVE'; draft: FormDraft } // debounce 后带快照
  | { type: 'SAVE'; draft: FormDraft }
  | { type: 'SUBMIT'; draft: FormDraft }
  | { type: 'GO_SECTION'; section: SectionId }
  | { type: 'RESOLVE_CONFLICT'; strategy: 'reload' | 'overwrite' };
```

状态图保持「瘦」：

```text
idle → loading → editing ⇄ autosaving
                    ↓
               submitting → success
                    ↓
               conflict（version 冲突）
```

### Domain：草稿聚合 + 按 Section 校验

```ts
// domain/form/FormDraft.ts
export type SectionId = 'base' | 'address' | 'items' | 'attachments';

export type FormDraft = Readonly<{
  id: string;
  version: number;
  base: { title: string; ownerId: string };
  address: { province: string; city: string; detail: string };
  items: readonly { skuId: string; qty: number }[];
  // … 大字段都在领域模型里，仍然是纯数据
}>;

export type SectionResult = { ok: true } | { ok: false; message: string };

export function validateSection(draft: FormDraft, section: SectionId): SectionResult {
  switch (section) {
    case 'base':
      if (!draft.base.title.trim()) return { ok: false, message: '标题必填' };
      return { ok: true };
    case 'items':
      if (draft.items.length === 0) return { ok: false, message: '至少一行明细' };
      return { ok: true };
    default:
      return { ok: true };
  }
}

export function canSubmit(draft: FormDraft): boolean {
  return (['base', 'address', 'items', 'attachments'] as SectionId[]).every(
    (s) => validateSection(draft, s).ok,
  );
}

/** 用 UI 快照生成新草稿（纯函数） */
export function replaceDraft(prev: FormDraft, next: Omit<FormDraft, 'id' | 'version'>): FormDraft {
  return Object.freeze({ ...next, id: prev.id, version: prev.version });
}
```

字段级「必填/格式」可继续用 Form 库 schema；**跨字段、跨 Section、能否提交**必须走 Domain。

### Application Port

```ts
export interface FormRepository {
  load(formId: string, signal?: AbortSignal): Promise<FormDraft>;
  saveDraft(
    draft: FormDraft,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<FormDraft>;
  submit(
    draft: FormDraft,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<FormDraft>;
}
```

Infrastructure 里对 `form:write:${formId}` 做 **latest-wins 队列**（自动保存连打只留最后一次）。

### Presentation：Form 库扛输入，Machine 扛流程

```ts
// 伪代码：Headless 组装
const service = createGiantFormService(api, formId);

// Form 库持有编辑中的值（高频）
const form = useForm({
  defaultValues: emptyUiValues,
  // 从 machine.committed  hydrate 一次即可
});

// 订阅 machine：只关心 phase / error / conflict
service.subscribe((snap) => {
  if (snap.matches('loading')) setBooting(true);
  if (snap.context.committed && snap.matches('editing')) {
    form.reset(toFormValues(snap.context.committed)); // 仅 load / 冲突重载时
  }
});

// 输入：不进 XState
<input {...form.register('base.title')} onBlur={() => markDirty()} />

function markDirty() {
  service.send({ type: 'DRAFT_DIRTY' });
}

// debounce 自动保存：此时才把快照喂给 machine
const debouncedAutosave = debounce(() => {
  const draft = toDomainDraft(form.getValues(), service.getSnapshot().context);
  if (!canSubmitPartial(draft)) return; // 或只存合法 section
  service.send({ type: 'AUTOSAVE', draft });
}, 500);

// 最终提交
function onSubmit() {
  const draft = toDomainDraft(form.getValues(), service.getSnapshot().context);
  if (!canSubmit(draft)) {
    // 用 Domain 结果高亮 section，不必让 machine 知道每个字段
    return;
  }
  service.send({ type: 'SUBMIT', draft });
}
```

Machine 片段（只展示编排，不展示 200 字段）：

```ts
editing: {
  on: {
    DRAFT_DIRTY: { actions: assign({ dirty: true }) },
    AUTOSAVE: { target: 'autosaving' },
    SAVE: { target: 'autosaving' },
    SUBMIT: [
      {
        guard: ({ event }) => canSubmit(event.draft),
        target: 'submitting',
      },
      {
        actions: assign(({ event }) => ({
          sectionErrors: collectSectionErrors(event.draft),
        })),
      },
    ],
  },
},
autosaving: {
  entry: assign(({ context }) => ({ epoch: context.epoch + 1 })),
  invoke: {
    src: 'saveDraft',
    input: ({ context, event }) => ({
      draft: event.type === 'AUTOSAVE' || event.type === 'SAVE' ? event.draft : context.committed!,
      expectedVersion: context.version,
      epoch: context.epoch + 1,
    }),
    onDone: {
      target: 'editing',
      // epoch 比对后写入 version / committed
      actions: assign(({ event }) => ({
        committed: event.output.draft,
        version: event.output.draft.version,
        dirty: false,
        lastSavedAt: Date.now(),
        conflict: false,
      })),
    },
    onError: [
      { guard: isVersionConflict, target: 'conflict' },
      { target: 'editing', actions: assignError },
    ],
  },
},
```

### 要不要「每 Section 一个 Actor」？

| 场景 | 建议 |
|------|------|
| 单页巨表 + 自动保存 | **一个** formMachine + Form 库；够用 |
| 向导 / 分支步骤（A→B 或 A→C） | Machine 用 **states 表示步骤**；每步校验后 `NEXT` 合并 draft |
| Section 有独立异步（上传、远程搜 SKU） | 该 Section **spawn 子 actor**；父机只收 `SECTION_DONE` / `SECTION_ERROR` |
| 每个字段一台 machine | **通常不值得**；同步成本高、易重复数据 |

子 actor 原则：**不要每键 `sendParent`**；只在 blur、上传完成、需要父级改路由时上报。

### Wizard（多步）时 context 怎么放

```ts
context: {
  version: 0,
  epoch: 0,
  /** 已确认过的步骤答案；merge 不 replace */
  answers: {} as Partial<FormDraft>,
},
states: {
  base: { on: { NEXT: { guard: 'baseOk', target: 'address', actions: 'mergeAnswers' } } },
  address: { on: { NEXT: { guard: 'addressOk', target: 'items', actions: 'mergeAnswers' }, BACK: 'base' } },
  items: { on: { NEXT: { target: 'review', actions: 'mergeAnswers' }, BACK: 'address' } },
  review: { on: { SUBMIT: 'submitting' } },
  submitting: { invoke: { /* SubmitForm use-case */ } },
}
```

- **步骤** = states  
- **已确认答案** = context.answers（步进时写入，不是每键）  
- **当前步未确认输入** = 步骤组件本地 / Form 库  

### 巨型 Form 的竞态要点

| 问题 | 做法 |
|------|------|
| 自动保存打字中途乱序 | Infra `RequestQueue` key=`form:write:${id}` + debounce 后只发最后快照 |
| 保存回来覆盖正在编辑的字 | **不要**用 save 响应当权威去 `form.reset`；只更新 `version`；除非用户显式「重载」 |
| 提交时草稿比已保存新 | `SUBMIT` 事件携带 **当前 form.getValues() 快照**，不要只信 `context.committed` |
| 版本冲突 | `conflict` 状态；提供 reload（丢本地）或 overwrite（带最新 expectedVersion 再存） |
| 过期写回 | 与购物车相同：`epoch` 丢弃 |

### 目录（Form 专用增量）

```text
src/
├── domain/form/
│   ├── FormDraft.ts
│   ├── validateSection.ts
│   └── canSubmit.ts
├── application/
│   ├── ports/FormRepository.ts
│   └── use-cases/SaveDraft.ts | SubmitForm.ts | LoadForm.ts
├── infrastructure/repositories/HttpFormRepository.ts
└── presentation/
    ├── machines/giantFormMachine.ts   # 瘦编排
    ├── services/giantFormService.ts   # Headless
    └── forms/
        ├── schema.ts                  # UI schema（格式/必填）
        ├── toDomainDraft.ts           # UI values → FormDraft
        └── toFormValues.ts            # FormDraft → UI values
```

### 选型速查

```text
「这个值会不会因为一次击键就变？」
  是 → Form 库 / 本地 state
  否，且改变流程（能否点提交、是否在保存、第几步）→ XState

「这条规则换 UI 框架还成立吗？」
  是 → Domain
  否 → Presentation schema
```

---

*本文档为可复制骨架：按聚合（Cart / Order / FormDraft / …）复制 `domain` + `ports` + `Http*Repository` + `*Machine` 即可横向扩展。*
