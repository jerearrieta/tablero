import ventasRaw from "@/data/ventas.json";
import clientesRaw from "@/data/clientes.json";
import proveedoresRaw from "@/data/proveedores.json";
import isoRaw from "@/data/iso.json";

export type Venta = {
  id: string; fecha: string; envio: string; dias: number; anio: number; trim: number; mes: number; ds: number;
  cliente: string; clienteOrig: string; proveedor: string; zona: string; pais: string; iso3: string;
  producto: string; canal: string; prioridad: string; unidades: number; precio: number; costeU: number;
  venta: number; coste: number; margen: number; segmento: string; grupo: string; paisCliente: string;
};
export type Cliente = {
  id: string; nombre: string; grupo: string; edad: number; alta: string; antig: number; pais: string;
  ciudad: string | null; estado: string | null; email: string; frecuencia: number; venta: number; margen: number;
  recencia: number | null; primer: string | null; ultimo: string | null; R: number | null; F: number | null; M: number | null;
  segmento: string; antesAlta: boolean; emailDup: boolean;
};
export type Proveedor = {
  id: string; nombre: string; contacto: string; email: string; telefono: string; saldo: number; ultima: string;
  diasSin: number; estado: "Activo" | "Inactivo" | "Dormido"; categoria: string; pedidos: number; costeAsig: number; emailDup: boolean;
};

export const VENTAS = ventasRaw as Venta[];
export const CLIENTES = clientesRaw as Cliente[];
export const PROVEEDORES = proveedoresRaw as Proveedor[];
export const ISO_NUM = isoRaw as Record<string, string>;
export const CLIENTE_POR_ID = new Map(CLIENTES.map((c) => [c.id, c]));
export const PROVEEDOR_POR_ID = new Map(PROVEEDORES.map((p) => [p.id, p]));

export const FECHA_CORTE = "2022-11-08";
export const ANIOS = [2020, 2021, 2022];
export const PRODUCTOS = [...new Set(VENTAS.map((v) => v.producto))].sort((a, b) => a.localeCompare(b, "es"));
export const ZONAS = [...new Set(VENTAS.map((v) => v.zona))].sort((a, b) => a.localeCompare(b, "es"));
export const CANALES = ["Online", "Offline"];
export const PRIORIDADES = ["Crítica", "Alta", "Media", "Baja"];
export const GRUPOS = ["A", "B", "C", "D", "E"];
export const SEGMENTOS = [
  "Campeones", "Leales", "Potenciales leales", "Nuevos", "Necesitan atención",
  "No se pueden perder", "En riesgo", "Hibernando", "Perdidos",
];
export const SEGMENTO_DESC: Record<string, string> = {
  Campeones: "Compraron hace poco, a menudo y mucho.",
  Leales: "Compran con regularidad y gastan bien.",
  "Potenciales leales": "Recientes con frecuencia media: pueden volverse leales.",
  Nuevos: "Primera compra reciente.",
  "Necesitan atención": "Valores medios en todo; empiezan a enfriarse.",
  "No se pueden perder": "Gastaban mucho y con frecuencia, pero hace tiempo que no compran.",
  "En riesgo": "Buenos clientes que llevan bastante sin comprar.",
  Hibernando: "Poca frecuencia y última compra lejana.",
  Perdidos: "Los peores valores de recencia, frecuencia y monto.",
  "Sin compras": "Registrados sin pedidos enlazados.",
};
export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const ESTADOS_PROV = ["Activo", "Inactivo", "Dormido"] as const;
export const ESTADO_DESC: Record<string, string> = {
  Activo: "Última compra hace menos de 1 año",
  Inactivo: "Última compra hace 1 a 3 años",
  Dormido: "Última compra hace más de 3 años",
};

// ---------- utilidades de agregación ----------
export type Agg = { venta: number; coste: number; margen: number; unidades: number; pedidos: number; dias: number };
export const vacio = (): Agg => ({ venta: 0, coste: 0, margen: 0, unidades: 0, pedidos: 0, dias: 0 });
export function sumar(rows: Venta[]): Agg {
  const a = vacio();
  for (const r of rows) {
    a.venta += r.venta; a.coste += r.coste; a.margen += r.margen; a.unidades += r.unidades; a.pedidos++; a.dias += r.dias;
  }
  return a;
}
export function agrupar<K extends string | number>(rows: Venta[], key: (r: Venta) => K): Map<K, Agg> {
  const m = new Map<K, Agg>();
  for (const r of rows) {
    const k = key(r);
    let a = m.get(k);
    if (!a) { a = vacio(); m.set(k, a); }
    a.venta += r.venta; a.coste += r.coste; a.margen += r.margen; a.unidades += r.unidades; a.pedidos++; a.dias += r.dias;
  }
  return m;
}
export const pct = (a: Agg) => (a.venta ? a.margen / a.venta : 0);
