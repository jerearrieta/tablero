const nf = (o: Intl.NumberFormatOptions) => new Intl.NumberFormat("es-PA", o);
const ent = nf({ maximumFractionDigits: 0 });
const dec1 = nf({ maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** USD abreviado: 1,29 mil M → "1.289 M US$" */
export function usd(n: number, abreviar = true): string {
  if (!abreviar) return `${ent.format(n)} US$`;
  const a = Math.abs(n);
  if (a >= 1e8) return `${ent.format(n / 1e6)} M US$`;
  if (a >= 1e6) return `${dec1.format(n / 1e6)} M US$`;
  if (a >= 1e3) return `${dec1.format(n / 1e3)} mil US$`;
  return `${ent.format(n)} US$`;
}
/** Eje: sin unidad, compacto */
export function eje(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${dec1.format(n / 1e9)}B`;
  if (a >= 1e6) return `${ent.format(n / 1e6)} M`;
  if (a >= 1e3) return `${ent.format(n / 1e3)} k`;
  return ent.format(n);
}
export const num = (n: number) => ent.format(n);
export const porc = (x: number, d = 1) => `${nf({ maximumFractionDigits: d, minimumFractionDigits: d }).format(x * 100)} %`;
export const dias = (n: number) => `${dec1.format(n)} días`;
export function fecha(s: string | null | undefined): string {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}
