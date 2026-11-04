"use client";
import { useMemo, useState, type ReactNode } from "react";

export function Tarjeta({ titulo, sub, extra, children, className = "c6", nota, insight }: {
  titulo: string; sub?: ReactNode; extra?: ReactNode; children: ReactNode; className?: string; nota?: ReactNode; insight?: ReactNode;
}) {
  return (
    <section className={`tarjeta ${className}`}>
      <div className="tarjeta-cab">
        <div>
          <h3>{titulo}</h3>
          {sub && <div className="sub">{sub}</div>}
        </div>
        {extra}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {insight && <div className="insight">{insight}</div>}
      {nota && <div className="nota">{nota}</div>}
    </section>
  );
}

export function Kpi({ titulo, valor, sub, icono }: { titulo: string; valor: ReactNode; sub?: ReactNode; icono?: ReactNode }) {
  return (
    <div className="kpi">
      <div className="t">{icono}{titulo}</div>
      <div className="v">{valor}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

export function Seg<T extends string>({ opciones, valor, onChange, etiqueta }: {
  opciones: { v: T; t: string }[]; valor: T; onChange: (v: T) => void; etiqueta?: string;
}) {
  return (
    <div className="seg" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.v} aria-pressed={valor === o.v} onClick={() => onChange(o.v)}>{o.t}</button>
      ))}
    </div>
  );
}

export function Seccion({ titulo, sub }: { titulo: string; sub?: string }) {
  return <div className="seccion"><h2>{titulo}</h2>{sub && <span>{sub}</span>}</div>;
}

/** Tooltip genérico para Recharts */
export function Tip({ active, payload, titulo, filas, pista }: {
  active?: boolean; payload?: any[]; titulo: (p: any) => ReactNode; filas: (p: any) => [string, ReactNode][]; pista?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tip">
      <div className="tt">{titulo(p)}</div>
      {filas(p).map(([k, v]) => <div className="fila" key={k}><span>{k}</span><b>{v}</b></div>)}
      {pista && <div className="pista">{pista}</div>}
    </div>
  );
}

/** Barras horizontales clicables (filtro cruzado). Un solo color; la selección se resalta y el resto se apaga. */
export function BarrasH({ datos, seleccion, onClick, formato, color = "var(--s1)", max }: {
  datos: { k: string; v: number; sub?: string; titulo?: string }[];
  seleccion?: string | null; onClick?: (k: string) => void; formato: (n: number) => string; color?: string; max?: number;
}) {
  const m = max ?? Math.max(...datos.map((d) => d.v), 1);
  return (
    <div className="hbar">
      {datos.map((d) => {
        const apagado = seleccion && seleccion !== d.k;
        return (
          <Fila key={d.k}>
            <div className="n" title={d.k}>{d.k}</div>
            <div className={`tr ${apagado ? "apagado" : ""}`} onClick={() => onClick?.(d.k)} role={onClick ? "button" : undefined}
              title={d.titulo ?? `${d.k}: ${formato(d.v)}${onClick ? " · clic para filtrar" : ""}`}
              style={{ cursor: onClick ? "pointer" : "default" }}>
              <span style={{ width: `${Math.max(0.5, (d.v / m) * 100)}%`, background: apagado ? undefined : color }} />
            </div>
            <div className="val">{formato(d.v)}{d.sub && <span style={{ color: "var(--text-3)", fontWeight: 400 }}> · {d.sub}</span>}</div>
          </Fila>
        );
      })}
    </div>
  );
}
function Fila({ children }: { children: ReactNode }) { return <>{children}</>; }

export type Col<T> = { k: string; t: string; v: (r: T) => ReactNode; orden?: (r: T) => number | string; num?: boolean };

export function Tabla<T>({ filas, cols, porPagina = 10, buscar, onFila, seleccion, clave, ordenInicial, desc = true, extra }: {
  filas: T[]; cols: Col<T>[]; porPagina?: number; buscar?: (r: T) => string; onFila?: (r: T) => void;
  seleccion?: string | null; clave: (r: T) => string; ordenInicial?: string; desc?: boolean; extra?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<{ k?: string; desc: boolean }>({ k: ordenInicial, desc });
  const [pag, setPag] = useState(0);
  const lista = useMemo(() => {
    let l = filas;
    if (q && buscar) { const s = q.toLowerCase(); l = l.filter((r) => buscar(r).toLowerCase().includes(s)); }
    const c = cols.find((c) => c.k === orden.k);
    if (c?.orden) {
      const f = c.orden;
      l = [...l].sort((a, b) => { const x = f(a), y = f(b); const r = x < y ? -1 : x > y ? 1 : 0; return orden.desc ? -r : r; });
    }
    return l;
  }, [filas, q, buscar, cols, orden]);
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const p = Math.min(pag, paginas - 1);
  const vis = lista.slice(p * porPagina, (p + 1) * porPagina);
  return (
    <div>
      {(buscar || extra) && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          {buscar && <input className="buscar" placeholder="Buscar…" value={q} onChange={(e) => { setQ(e.target.value); setPag(0); }} />}
          {extra}
        </div>
      )}
      <div className="tabla-env">
        <table className="tabla">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.k} className={c.num ? "num" : ""} onClick={() => c.orden && setOrden((o) => ({ k: c.k, desc: o.k === c.k ? !o.desc : true }))}
                  aria-sort={orden.k === c.k ? (orden.desc ? "descending" : "ascending") : undefined}>
                  {c.t}{orden.k === c.k ? (orden.desc ? " ↓" : " ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vis.map((r) => (
              <tr key={clave(r)} className={`${onFila ? "clic" : ""} ${seleccion === clave(r) ? "sel" : ""}`} onClick={() => onFila?.(r)}>
                {cols.map((c) => <td key={c.k} className={c.num ? "num" : ""}>{c.v(r)}</td>)}
              </tr>
            ))}
            {!vis.length && <tr><td colSpan={cols.length} style={{ textAlign: "center", color: "var(--text-3)", padding: 20 }}>Sin resultados con estos filtros</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="tabla-pie">
        <span>{lista.length.toLocaleString("es-PA")} filas</span>
        {paginas > 1 && (
          <span className="pag">
            Página {p + 1} de {paginas}
            <button disabled={p === 0} onClick={() => setPag(p - 1)} aria-label="Anterior">‹</button>
            <button disabled={p >= paginas - 1} onClick={() => setPag(p + 1)} aria-label="Siguiente">›</button>
          </span>
        )}
      </div>
    </div>
  );
}

export const COLOR_ESTADO: Record<string, string> = { Activo: "var(--good)", Inactivo: "var(--warning)", Dormido: "var(--critical)" };
export function Estado({ e }: { e: string }) {
  return <span className="estado"><i style={{ background: COLOR_ESTADO[e] }} />{e}</span>;
}

/** Escala secuencial en 7 pasos */
export const SEQ = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)", "var(--seq-6)", "var(--seq-7)"];
export function colorSeq(v: number, min: number, max: number) {
  if (max <= min) return SEQ[3];
  const t = Math.min(0.9999, Math.max(0, (v - min) / (max - min)));
  return SEQ[Math.floor(t * SEQ.length)];
}
export function tintaSeq(v: number, min: number, max: number) {
  const t = max <= min ? 0.5 : (v - min) / (max - min);
  return t > 0.55 ? "var(--seq-ink)" : "var(--text)";
}
