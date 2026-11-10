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
          <p>Cuánto se vende, qué se vende y si los envíos salen a tiempo.</p>
        </div>
      </div>
      <div className="grid">
        <DrillVentas />
        <Productos />
        <Envios />
        <Pedidos />
      </div>
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
    <Tarjeta className="c5" titulo="¿Los envíos salen a tiempo?" sub={`Días promedio entre el pedido y el envío, por prioridad · ${num(lentos)} pedidos tardaron más de 35 días`}
      insight={<><b>No.</b> Un pedido Crítico tarda lo mismo que uno de prioridad Baja (unos 24 días).</>}>
      <div style={{ paddingTop: 8 }}>
        <BarrasH datos={PRIORIDADES.map((k) => { const a = gp.get(k); return { k, v: a ? a.dias / a.pedidos : 0, sub: `${num(a?.pedidos ?? 0)} ped.` }; })}
          formato={(x) => dias(x)} max={50} />
        <div className="nota">Escala de 0 a 50 días (máximo observado).</div>
      </div>
    </Tarjeta>
  );
}

function Pedidos() {
  const { ventas, toggle } = useFiltros();
  const [alerta, setAlerta] = useState(true);
  const filas = alerta ? ventas.filter((v) => v.dias > 35 || (v.prioridad === "Crítica" && v.dias > 20)) : ventas;
  const cols: Col<Venta>[] = [
    { k: "id", t: "Pedido", v: (r) => r.id, orden: (r) => r.id },
    { k: "fecha", t: "Fecha pedido", v: (r) => fecha(r.fecha), orden: (r) => r.fecha },
    { k: "dias", t: "Días", v: (r) => <>{r.dias}{(r.dias > 35 || (r.prioridad === "Crítica" && r.dias > 20)) && <> <span className="bandera">alerta</span></>}</>, orden: (r) => r.dias, num: true },
    { k: "prio", t: "Prioridad", v: (r) => r.prioridad, orden: (r) => PRIORIDADES.indexOf(r.prioridad) },
    { k: "pais", t: "País destino", v: (r) => r.pais, orden: (r) => r.pais },
    { k: "prod", t: "Producto", v: (r) => r.producto, orden: (r) => r.producto },
    { k: "venta", t: "Venta", v: (r) => usd(r.venta), orden: (r) => r.venta, num: true },
  ];
  return (
    <Tarjeta className="c7" titulo="Pedidos con alerta de envío" sub="Más de 35 días, o Críticos con más de 20 días. Desmarque la casilla para ver todos.">
      <Tabla filas={filas} cols={cols} clave={(r) => r.id} ordenInicial="fecha" porPagina={8}
        buscar={(r) => `${r.id} ${r.pais} ${r.producto} ${r.cliente} ${r.canal} ${r.prioridad}`}
        onFila={(r) => toggle("cliente", r.cliente)}
        extra={<label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12.5, color: "var(--text-2)", cursor: "pointer" }}>
          <input type="checkbox" checked={alerta} onChange={(e) => setAlerta(e.target.checked)} /> Solo con alerta
        </label>} />
    </Tarjeta>
  );
}
