import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

const datePickerRoot = mkdtempSync(join(tmpdir(), 'ddd-base-'))
mkdirSync(join(datePickerRoot, 'src/presentation/components/base'), { recursive: true })
writeFileSync(
  join(datePickerRoot, 'src/presentation/components/base/DatePicker.tsx'),
  'export function DatePicker() { return null }\n',
)

const on = (components: string[]) => ({ options: [{ components }] })

tester.run('base-component', rules['base-component'], {
  valid: [
    {
      name: 'native date input while no base file exists',
      filename: 'src/presentation/pages/order/index.tsx',
      code: 'export const x = <input type="date" />\n',
    },
    {
      name: 'radio and number are not DatePicker or Input',
      filename: 'src/presentation/pages/order/components/PaySection.tsx',
      ...on(['DatePicker', 'Input']),
      code: 'export const x = <><input type="radio" /><input type="number" /></>\n',
    },
    {
      name: 'the base DatePicker implements itself with a native input',
      filename: 'src/presentation/components/base/DatePicker.tsx',
      ...on(['DatePicker']),
      code: 'export function DatePicker() { return <input type="date" /> }\n',
    },
    {
      name: 'pages import the base widgets',
      filename: 'src/presentation/pages/order/index.tsx',
      ...on(['DatePicker', 'Form']),
      code: `
        import { DatePicker } from '../../components/base/DatePicker'
        import { Form } from '../../components/base/Form'
        export const x = <Form><DatePicker /></Form>
      `,
    },
    {
      name: 'a namespace import of the base folder',
      filename: 'src/presentation/pages/order/index.tsx',
      ...on(['DatePicker']),
      code: `
        import * as Base from '../../components/base'
        export const x = <Base.DatePicker />
      `,
    },
    {
      name: 'Text does not claim buttons',
      filename: 'src/presentation/pages/order/components/SaveBar.tsx',
      ...on(['Text']),
      code: 'export const x = <button type="button">保存</button>\n',
    },
    {
      name: 'antd Button is unrelated to DatePicker',
      filename: 'src/presentation/pages/order/index.tsx',
      ...on(['DatePicker']),
      code: `import { Button } from 'antd'\nexport const x = Button\n`,
    },
    {
      name: 'number input stays legal when only DatePicker.tsx is on disk',
      cwd: datePickerRoot,
      filename: 'src/presentation/pages/order/components/QtySection.tsx',
      code: 'export const x = <input type="number" />\n',
    },
  ],
  invalid: [
    {
      name: 'date input',
      filename: 'src/presentation/pages/order/index.tsx',
      ...on(['DatePicker']),
      code: 'export const x = <input type="date" />\n',
      errors: [{ message: /base\/DatePicker/ }],
    },
    {
      name: 'date input with an expression literal',
      filename: 'src/presentation/pages/order/components/QtySection.tsx',
      ...on(['DatePicker']),
      code: 'export const x = <input type={"date"} />\n',
      errors: [{ message: /<input type="date">/ }],
    },
    {
      name: 'form element',
      filename: 'src/presentation/pages/login/LoginPage.tsx',
      ...on(['Form']),
      code: 'export const x = <form />\n',
      errors: [{ message: /base\/Form/ }],
    },
    {
      name: 'paragraph and a third-party DatePicker in one file',
      filename: 'src/presentation/pages/order/index.tsx',
      ...on(['Text', 'DatePicker']),
      code: `
        import { DatePicker } from 'antd'
        export const x = <p><DatePicker /></p>
      `,
      errors: [{ message: /importing `DatePicker` from `antd`/ }, { message: /base\/Text/ }],
    },
    {
      name: 'react-datepicker package',
      filename: 'src/presentation/pages/order/index.tsx',
      ...on(['DatePicker']),
      code: `import Picker from 'react-datepicker'\nexport const x = Picker\n`,
      errors: [{ message: /react-datepicker/ }],
    },
    {
      name: 'member date picker from another library',
      filename: 'src/presentation/pages/order/components/AddressSection.tsx',
      ...on(['DatePicker']),
      code: `
        import * as Antd from 'antd'
        export const x = <Antd.DatePicker />
      `,
      errors: [{ message: /<Antd\.DatePicker>/ }],
    },
    {
      name: 'bare DatePicker with no base import',
      filename: 'src/presentation/pages/order/components/AmountSection.tsx',
      ...on(['DatePicker']),
      code: 'export const x = <DatePicker />\n',
      errors: [{ message: /<DatePicker>/ }],
    },
    {
      name: 'textarea belongs to Input',
      filename: 'src/presentation/pages/order/components/QtySection.tsx',
      ...on(['Input']),
      code: 'export const x = <textarea />\n',
      errors: [{ message: /base\/Input/ }],
    },
    {
      name: 'select belongs to Select',
      filename: 'src/presentation/pages/order/components/AddressSection.tsx',
      ...on(['Select']),
      code: 'export const x = <select />\n',
      errors: [{ messageId: 'instead' }],
    },
    {
      name: 'disk discovery turns on DatePicker',
      cwd: datePickerRoot,
      filename: 'src/presentation/pages/order/index.tsx',
      code: 'export const x = <input type="datetime-local" />\n',
      errors: [{ message: /base\/DatePicker/ }],
    },
  ],
})
