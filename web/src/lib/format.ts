// 0.844 -> "84%" (or "84.4%" with digits = 1)
export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`
