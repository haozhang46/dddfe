import type { Option } from '../../domain/order/ensureCityValid'

export const PROVINCES: Option[] = [
  { value: '浙江', label: '浙江' },
  { value: '江苏', label: '江苏' },
]

const CITIES: Record<string, Option[]> = {
  浙江: [
    { value: '杭州', label: '杭州' },
    { value: '宁波', label: '宁波' },
  ],
  江苏: [
    { value: '南京', label: '南京' },
    { value: '苏州', label: '苏州' },
  ],
}

export function citiesOf(province: string): Option[] {
  return CITIES[province] ?? []
}
