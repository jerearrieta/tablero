// Genera src/data/*.json a partir de datos/*.json (salida de limpiar.py).
// Uso: npm run datos
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const paises = require("i18n-iso-countries");

const leer = (n) => JSON.parse(fs.readFileSync(`datos/${n}.json`, "utf8"));
const ventas = leer("ventas");
const clientes = leer("clientes");
const proveedores = leer("proveedores");
const cli = new Map(clientes.map((c) => [c.cliente_id, c]));

const v = ventas.map((r) => {
  const c = cli.get(r.cliente_id);
  return {
    id: String(r.pedido_id),
    fecha: r.fecha_pedido,
    envio: r.fecha_envio,
    dias: r.dias_envio,
    anio: r.anio,
    trim: r.trimestre,
    mes: r.mes,
    ds: r.dia_semana,
    cliente: r.cliente_id,
    clienteOrig: r.cliente_id_original,
    proveedor: r.proveedor_id,
    zona: r.zona,
    pais: r.pais,
    iso3: r.pais_iso3,
    producto: r.producto,
    canal: r.canal,
    prioridad: r.prioridad,
    unidades: r.unidades,
    precio: r.precio_unitario,
    costeU: r.coste_unitario,
    venta: r.venta,
    coste: r.coste,
    margen: r.margen,
    segmento: c?.segmento_rfm ?? "Sin cliente",
    grupo: c?.grupo ?? "?",
    paisCliente: c?.pais_cliente ?? "?",
  };
});

const c = clientes.map((r) => ({
  id: r.cliente_id,
  nombre: r.nombre,
  grupo: r.grupo,
  edad: r.edad,
  alta: r.fecha_alta,
  antig: r.antiguedad_anios,
  pais: r.pais_cliente,
  ciudad: r.ciudad,
  estado: r.estado,
  email: r.email,
  frecuencia: r.frecuencia,
  venta: r.venta_total ?? 0,
  margen: r.margen_total ?? 0,
  recencia: r.recencia_dias,
  primer: r.primer_pedido,
  ultimo: r.ultimo_pedido,
  R: r.R, F: r.F, M: r.M,
  segmento: r.segmento_rfm,
  antesAlta: r.pedido_antes_del_alta,
  emailDup: r.email_duplicado,
}));

const p = proveedores.map((r) => ({
  id: r.proveedor_id,
  nombre: r.proveedor,
  contacto: r.contacto,
  email: r.email,
  telefono: r.telefono,
  saldo: r.saldo_pendiente,
  ultima: r.ultima_compra,
  diasSin: r.dias_sin_compra,
  estado: r.estado_actividad.split(" ")[0], // Activo | Inactivo | Dormido
  categoria: r.categoria_asignada,
  pedidos: r.pedidos_asignados ?? 0,
  costeAsig: r.coste_asignado ?? 0,
  emailDup: r.email_duplicado,
}));

// ISO3 -> código numérico (ids de world-atlas)
const iso = {};
const sinCodigo = [];
for (const r of v) {
  if (iso[r.iso3]) continue;
  const n = paises.alpha3ToNumeric(r.iso3);
  if (n) iso[r.iso3] = n; else sinCodigo.push(r.iso3);
}
if (iso.XKX === undefined && v.some((r) => r.iso3 === "XKX")) iso.XKX = "-99";

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/ventas.json", JSON.stringify(v));
fs.writeFileSync("src/data/clientes.json", JSON.stringify(c));
fs.writeFileSync("src/data/proveedores.json", JSON.stringify(p));
fs.writeFileSync("src/data/iso.json", JSON.stringify(iso));
console.log(`ventas ${v.length} · clientes ${c.length} · proveedores ${p.length} · países ${Object.keys(iso).length}`, sinCodigo.length ? `sin código: ${[...new Set(sinCodigo)]}` : "");
