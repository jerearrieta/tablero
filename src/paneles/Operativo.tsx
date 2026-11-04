"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { useFiltros } from "@/lib/filtros";
import { agrupar, DIAS, MESES, PRIORIDADES, CANALES, sumar, pct, type Venta } from "@/lib/datos";
import { usd, eje, num, porc, dias, fecha } from "@/lib/formato";
import { BarrasH, Seg, Tarjeta, Tip, Tabla, Seccion, type Col } from "@/components/ui";

const ejeProps = { tick: { fill: "var(--text-3)", fontSize: 11 }, axisLine: false, tickLine: false } as const;

export function Operativo() {
  return (
    <>
      <div className="intro">
        <div>
          <h1>Panel operativo</h1>
          <p>Seguimiento del día a día: cuánto se vende, qué se vende, cuánto cuesta y cómo se cumplen los envíos. Pensado para decisiones de corto plazo.</p>
        </div>
      </div>
      <div className="grid">
        <DrillVentas />
        <Productos />
        <Costes />
        <Canal />
        <DiaSemana />
        <Envios />
      </div>
      <Seccion titulo="Seguimiento de pedidos" sub="Todos los pedidos que cumplen los filtros" />
      <div className="grid"><Pedidos /></div>
    </>
  );
}

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
      sub={nivel !== "dia" ? "Haga clic en una barra para bajar de nivel (año → trimestre → mes → día)" : "Nivel máximo: cada barra suma los pedidos de ese día"}
      extra={
        <div className="migas" aria-label="Ruta del drill-down">
          <button disabled={nivel === "anio"} onClick={() => { set("anios", []); set("trim", null); set("mes", null); }}>Todos los años</button>
          {anio && <><span>›</span><button disabled={nivel === "trim"} onClick={() => { set("trim", null); set("mes", null); }}>{anio}</button></>}
          {f.trim && anio && <><span>›</span><button disabled={nivel === "mes"} onClick={() => set("mes", null)}>T{f.trim}</button></>}
          {f.mes && anio && <><span>›</span><button disabled>{MESES[f.mes - 1]}</button></>}
        </div>
      }
      insight={nivel === "anio"
        ? <>2022 parece caer, pero solo llega al 7 de noviembre. Comparando enero–octubre, <b>2022 (360 M US$) supera a 2020 (345 M US$)</b> y queda un 14 % por debajo de 2021.</>
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
  const datos = [...g.entries()].map(([k, a]) => ({ k, v: m === "pct" ? pct(a) : a[m], sub: m === "venta" ? porc(pct(a), 0) + " margen" : undefined }))
    .sort((a, b) => b.v - a.v);
  const fmt = m === "unidades" ? num : m === "pct" ? (x: number) => porc(x) : usd;
  return (
    <Tarjeta className="c4" titulo="Productos vendidos" sub="Clic en una barra para filtrar por producto"
      extra={<Seg etiqueta="Métrica" valor={m} onChange={setM} opciones={[{ v: "venta", t: "Venta" }, { v: "margen", t: "Margen" }, { v: "pct", t: "% margen" }, { v: "unidades", t: "Uds." }]} />}>
      <BarrasH datos={datos} seleccion={f.producto} onClick={(k) => toggle("producto", k)} formato={fmt} max={m === "pct" ? 1 : undefined} />
    </Tarjeta>
  );
}

function Costes() {
  const { ventas } = useFiltros();
  const filas = useMemo(() => {
    const g = new Map<string, Venta>();
    for (const v of ventas) if (!g.has(v.producto)) g.set(v.producto, v);
    const ag = agrupar(ventas, (v) => v.producto);
    return [...g.values()].map((v) => {
      const a = ag.get(v.producto)!;
      return { producto: v.producto, precio: v.precio, coste: v.costeU, mu: v.precio - v.costeU, pc: (v.precio - v.costeU) / v.precio, costeTot: a.coste, margenTot: a.margen };
    });
  }, [ventas]);
  const cols: Col<(typeof filas)[number]>[] = [
    { k: "producto", t: "Producto", v: (r) => r.producto, orden: (r) => r.producto },
    { k: "precio", t: "Precio unit.", v: (r) => `${r.precio.toFixed(2)} US$`, orden: (r) => r.precio, num: true },
    { k: "coste", t: "Coste unit.", v: (r) => `${r.coste.toFixed(2)} US$`, orden: (r) => r.coste, num: true },
    { k: "mu", t: "Margen unit.", v: (r) => `${r.mu.toFixed(2)} US$`, orden: (r) => r.mu, num: true },
    { k: "pc", t: "% margen", v: (r) => <MiniBarra x={r.pc} />, orden: (r) => r.pc, num: true },
    { k: "costeTot", t: "Coste total", v: (r) => usd(r.costeTot), orden: (r) => r.costeTot, num: true },
  ];
  return (
    <Tarjeta className="c7" titulo="Análisis de costes por producto" sub="Precio y coste unitario (fijos 2020–2022) y coste acumulado con los filtros"
      insight={<>Precio y coste unitario <b>no cambian en tres años</b>: el margen solo mejora vendiendo un mix más rentable o renegociando costes. Cárnicos y Material de oficina concentran mucho coste con margen bajo (14 % y 19 %).</>}>
      <Tabla filas={filas} cols={cols} clave={(r) => r.producto} ordenInicial="costeTot" porPagina={12} />
    </Tarjeta>
  );
}
function MiniBarra({ x }: { x: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 60, height: 6, background: "var(--grid)", borderRadius: 3, display: "inline-block", position: "relative" }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${x * 100}%`, background: "var(--s1)", borderRadius: 3 }} />
      </span>
      {porc(x, 0)}
    </span>
  );
}

function Canal() {
  const { f, sin, toggle } = useFiltros();
  const gc = agrupar(sin("canal"), (v) => v.canal);
  const gp = agrupar(sin("prioridad"), (v) => v.prioridad);
  const tc = [...gc.values()].reduce((s, a) => s + a.venta, 0) || 1;
  const tp = [...gp.values()].reduce((s, a) => s + a.pedidos, 0) || 1;
  return (
    <Tarjeta className="c5" titulo="Canal y prioridad" sub="Clic para filtrar">
      <div style={{ fontSize: 12, color: "var(--text-3)", margin: "2px 0 6px" }}>Venta por canal</div>
      <BarrasH datos={CANALES.map((k) => ({ k, v: gc.get(k)?.venta ?? 0, sub: porc((gc.get(k)?.venta ?? 0) / tc, 0) }))} seleccion={f.canal} onClick={(k) => toggle("canal", k)} formato={usd} />
      <div style={{ fontSize: 12, color: "var(--text-3)", margin: "14px 0 6px" }}>Pedidos por prioridad</div>
      <BarrasH datos={PRIORIDADES.map((k) => ({ k, v: gp.get(k)?.pedidos ?? 0, sub: porc((gp.get(k)?.pedidos ?? 0) / tp, 0) }))} seleccion={f.prioridad} onClick={(k) => toggle("prioridad", k)} formato={num} />
      <div className="insight">Online y offline están casi empatados (49 % / 51 % de la venta) y con el mismo margen: <b>ningún canal es prescindible</b>, pero el online escala con menos coste comercial.</div>
    </Tarjeta>
  );
}

function DiaSemana() {
  const { ventas } = useFiltros();
  const [m, setM] = useState<"venta" | "pedidos">("venta");
  const g = agrupar(ventas, (v) => v.ds);
  const datos = DIAS.map((d, i) => ({ d, v: g.get(i)?.[m] ?? 0, venta: g.get(i)?.venta ?? 0, pedidos: g.get(i)?.pedidos ?? 0 }));
  return (
    <Tarjeta className="c6" titulo="Actividad por día de la semana" sub="Fecha del pedido"
      extra={<Seg etiqueta="Métrica" valor={m} onChange={setM} opciones={[{ v: "venta", t: "Venta" }, { v: "pedidos", t: "Pedidos" }]} />}
      insight={<>Viernes y domingo son los días con más venta; el lunes es el más flojo. Útil para <b>planificar turnos de atención y despacho</b>.</>}>
      <div style={{ height: 210 }}>
        <ResponsiveContainer>
          <BarChart data={datos} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="d" {...ejeProps} />
            <YAxis {...ejeProps} tickFormatter={m === "venta" ? eje : num} width={50} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<Tip titulo={(p) => p.d} filas={(p) => [["Venta", usd(p.venta)], ["Pedidos", num(p.pedidos)]]} />} />
            <Bar dataKey="v" fill="var(--s1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Tarjeta>
  );
}

function Envios() {
  const { ventas } = useFiltros();
  const [vista, setVista] = useState<"hist" | "prio">("prio");
  const hist = useMemo(() => {
    const b = Array.from({ length: 10 }, (_, i) => ({ r: `${i * 5}–${i * 5 + 4}`, n: 0, i }));
    for (const v of ventas) b[Math.min(9, Math.floor(v.dias / 5))].n++;
    b[9].r = "45–50";
    return b;
  }, [ventas]);
  const gp = agrupar(ventas, (v) => v.prioridad);
  const prom = ventas.length ? sumar(ventas).dias / ventas.length : 0;
  const lentos = ventas.filter((v) => v.dias > 35).length;
  return (
    <Tarjeta className="c6" titulo="Cumplimiento de envíos" sub={`Días entre pedido y envío · media ${dias(prom)} · ${num(lentos)} pedidos tardan más de 35 días`}
      extra={<Seg etiqueta="Vista" valor={vista} onChange={setVista} opciones={[{ v: "prio", t: "Por prioridad" }, { v: "hist", t: "Distribución" }]} />}
      insight={<><b>La prioridad no acelera el envío</b>: un pedido Crítico tarda en promedio lo mismo (≈25 días) que uno de prioridad Baja (≈24). La etiqueta de prioridad no se está usando en el despacho.</>}>
      {vista === "prio" ? (
        <div style={{ paddingTop: 8 }}>
          <BarrasH datos={PRIORIDADES.map((k) => { const a = gp.get(k); return { k, v: a ? a.dias / a.pedidos : 0, sub: `${num(a?.pedidos ?? 0)} ped.` }; })}
            formato={(x) => dias(x)} max={50} />
          <div className="nota">Escala de 0 a 50 días (máximo observado).</div>
        </div>
      ) : (
        <div style={{ height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={hist} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="r" {...ejeProps} />
              <YAxis {...ejeProps} width={36} />
              <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<Tip titulo={(p) => `${p.r} días`} filas={(p) => [["Pedidos", num(p.n)]]} />} />
              <Bar dataKey="n" radius={[4, 4, 0, 0]}>
                {hist.map((h) => <Cell key={h.i} fill={h.i >= 7 ? "var(--s2)" : "var(--s1)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="leyenda"><span><i style={{ background: "var(--s1)" }} />Hasta 34 días</span><span><i style={{ background: "var(--s2)" }} />35 días o más</span></div>
        </div>
      )}
    </Tarjeta>
  );
}

function Pedidos() {
  const { ventas, toggle } = useFiltros();
  const [alerta, setAlerta] = useState(false);
  const filas = alerta ? ventas.filter((v) => v.dias > 35 || (v.prioridad === "Crítica" && v.dias > 20)) : ventas;
  const cols: Col<Venta>[] = [
    { k: "id", t: "Pedido", v: (r) => r.id, orden: (r) => r.id },
    { k: "fecha", t: "Fecha pedido", v: (r) => fecha(r.fecha), orden: (r) => r.fecha },
    { k: "envio", t: "Envío", v: (r) => fecha(r.envio), orden: (r) => r.envio },
    { k: "dias", t: "Días", v: (r) => <>{r.dias}{(r.dias > 35 || (r.prioridad === "Crítica" && r.dias > 20)) && <> <span className="bandera">alerta</span></>}</>, orden: (r) => r.dias, num: true },
    { k: "prio", t: "Prioridad", v: (r) => r.prioridad, orden: (r) => PRIORIDADES.indexOf(r.prioridad) },
    { k: "pais", t: "País destino", v: (r) => r.pais, orden: (r) => r.pais },
    { k: "prod", t: "Producto", v: (r) => r.producto, orden: (r) => r.producto },
    { k: "canal", t: "Canal", v: (r) => r.canal, orden: (r) => r.canal },
    { k: "cli", t: "Cliente", v: (r) => r.cliente, orden: (r) => r.cliente },
    { k: "uds", t: "Unidades", v: (r) => num(r.unidades), orden: (r) => r.unidades, num: true },
    { k: "venta", t: "Venta", v: (r) => usd(r.venta), orden: (r) => r.venta, num: true },
    { k: "margen", t: "Margen", v: (r) => usd(r.margen), orden: (r) => r.margen, num: true },
  ];
  return (
    <Tarjeta className="c12" titulo="Pedidos" sub="Ordene por cualquier columna; clic en una fila para filtrar por su cliente. Alerta = más de 35 días, o Crítica con más de 20 días.">
      <Tabla filas={filas} cols={cols} clave={(r) => r.id} ordenInicial="fecha" porPagina={12}
        buscar={(r) => `${r.id} ${r.pais} ${r.producto} ${r.cliente} ${r.canal} ${r.prioridad}`}
        onFila={(r) => toggle("cliente", r.cliente)}
        extra={<label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12.5, color: "var(--text-2)", cursor: "pointer" }}>
          <input type="checkbox" checked={alerta} onChange={(e) => setAlerta(e.target.checked)} /> Solo pedidos con alerta de envío
        </label>} />
    </Tarjeta>
  );
}
