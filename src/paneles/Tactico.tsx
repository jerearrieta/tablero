"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Cell } from "recharts";
import { useFiltros } from "@/lib/filtros";
import { agrupar, CLIENTE_POR_ID, ESTADOS_PROV, ESTADO_DESC, MESES, PRIORIDADES, PROVEEDORES, PRODUCTOS, pct, sumar, VENTAS, type Proveedor, type Venta } from "@/lib/datos";
import { usd, eje, num, porc, dias, fecha } from "@/lib/formato";
import { BarrasH, COLOR_ESTADO, Estado, Kpi, Seg, Seccion, Tabla, Tarjeta, Tip, colorSeq, tintaSeq, type Col } from "@/components/ui";

const ejeProps = { tick: { fill: "var(--text-3)", fontSize: 11 }, axisLine: false, tickLine: false } as const;

export function Tactico() {
  const [estado, setEstado] = useState<string | null>(null);
  return (
    <>
      <div className="intro">
        <div>
          <h1>Panel táctico</h1>
          <p>Cuánto se vende, si los envíos cumplen, a quién le debemos dinero y qué clientes vuelven a comprar.</p>
        </div>
      </div>
      <Seccion titulo="Ventas y envíos" />
      <div className="grid">
        <DrillVentas />
        <Productos />
        <Envios />
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

// ---------- Ventas y envíos (antes en el panel operativo) ----------
function DrillVentas() {
  const { f, sin, set, toggleAnio } = useFiltros();
  // Nivel del drill-down según los filtros de tiempo
  const anio = f.anios.length === 1 ? f.anios[0] : null;
  const nivel = f.mes && anio ? "dia" : f.trim && anio ? "mes" : anio ? "trim" : "anio";
  const base = sin("anios", "trim", "mes").filter((v) =>
    (nivel === "anio" ? (!f.anios.length || f.anios.includes(v.anio)) : v.anio === anio) &&
    (nivel === "mes" || nivel === "dia" ? v.trim === f.trim : true) &&
    (nivel === "dia" ? v.mes === f.mes : true));

  const datos = useMemo(() => {
    const key = (v: Venta) => nivel === "anio" ? v.anio : nivel === "trim" ? v.trim : nivel === "mes" ? v.mes : Number(v.fecha.slice(8, 10));
    const g = agrupar(base, key);
    let claves: number[];
    if (nivel === "anio") claves = [2020, 2021, 2022];
    else if (nivel === "trim") claves = anio === 2022 ? [1, 2, 3, 4] : [1, 2, 3, 4];
    else if (nivel === "mes") claves = [0, 1, 2].map((i) => (f.trim! - 1) * 3 + 1 + i);
    else { const n = new Date(anio!, f.mes!, 0).getDate(); claves = Array.from({ length: n }, (_, i) => i + 1); }
    return claves.map((k) => {
      const a = g.get(k);
      const etq = nivel === "anio" ? String(k) : nivel === "trim" ? `T${k}` : nivel === "mes" ? MESES[k - 1] : String(k);
      return { k, etq, venta: a?.venta ?? 0, coste: a?.coste ?? 0, margen: a?.margen ?? 0, pedidos: a?.pedidos ?? 0 };
    });
  }, [base, nivel, anio, f.trim, f.mes]);

  const bajar = (k: number) => {
    if (nivel === "anio") { set("anios", [k]); set("trim", null); set("mes", null); }
    else if (nivel === "trim") { set("trim", k); set("mes", null); }
    else if (nivel === "mes") set("mes", k);
  };
  const titulo = { anio: "por año", trim: `por trimestre · ${anio}`, mes: `por mes · ${anio} T${f.trim}`, dia: `por día · ${f.mes ? MESES[f.mes - 1] : ""} ${anio}` }[nivel];
  const mejor = [...datos].sort((a, b) => b.venta - a.venta)[0];

  return (
    <Tarjeta className="c8" titulo={`Venta ${titulo}`}
      sub={nivel !== "dia" ? "Clic en una barra para ver el detalle (año → trimestre → mes → día)" : "Ventas de cada día del mes"}
      extra={
        <div className="migas" aria-label="Ruta del drill-down">
          <button disabled={nivel === "anio"} onClick={() => { set("anios", []); set("trim", null); set("mes", null); }}>Todos los años</button>
          {anio && <><span>›</span><button disabled={nivel === "trim"} onClick={() => { set("trim", null); set("mes", null); }}>{anio}</button></>}
          {f.trim && anio && <><span>›</span><button disabled={nivel === "mes"} onClick={() => set("mes", null)}>T{f.trim}</button></>}
          {f.mes && anio && <><span>›</span><button disabled>{MESES[f.mes - 1]}</button></>}
        </div>
      }
      insight={nivel === "anio"
        ? <>2022 parece más bajo porque solo llega al 7 de noviembre. De enero a octubre, <b>2022 vendió más que 2020</b> y un 14 % menos que 2021.</>
        : mejor && mejor.venta > 0 ? <>Pico del nivel: <b>{mejor.etq}</b> con {usd(mejor.venta)} en {mejor.pedidos} pedidos.</> : undefined}
    >
      <div className="leyenda"><span><i style={{ background: "var(--s1)" }} />Coste</span><span><i style={{ background: "var(--s2)" }} />Margen bruto</span><span style={{ color: "var(--text-3)" }}>Altura total = venta</span></div>
      <div style={{ height: 290 }}>
        <ResponsiveContainer>
          <BarChart data={datos} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} barCategoryGap={nivel === "dia" ? 2 : "22%"}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="etq" {...ejeProps} interval={0} />
            <YAxis {...ejeProps} tickFormatter={eje} width={50} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<Tip titulo={(p) => p.etq + (nivel === "dia" ? ` ${MESES[f.mes! - 1]} ${anio}` : "")}
              filas={(p) => [["Venta", usd(p.venta)], ["Coste", usd(p.coste)], ["Margen", `${usd(p.margen)} (${porc(p.venta ? p.margen / p.venta : 0)})`], ["Pedidos", num(p.pedidos)]]}
              pista={nivel !== "dia" ? "Clic para ver el detalle" : undefined} />} />
            <Bar dataKey="coste" stackId="a" fill="var(--s1)" onClick={(d: any) => bajar(d.k)} style={{ cursor: nivel !== "dia" ? "pointer" : "default" }} />
            <Bar dataKey="margen" stackId="a" fill="var(--s2)" radius={[4, 4, 0, 0]} onClick={(d: any) => bajar(d.k)} style={{ cursor: nivel !== "dia" ? "pointer" : "default" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {nivel === "anio" && f.anios.length > 1 && <div className="nota">Hay varios años marcados en el filtro; use <button className="limpiar" onClick={() => f.anios.forEach(toggleAnio)}>quitar años</button> para ver los tres.</div>}
    </Tarjeta>
  );
}

function Productos() {
  const { f, sin, toggle } = useFiltros();
  const [m, setM] = useState<"venta" | "margen" | "unidades" | "pct">("venta");
  const g = agrupar(sin("producto"), (v) => v.producto);
  const datos = [...g.entries()].map(([k, a]) => ({ k, v: m === "pct" ? pct(a) : a[m], sub: undefined }))
    .sort((a, b) => b.v - a.v);
  const fmt = m === "unidades" ? num : m === "pct" ? (x: number) => porc(x) : usd;
  return (
    <Tarjeta className="c4" titulo="¿Qué se vende?" sub="Clic en un producto para filtrar"
      extra={<Seg etiqueta="Métrica" valor={m} onChange={setM} opciones={[{ v: "venta", t: "Venta" }, { v: "pct", t: "% ganancia" }]} />}>
      <BarrasH datos={datos} seleccion={f.producto} onClick={(k) => toggle("producto", k)} formato={fmt} max={m === "pct" ? 1 : undefined} />
    </Tarjeta>
  );
}

function Envios() {
  const { ventas } = useFiltros();
  const gp = agrupar(ventas, (v) => v.prioridad);
  const lentos = ventas.filter((v) => v.dias > 35).length;
  return (
    <Tarjeta className="c12" titulo="¿Los envíos salen a tiempo?" sub={`Días promedio entre el pedido y el envío, por prioridad · ${num(lentos)} pedidos tardaron más de 35 días`}
      insight={<><b>No.</b> Un pedido Crítico tarda lo mismo que uno de prioridad Baja (unos 24 días).</>}>
      <div style={{ paddingTop: 8 }}>
        <BarrasH datos={PRIORIDADES.map((k) => { const a = gp.get(k); return { k, v: a ? a.dias / a.pedidos : 0, sub: `${num(a?.pedidos ?? 0)} ped.` }; })}
          formato={(x) => dias(x)} max={50} />
        <div className="nota">Escala de 0 a 50 días (máximo observado).</div>
      </div>
    </Tarjeta>
  );
}
