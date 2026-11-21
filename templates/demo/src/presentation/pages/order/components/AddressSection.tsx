import type { Option } from "../../../../domain/order";
import { Select } from "../../../components/base";
import { PROVINCES } from "../constants";

type Props = {
  province: string;
  city: string;
  cityOptions: Option[];
  onProvince: (v: string) => void;
  onCity: (v: string) => void;
};

export function AddressSection({ province, city, cityOptions, onProvince, onCity }: Props) {
  return (
    <fieldset className="section">
      <legend>地址</legend>
      <label>
        省
        <Select value={province} onChange={(e) => onProvince(e.target.value)}>
          <option value="">请选择</option>
          {PROVINCES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </label>
      <label>
        市
        <Select value={city} onChange={(e) => onCity(e.target.value)} disabled={!province}>
          <option value="">请选择</option>
          {cityOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </label>
    </fieldset>
  );
}
