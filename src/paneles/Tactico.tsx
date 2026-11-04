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
          <p>Relación con proveedores, saldos pendientes, tendencias de compra y clientes más frecuentes. Pensado para decisiones de medio plazo (trimestre a un año).</p>
        </div>
      </div>
      <Seccion titulo="Proveedores" sub="Los filtros de producto se aplican a la categoría asignada" />
      <ResumenProv />
      <div className="grid">
        <SaldoEstado estado={estado} setEstado={setEstado} />
        <Dispersion estado={estado} setEstado={setEstado} />
        <UltimaCompra estado={estado} />
        <Categorias />
        <TablaProv estado={estado} setEstado={setEstado} />
      </div>
      <Seccion titulo="Clientes y tendencias de compra" sub="Calculado sobre los pedidos filtrados" />
      <div className="grid">
        <Heatmap />
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
  const activos = ps.filter((p) => p.estado === "Activo").length;
  return (
    <div className="kpis">
      <Kpi titulo="Proveedores" valor={num(ps.length)} sub={f.producto ? `Categoría ${f.producto}` : "Todas las categorías"} />
      <Kpi titulo="Saldo pendiente" valor={usd(saldo)} sub={`Media ${usd(ps.length ? saldo / ps.length : 0)} por proveedor`} />
      <Kpi titulo="Activos (< 1 año)" valor={num(activos)} sub={porc(ps.length ? activos / ps.length : 0) + " del total"} />
      <Kpi titulo="Dormidos (> 3 años)" valor={num(dorm.length)} sub={porc(ps.length ? dorm.length / ps.length : 0) + " del total"} />
      <Kpi titulo="Saldo en dormidos" valor={usd(saldoDorm)} sub={porc(saldo ? saldoDorm / saldo : 0) + " del saldo"} />
    </div>
  );
}

function SaldoEstado({ estado, setEstado }: { estado: string | null; setEstado: (e: string | null) => void }) {
  const { f } = useFiltros();
  const ps = provFiltrados(f.producto);
  return (
    <Tarjeta className="c4" titulo="Saldo pendiente por actividad" sub="Clic para filtrar proveedores"
      insight={<>El <b>75 % de los proveedores no compra hace más de 3 años</b> y aun así acumula el 75 % del saldo pendiente. Son cuentas para conciliar o cerrar.</>}>
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

function Dispersion({ estado, setEstado }: { estado: string | null; setEstado: (e: string | null) => void }) {
  const { f } = useFiltros();
  const ps = provFiltrados(f.producto);
  const series = ESTADOS_PROV.map((e) => ({ e, d: ps.filter((p) => p.estado === e).map((p) => ({ ...p, anios: p.diasSin / 365 })) }));
  return (
    <Tarjeta className="c8" titulo="Antigüedad de la última compra vs. saldo pendiente" sub="Cada punto es un proveedor. Arriba a la derecha: deuda vieja que nadie gestiona."
      extra={<div className="leyenda" style={{ margin: 0 }}>{ESTADOS_PROV.map((e) => <span key={e} style={{ cursor: "pointer", opacity: estado && estado !== e ? 0.45 : 1 }} onClick={() => setEstado(estado === e ? null : e)}><i style={{ background: COLOR_ESTADO[e], borderRadius: 99 }} />{e}</span>)}</div>}>
      <div style={{ height: 300 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 14 }}>
            <CartesianGrid stroke="var(--grid)" />
            <XAxis type="number" dataKey="anios" name="Años sin compra" {...ejeProps} domain={[0, 11]} tickCount={12}
              label={{ value: "Años desde la última compra", position: "insideBottom", offset: -8, fill: "var(--text-3)", fontSize: 11 }} />
            <YAxis type="number" dataKey="saldo" name="Saldo" {...ejeProps} tickFormatter={eje} width={50} />
            <ZAxis range={[36, 36]} />
            <Tooltip cursor={{ stroke: "var(--text-3)" }} content={<Tip titulo={(p: Proveedor) => `${p.nombre} (${p.id})`}
              filas={(p: Proveedor) => [["Saldo", usd(p.saldo, false)], ["Última compra", fecha(p.ultima)], ["Estado", p.estado], ["Categoría asignada", p.categoria]]} />} />
            {series.map((s) => (
              <Scatter key={s.e} data={s.d} fill={COLOR_ESTADO[s.e]} fillOpacity={estado && estado !== s.e ? 0.12 : 0.75} stroke="var(--surface)" strokeWidth={1} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Tarjeta>
  );
}

function UltimaCompra({ estado }: { estado: string | null }) {
  const { f } = useFiltros();
  const ps = provFiltrados(f.producto).filter((p) => !estado || p.estado === estado);
  const datos = useMemo(() => {
    const m = new Map<number, { n: number; saldo: number }>();
    for (let y = 2011; y <= 2022; y++) m.set(y, { n: 0, saldo: 0 });
    for (const p of ps) { const y = Number(p.ultima.slice(0, 4)); const o = m.get(y)!; o.n++; o.saldo += p.saldo; }
    return [...m.entries()].map(([y, o]) => ({ y: String(y), ...o }));
  }, [ps]);
  return (
    <Tarjeta className="c6" titulo="Tendencia de compra a proveedores" sub="Proveedores según el año de su última compra"
      insight={<>Ningún proveedor registra compras en los últimos 6 meses (la más reciente es de mayo de 2022), mientras las ventas siguen. <b>Hay que verificar si el listado de proveedores está actualizado</b> o si se compra fuera del registro.</>}>
      <div style={{ height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={datos} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="y" {...ejeProps} />
            <YAxis {...ejeProps} width={36} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<Tip titulo={(p) => `Última compra en ${p.y}`} filas={(p) => [["Proveedores", num(p.n)], ["Saldo pendiente", usd(p.saldo)]]} />} />
            <Bar dataKey="n" radius={[4, 4, 0, 0]}>
              {datos.map((d) => <Cell key={d.y} fill={Number(d.y) >= 2022 - 0 ? "var(--s2)" : "var(--s1)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="leyenda"><span><i style={{ background: "var(--s1)" }} />Años anteriores</span><span><i style={{ background: "var(--s2)" }} />2022 (año en curso)</span></div>
    </Tarjeta>
  );
}

function Categorias() {
  const { f, sin, toggle } = useFiltros();
  const ventas = sin("producto");
  const g = agrupar(ventas, (v) => v.producto);
  const datos = PRODUCTOS.map((k) => {
    const ps = PROVEEDORES.filter((p) => p.categoria === k);
    const act = ps.filter((p) => p.estado === "Activo").length;
    return { k, v: g.get(k)?.coste ?? 0, sub: `${ps.length} prov. · ${act} activos` };
  }).sort((a, b) => b.v - a.v);
  return (
    <Tarjeta className="c6" titulo="Coste de compra por categoría de proveedor" sub="Coste de lo vendido, repartido entre los proveedores de cada categoría · clic para filtrar"
      nota={<>Simulación: el archivo de ventas no trae proveedor. Cada proveedor tiene una categoría asignada y cada pedido se reparte entre los de su categoría (ver Datos y supuestos).</>}>
      <BarrasH datos={datos} seleccion={f.producto} onClick={(k) => toggle("producto", k)} formato={usd} />
    </Tarjeta>
  );
}

function TablaProv({ estado, setEstado }: { estado: string | null; setEstado: (e: string | null) => void }) {
  const { f } = useFiltros();
  const ps = provFiltrados(f.producto).filter((p) => !estado || p.estado === estado);
  const cols: Col<Proveedor>[] = [
    { k: "id", t: "ID", v: (r) => r.id, orden: (r) => r.id },
    { k: "nombre", t: "Proveedor", v: (r) => r.nombre, orden: (r) => r.nombre },
    { k: "contacto", t: "Contacto", v: (r) => r.contacto, orden: (r) => r.contacto },
    { k: "tel", t: "Teléfono", v: (r) => r.telefono },
    { k: "email", t: "Email", v: (r) => <>{r.email}{r.emailDup && <> <span className="bandera" title="Este email aparece en más de un proveedor">dup.</span></>}</> },
    { k: "cat", t: "Categoría asig.", v: (r) => r.categoria, orden: (r) => r.categoria },
    { k: "estado", t: "Actividad", v: (r) => <Estado e={r.estado} />, orden: (r) => r.diasSin },
    { k: "ultima", t: "Última compra", v: (r) => fecha(r.ultima), orden: (r) => r.ultima },
    { k: "saldo", t: "Saldo pendiente", v: (r) => usd(r.saldo, false), orden: (r) => r.saldo, num: true },
  ];
  return (
    <Tarjeta className="c12" titulo="Listado de proveedores para gestión de saldos" sub={`Ordenado por saldo pendiente${estado ? ` · solo ${estado}` : ""}${f.producto ? ` · categoría ${f.producto}` : ""}`}>
      <Tabla filas={ps} cols={cols} clave={(r) => r.id} ordenInicial="saldo" porPagina={10}
        buscar={(r) => `${r.id} ${r.nombre} ${r.contacto} ${r.email} ${r.categoria}`}
        extra={<Seg etiqueta="Actividad" valor={(estado ?? "Todos") as string} onChange={(v) => setEstado(v === "Todos" ? null : v)}
          opciones={[{ v: "Todos", t: "Todos" }, ...ESTADOS_PROV.map((e) => ({ v: e, t: e }))]} />} />
    </Tarjeta>
  );
}

function Heatmap() {
  const { f, sin, reemplazar } = useFiltros();
  const ventas = sin("anios", "trim", "mes", "producto");
  const per = useMemo(() => { const l: { a: number; t: number }[] = []; for (const a of [2020, 2021, 2022]) for (const t of [1, 2, 3, 4]) l.push({ a, t }); return l; }, []);
  const g = agrupar(ventas, (v) => `${v.producto}|${v.anio}|${v.trim}`);
  const vals = [...g.values()].map((a) => a.venta);
  const min = 0, max = Math.max(1, ...vals);
  const filas = [...agrupar(ventas, (v) => v.producto).entries()].sort((a, b) => b[1].venta - a[1].venta).map(([k]) => k);
  return (
    <Tarjeta className="c12" titulo="Tendencia de compra de clientes: producto × trimestre" sub="Color = venta del trimestre (más oscuro, más venta). Clic en una celda para filtrar ese producto y trimestre."
      insight={<>La demanda es <b>irregular por producto</b>: trimestres fuertes seguidos de huecos. Un plan de compras trimestral por categoría evita sobrestock en los meses flojos. T4 2022 solo incluye hasta el 7 de noviembre.</>}>
      <div style={{ overflowX: "auto" }}>
        <div className="heat" style={{ gridTemplateColumns: `150px repeat(12, minmax(46px, 1fr))`, minWidth: 720 }}>
          <div />
          {per.map((p) => <div className="h" key={`${p.a}${p.t}`}>{p.t === 1 ? <b>{p.a} </b> : null}T{p.t}</div>)}
          {filas.map((prod) => (
            <Fila key={prod} prod={prod} per={per} g={g} min={min} max={max}
              activo={f.producto === prod} onClick={(a, t) => reemplazar({ ...f, producto: prod, anios: [a], trim: t, mes: null })} />
          ))}
        </div>
      </div>
    </Tarjeta>
  );
}
function Fila({ prod, per, g, min, max, onClick, activo }: { prod: string; per: { a: number; t: number }[]; g: Map<string, any>; min: number; max: number; onClick: (a: number, t: number) => void; activo: boolean }) {
  return (
    <>
      <div className="r" style={{ fontWeight: activo ? 700 : 400 }}>{prod}</div>
      {per.map((p) => {
        const v = g.get(`${prod}|${p.a}|${p.t}`)?.venta ?? 0;
        return (
          <div key={`${p.a}${p.t}`} className="cel" title={`${prod} · ${p.a} T${p.t}: ${usd(v)}`} onClick={() => onClick(p.a, p.t)}
            style={{ background: v ? colorSeq(v, min, max) : "var(--seq-0)", color: tintaSeq(v, min, max) }}>
            {v ? eje(v) : ""}
          </div>
        );
      })}
    </>
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
    <Tarjeta className="c4" titulo="Frecuencia de compra" sub="Clientes según su número de pedidos"
      insight={<><b>{porc(rep / tot, 0)} de los clientes</b> con compra repite. Convertir compradores únicos en recurrentes es la palanca de fidelización más directa.</>}>
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
    { k: "id", t: "ID", v: (r) => r.id, orden: (r) => r.id },
    { k: "nombre", t: "Cliente", v: (r) => r.nombre, orden: (r) => r.nombre },
    { k: "pais", t: "País", v: (r) => r.pais, orden: (r) => r.pais },
    { k: "grupo", t: "Grupo", v: (r) => r.grupo, orden: (r) => r.grupo },
    { k: "seg", t: "Segmento RFM", v: (r) => r.seg, orden: (r) => r.seg },
    { k: "pedidos", t: "Pedidos", v: (r) => r.pedidos, orden: (r) => r.pedidos * 1e12 + r.venta, num: true },
    { k: "venta", t: "Venta", v: (r) => usd(r.venta), orden: (r) => r.venta, num: true },
    { k: "margen", t: "Margen", v: (r) => usd(r.margen), orden: (r) => r.margen, num: true },
    { k: "ultimo", t: "Último pedido", v: (r) => fecha(r.ultimo), orden: (r) => r.ultimo },
  ];
  return (
    <Tarjeta className="c8" titulo="Clientes más frecuentes" sub="Ordenados por pedidos y venta · clic en una fila para filtrar todo el tablero por ese cliente">
      <Tabla filas={filas} cols={cols} clave={(r) => r.id} ordenInicial="pedidos" porPagina={8} seleccion={f.cliente}
        buscar={(r) => `${r.id} ${r.nombre} ${r.seg} ${r.pais}`} onFila={(r) => toggle("cliente", r.id)} />
    </Tarjeta>
  );
}
