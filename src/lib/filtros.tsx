"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { VENTAS, type Venta } from "./datos";

export type Filtros = {
  anios: number[];
  trim: number | null;
  mes: number | null;
  zona: string | null;
  pais: string | null; // iso3
  producto: string | null;
  canal: string | null;
  prioridad: string | null;
  segmento: string | null;
  grupo: string | null;
  cliente: string | null;
};
export type Dim = keyof Filtros;

export const FILTROS_VACIOS: Filtros = {
  anios: [], trim: null, mes: null, zona: null, pais: null, producto: null, canal: null,
  prioridad: null, segmento: null, grupo: null, cliente: null,
};

export function aplicar(rows: Venta[], f: Filtros, excluir: Dim[] = []): Venta[] {
  const ex = new Set(excluir);
  return rows.filter((r) =>
    (ex.has("anios") || !f.anios.length || f.anios.includes(r.anio)) &&
    (ex.has("trim") || f.trim == null || r.trim === f.trim) &&
    (ex.has("mes") || f.mes == null || r.mes === f.mes) &&
    (ex.has("zona") || !f.zona || r.zona === f.zona) &&
    (ex.has("pais") || !f.pais || r.iso3 === f.pais) &&
    (ex.has("producto") || !f.producto || r.producto === f.producto) &&
    (ex.has("canal") || !f.canal || r.canal === f.canal) &&
    (ex.has("prioridad") || !f.prioridad || r.prioridad === f.prioridad) &&
    (ex.has("segmento") || !f.segmento || r.segmento === f.segmento) &&
    (ex.has("grupo") || !f.grupo || r.grupo === f.grupo) &&
    (ex.has("cliente") || !f.cliente || r.cliente === f.cliente),
  );
}

export type Pestana = "operativo" | "tactico" | "estrategico" | "presentacion" | "datos";

type Ctx = {
  f: Filtros;
  set: <K extends Dim>(k: K, v: Filtros[K]) => void;
  toggle: (k: Exclude<Dim, "anios">, v: string | number) => void;
  toggleAnio: (a: number) => void;
  limpiar: () => void;
  reemplazar: (f: Partial<Filtros>) => void;
  ventas: Venta[];
  /** ventas filtradas sin aplicar las dimensiones indicadas (para filtros cruzados) */
  sin: (...d: Dim[]) => Venta[];
  pestana: Pestana;
  irA: (p: Pestana, f?: Partial<Filtros>) => void;
};
const C = createContext<Ctx | null>(null);

export function ProveedorFiltros({ children, inicial }: { children: ReactNode; inicial: Pestana }) {
  const [f, setF] = useState<Filtros>(FILTROS_VACIOS);
  const [pestana, setPestana] = useState<Pestana>(inicial);

  const set = useCallback(<K extends Dim>(k: K, v: Filtros[K]) => setF((o) => ({ ...o, [k]: v })), []);
  const toggle = useCallback((k: Exclude<Dim, "anios">, v: string | number) =>
    setF((o) => {
      const n = { ...o, [k]: o[k] === v ? null : v } as Filtros;
      if (k === "zona" && n.zona) n.pais = null;
      if (k === "trim" && n.trim == null) n.mes = null;
      return n;
    }), []);
  const toggleAnio = useCallback((a: number) =>
    setF((o) => ({ ...o, anios: o.anios.includes(a) ? o.anios.filter((x) => x !== a) : [...o.anios, a].sort() })), []);
  const limpiar = useCallback(() => setF(FILTROS_VACIOS), []);
  const reemplazar = useCallback((p: Partial<Filtros>) => setF({ ...FILTROS_VACIOS, ...p }), []);
  const irA = useCallback((p: Pestana, nf?: Partial<Filtros>) => {
    if (nf) setF({ ...FILTROS_VACIOS, ...nf });
    setPestana(p);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${p}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const ventas = useMemo(() => aplicar(VENTAS, f), [f]);
  const sin = useCallback((...d: Dim[]) => aplicar(VENTAS, f, d), [f]);

  const value = useMemo(
    () => ({ f, set, toggle, toggleAnio, limpiar, reemplazar, ventas, sin, pestana, irA }),
    [f, set, toggle, toggleAnio, limpiar, reemplazar, ventas, sin, pestana, irA],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useFiltros() {
  const c = useContext(C);
  if (!c) throw new Error("useFiltros fuera del proveedor");
  return c;
}
