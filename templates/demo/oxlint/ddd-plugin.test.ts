import { RuleTester } from 'oxlint/plugins-dev'
import { describe, it } from 'vitest'
import plugin from './ddd-plugin.js'

RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: { sourceType: 'module', parserOptions: { lang: 'ts' } },
})

const rules = plugin.rules

tester.run('domain-purity', rules['domain-purity'], {
  valid: [
    {
      name: 'immer and same-context siblings',
      filename: 'src/domain/order/applyChange.ts',
      code: `
        import { produce } from 'immer'
        import { setPath } from './model'
        export const x = produce
        export const y = setPath
      `,
    },
    {
      name: 'vitest only in a domain test',
      filename: 'src/domain/order/applyChange.test.ts',
      code: `import { describe } from 'vitest'\nexport const x = describe\n`,
    },
    {
      name: 'react outside domain',
      filename: 'src/presentation/pages/order/index.tsx',
      code: `import { useState } from 'react'\nexport const x = useState\n`,
    },
  ],
  invalid: [
    {
      name: 'react in domain',
      filename: 'src/domain/order/model.ts',
      code: `import React from 'react'\nexport const x = React\n`,
      errors: [{ message: /src\/application\/ports/ }],
    },
    {
      name: 'queue in domain',
      filename: 'src/domain/order/applyChange.ts',
      code: `import { RequestQueue } from '../../infrastructure/queue/RequestQueue'\nexport const x = RequestQueue\n`,
      errors: [{ messageId: 'import' }],
    },
    {
      name: 'fetch in domain',
      filename: 'src/domain/order/load.ts',
      code: `export function load() { return fetch('/orders') }\n`,
      errors: [{ message: /src\/application\/ports/ }],
    },
    {
      name: 'sessionStorage in domain',
      filename: 'src/domain/user/model.ts',
      code: `export function read() { return sessionStorage.getItem('dddfe.authJson') }\n`,
      errors: [{ messageId: 'io' }],
    },
    {
      name: 'vitest in a non-test domain file',
      filename: 'src/domain/order/model.ts',
      code: `import { describe } from 'vitest'\nexport const x = describe\n`,
      errors: [{ messageId: 'import' }],
    },
  ],
})

tester.run('domain-barrel', rules['domain-barrel'], {
  valid: [
    {
      name: 'application imports the barrel',
      filename: 'src/application/use-cases/changeField.ts',
      code: `import { applyChange } from '../../domain/order'\nexport const x = applyChange\n`,
    },
    {
      name: 'same context may import private files',
      filename: 'src/domain/order/applyChange.ts',
      code: `import { setPath } from './model'\nexport const x = setPath\n`,
    },
    {
      name: 'cross-context barrel',
      filename: 'src/domain/user/permissions.ts',
      code: `import { createOrderDraft } from '../order'\nexport const x = createOrderDraft\n`,
    },
    {
      name: 'barrel index',
      filename: 'src/presentation/pages/order/buildViewModel.ts',
      code: `import { canSubmit } from '../../../domain/order/index'\nexport const x = canSubmit\n`,
    },
  ],
  invalid: [
    {
      name: 'deep import from application',
      filename: 'src/application/use-cases/changeField.ts',
      code: `import { applyChange } from '../../domain/order/applyChange'\nexport const x = applyChange\n`,
      errors: [{ message: /src\/domain\/order/ }],
    },
    {
      name: 'deep import across bounded contexts',
      filename: 'src/domain/user/permissions.ts',
      code: `import { setPath } from '../order/model'\nexport const x = setPath\n`,
      errors: [{ messageId: 'deep' }],
    },
  ],
})

tester.run('application-boundary', rules['application-boundary'], {
  valid: [
    {
      name: 'use case calls domain and a sibling',
      filename: 'src/application/use-cases/changeField.ts',
      code: `
        import { applyChange } from '../../domain/order'
        import type { LoadCities } from './loadCities'
        export const x = applyChange
        export type Y = LoadCities
      `,
    },
    {
      name: 'port imports a domain type',
      filename: 'src/application/ports/OrderRepository.ts',
      code: `import type { OrderDraft } from '../../domain/order'\nexport type OrderRepository = { draft: OrderDraft }\n`,
    },
    {
      name: 'fetch is fine in infrastructure',
      filename: 'src/infrastructure/repositories/MockOrderRepository.ts',
      code: `export function load() { return fetch('/orders') }\n`,
    },
  ],
  invalid: [
    {
      name: 'use case imports a repository',
      filename: 'src/application/use-cases/saveDraft.ts',
      code: `import { RequestQueue } from '../../infrastructure/queue/RequestQueue'\nexport const x = RequestQueue\n`,
      errors: [{ message: /createDeps/ }],
    },
    {
      name: 'use case imports react',
      filename: 'src/application/use-cases/login.ts',
      code: `import { useState } from 'react'\nexport const x = useState\n`,
      errors: [{ messageId: 'import' }],
    },
    {
      name: 'use case calls fetch',
      filename: 'src/application/use-cases/loadOrder.ts',
      code: `export function load() { return fetch('/orders') }\n`,
      errors: [{ message: /src\/application\/ports/ }],
    },
    {
      name: 'use case reads sessionStorage',
      filename: 'src/application/use-cases/loadSession.ts',
      code: `export function read() { return sessionStorage.getItem('dddfe.authJson') }\n`,
      errors: [{ messageId: 'io' }],
    },
  ],
})

tester.run('infrastructure-boundary', rules['infrastructure-boundary'], {
  valid: [
    {
      name: 'adapter implements a port and uses domain',
      filename: 'src/infrastructure/repositories/MockOrderRepository.ts',
      code: `
        import type { OrderRepository } from '../../application/ports/OrderRepository'
        import { createOrderDraft } from '../../domain/order'
        import { delay } from '../mock/delay'
        export const x = createOrderDraft
        export type Y = OrderRepository
      `,
    },
    {
      name: 'queue may use rxjs',
      filename: 'src/infrastructure/queue/RequestQueue.ts',
      code: `import { Subject } from 'rxjs'\nexport const x = Subject\n`,
    },
  ],
  invalid: [
    {
      name: 'adapter imports a use case',
      filename: 'src/infrastructure/repositories/MockOrderRepository.ts',
      code: `import { createChangeField } from '../../application/use-cases/changeField'\nexport const x = createChangeField\n`,
      errors: [{ message: /src\/application\/ports/ }],
    },
    {
      name: 'adapter imports presentation',
      filename: 'src/infrastructure/auth/MockAuthRepository.ts',
      code: `import { LoginPage } from '../../presentation/pages/login/LoginPage'\nexport const x = LoginPage\n`,
      errors: [{ messageId: 'import' }],
    },
    {
      name: 'adapter imports react',
      filename: 'src/infrastructure/auth/SessionStorageAuthStore.ts',
      code: `import { useState } from 'react'\nexport const x = useState\n`,
      errors: [{ messageId: 'import' }],
    },
  ],
})

tester.run('section-viewmodel', rules['section-viewmodel'], {
  valid: [
    {
      name: 'section takes a type and forwards through props',
      filename: 'src/presentation/pages/order/components/AddressSection.tsx',
      code: `
        import type { Option } from '../../../../domain/order'
        import { PROVINCES } from '../constants'
        export const options: Option[] = []
        export const provinces = PROVINCES
      `,
    },
    {
      name: 'inline type import',
      filename: 'src/presentation/pages/order/components/PaySection.tsx',
      code: `import { type PayType } from '../../../../domain/order'\nexport type X = PayType\n`,
    },
    {
      name: 'buildViewModel may call domain helpers',
      filename: 'src/presentation/pages/order/buildViewModel.ts',
      code: `import { canSubmit } from '../../../domain/order'\nexport const x = canSubmit\n`,
    },
    {
      name: 'shared Can may call hasPermission',
      filename: 'src/presentation/components/Can.tsx',
      code: `import { hasPermission } from '../../domain/user'\nexport const x = hasPermission\n`,
    },
  ],
  invalid: [
    {
      name: 'section value-imports applyChange',
      filename: 'src/presentation/pages/order/components/QtySection.tsx',
      code: `import { applyChange } from '../../../../domain/order'\nexport const x = applyChange\n`,
      errors: [{ message: /orchestrator\.changeField/ }],
    },
    {
      name: 'section imports a repository',
      filename: 'src/presentation/pages/order/components/SaveBar.tsx',
      code: `import { createMockOrderRepository } from '../../../../infrastructure/repositories/MockOrderRepository'\nexport const x = createMockOrderRepository\n`,
      errors: [{ messageId: 'import' }],
    },
    {
      name: 'section calls applyChange',
      filename: 'src/presentation/pages/order/components/AmountSection.tsx',
      code: `export function onChange(draft: unknown) { return applyChange(draft, { path: 'qty', value: 1 }) }\n`,
      errors: [{ message: /orchestrator\.changeField/ }],
    },
  ],
})

tester.run('apply-change-name', rules['apply-change-name'], {
  valid: [
    {
      name: 'the mutation entry is applyChange',
      filename: 'src/domain/order/applyChange.ts',
      code: `export function applyChange() { return 1 }\n`,
    },
    {
      name: 'pipeline steps keep their names',
      filename: 'src/domain/order/derived.ts',
      code: `
        export function applyDerived() { return 1 }
        export function applyReactions() { return 1 }
        export function applyVisibility() { return 1 }
      `,
    },
    {
      name: 'a renamed mutation outside domain is ignored',
      filename: 'src/presentation/pages/order/orchestrator.ts',
      code: `export function updateOrder() { return 1 }\n`,
    },
  ],
  invalid: [
    {
      name: 'per-context mutation name',
      filename: 'src/domain/order/applyChange.ts',
      code: `export function applyOrderChange() { return 1 }\n`,
      errors: [{ message: /`applyChange`/ }],
    },
    {
      name: 'updateOrder arrow',
      filename: 'src/domain/pay/model.ts',
      code: `export const updateOrder = () => 1\n`,
      errors: [{ message: /src\/domain\/pay/ }],
    },
    {
      name: 'mutateDraft',
      filename: 'src/domain/order/model.ts',
      code: `export function mutateDraft() { return 1 }\n`,
      errors: [{ messageId: 'rename' }],
    },
  ],
})
