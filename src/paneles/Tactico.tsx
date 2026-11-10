"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Cell } from "recharts";
import { useFiltros } from "@/lib/filtros";
import { agrupar, CLIENTE_POR_ID, ESTADOS_PROV, ESTADO_DESC, PROVEEDORES, PRODUCTOS, sumar, VENTAS, type Proveedor } from "@/lib/datos";
import { usd, eje, num, porc, fecha } from "@/lib/formato";
import { BarrasH, COLOR_ESTADO, Estado, Kpi, Seg, Seccion, Tabla, Tarjeta, Tip, colorSeq, tintaSeq, type Col } from "@/components/ui";

const ejeProps = { tick: { fill: "var(--text-3)", fontSize: 11 }, axisLine: false, tickLine: false } as const;

export function Tactico() {
  const [estado, setEstado] = useState<string | null>(null);
  return (
    <>
      <div className="intro">
        <div>
          <h1>Panel táctico</h1>
          <p>A quién le debemos dinero y qué clientes vuelven a comprar.</p>
        </div>
      </div>
      <Seccion titulo="Proveedores" />
      <ResumenProv />
      <div className="grid">
        <SaldoEstado estado={estado} setEstado={setEstado} />
        <TablaProv estado={estado} setEstado={setEstado} />
      </div>
      <Seccion titulo="Clientes" />
      <div className="grid">
        <Frecuencia />
        <TopClientes />
      </div>
    </>
  );
}

function provFiltrados(producto: string | null) {
  return producto ? PROVEEDORES.filter((p) => p.categoria === producto) : PROVEEDORES;
}

function ResumenProv() {
  const { f } = useFiltros();
  const ps = provFiltrados(f.producto);
  const saldo = ps.reduce((s, p) => s + p.saldo, 0);
  const dorm = ps.filter((p) => p.estado === "Dormido");
  const saldoDorm = dorm.reduce((s, p) => s + p.saldo, 0);
  return (
    <div className="kpis">
      <Kpi titulo="Proveedores" valor={num(ps.length)} sub={f.producto ? `Categoría ${f.producto}` : "Todas las categorías"} />
      <Kpi titulo="Saldo pendiente" valor={usd(saldo)} sub={`Media ${usd(ps.length ? saldo / ps.length : 0)} por proveedor`} />
      <Kpi titulo="Sin compras hace más de 3 años" valor={num(dorm.length)} sub={`${porc(ps.length ? dorm.length / ps.length : 0, 0)} de los proveedores · ${usd(saldoDorm)} de saldo`} />
    </div>
  );
}

function SaldoEstado({ estado, setEstado }: { estado: string | null; setEstado: (e: string | null) => void }) {
  const { f } = useFiltros();
  const ps = provFiltrados(f.producto);
  return (
    <Tarjeta className="c4" titulo="Saldo pendiente según actividad" sub="Clic para filtrar la lista"
      insight={<>3 de cada 4 proveedores no reciben compras hace más de 3 años, pero concentran <b>el 75 % del saldo</b>.</>}>
      {ESTADOS_PROV.map((e) => {
        const g = ps.filter((p) => p.estado === e);
        const s = g.reduce((t, p) => t + p.saldo, 0);
        const tot = ps.reduce((t, p) => t + p.saldo, 0) || 1;
        const apag = estado && estado !== e;
        return (
          <button key={e} onClick={() => setEstado(estado === e ? null : e)} style={{ display: "block", width: "100%", textAlign: "left", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 11px", marginBottom: 8, background: estado === e ? "var(--brand-soft)" : "var(--surface)", cursor: "pointer", opacity: apag ? 0.5 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><Estado e={e} /><b>{usd(s)}</b></div>
            <div style={{ height: 6, background: "var(--grid)", borderRadius: 3, margin: "7px 0 4px" }}>
              <div style={{ width: `${(s / tot) * 100}%`, height: "100%", background: COLOR_ESTADO[e], borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>{num(g.length)} proveedores · {ESTADO_DESC[e]}</div>
          </button>
        );
      })}
    </Tarjeta>
  );
}

function TablaProv({ estado, setEstado }: { estado: string | null; setEstado: (e: string | null) => void }) {
  const { f } = useFiltros();
  const ps = provFiltrados(f.producto).filter((p) => !estado || p.estado === estado);
  const cols: Col<Proveedor>[] = [
    { k: "nombre", t: "Proveedor", v: (r) => r.nombre, orden: (r) => r.nombre },
    { k: "contacto", t: "Contacto", v: (r) => r.contacto, orden: (r) => r.contacto },
    { k: "tel", t: "Teléfono", v: (r) => r.telefono },
    { k: "estado", t: "Actividad", v: (r) => <Estado e={r.estado} />, orden: (r) => r.diasSin },
    { k: "ultima", t: "Última compra", v: (r) => fecha(r.ultima), orden: (r) => r.ultima },
    { k: "saldo", t: "Saldo pendiente", v: (r) => usd(r.saldo, false), orden: (r) => r.saldo, num: true },
  ];
  return (
    <Tarjeta className="c8" titulo="Proveedores con más saldo pendiente" sub={`A quién llamar primero${estado ? ` · solo ${estado}` : ""}`}>
      <Tabla filas={ps} cols={cols} clave={(r) => r.id} ordenInicial="saldo" porPagina={10}
        buscar={(r) => `${r.id} ${r.nombre} ${r.contacto} ${r.email} ${r.categoria}`}
 />
    </Tarjeta>
  );
}

function Frecuencia() {
  const { ventas } = useFiltros();
  const porCli = agrupar(ventas, (v) => v.cliente);
  const datos = [1, 2, 3, 4, 5].map((n) => {
    const cs = [...porCli.values()].filter((a) => (n === 5 ? a.pedidos >= 5 : a.pedidos === n));
    return { n: n === 5 ? "5+" : String(n), clientes: cs.length, venta: cs.reduce((s, a) => s + a.venta, 0) };
  });
  const rep = datos.slice(1).reduce((s, d) => s + d.clientes, 0);
  const tot = datos.reduce((s, d) => s + d.clientes, 0) || 1;
  return (
    <Tarjeta className="c4" titulo="¿Los clientes vuelven a comprar?" sub="Clientes según cuántos pedidos hicieron"
      insight={<>Solo <b>{porc(rep / tot, 0)}</b> repite. La mayoría compró una sola vez.</>}>
      <div style={{ height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={datos} margin={{ top: 6, right: 6, left: 0, bottom: 14 }} barCategoryGap="25%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="n" {...ejeProps} label={{ value: "Pedidos por cliente", position: "insideBottom", offset: -8, fill: "var(--text-3)", fontSize: 11 }} />
            <YAxis {...ejeProps} width={36} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<Tip titulo={(p) => `${p.n} pedido(s)`} filas={(p) => [["Clientes", num(p.clientes)], ["Venta", usd(p.venta)]]} />} />
            <Bar dataKey="clientes" fill="var(--s1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Tarjeta>
  );
}

function TopClientes() {
  const { ventas, f, toggle } = useFiltros();
  const filas = useMemo(() => {
    const g = agrupar(ventas, (v) => v.cliente);
    const ult = new Map<string, string>();
    for (const v of ventas) if ((ult.get(v.cliente) ?? "") < v.fecha) ult.set(v.cliente, v.fecha);
    return [...g.entries()].map(([id, a]) => {
      const c = CLIENTE_POR_ID.get(id);
      return { id, nombre: c?.nombre ?? id, grupo: c?.grupo ?? "?", seg: c?.segmento ?? "", pais: c?.pais ?? "", pedidos: a.pedidos, venta: a.venta, margen: a.margen, ultimo: ult.get(id) ?? "" };
    });
  }, [ventas]);
  type F = (typeof filas)[number];
  const cols: Col<F>[] = [
    { k: "nombre", t: "Cliente", v: (r) => r.nombre, orden: (r) => r.nombre },
    { k: "pais", t: "País", v: (r) => r.pais, orden: (r) => r.pais },
    { k: "seg", t: "Segmento", v: (r) => r.seg, orden: (r) => r.seg },
    { k: "pedidos", t: "Pedidos", v: (r) => r.pedidos, orden: (r) => r.pedidos * 1e12 + r.venta, num: true },
    { k: "venta", t: "Venta", v: (r) => usd(r.venta), orden: (r) => r.venta, num: true },
    { k: "ultimo", t: "Último pedido", v: (r) => fecha(r.ultimo), orden: (r) => r.ultimo },
  ];
  return (
    <Tarjeta className="c8" titulo="Mejores clientes" sub="Los que más pedidos hicieron · clic en uno para filtrar el tablero">
      <Tabla filas={filas} cols={cols} clave={(r) => r.id} ordenInicial="pedidos" porPagina={8} seleccion={f.cliente}
        buscar={(r) => `${r.id} ${r.nombre} ${r.seg} ${r.pais}`} onFila={(r) => toggle("cliente", r.id)} />
    </Tarjeta>
  );
}
