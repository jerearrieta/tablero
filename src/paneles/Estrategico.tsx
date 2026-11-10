"use client";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { useFiltros } from "@/lib/filtros";
import { agrupar, CLIENTES, GRUPOS, MESES, pct, SEGMENTOS, SEGMENTO_DESC, sumar, VENTAS } from "@/lib/datos";
import { usd, eje, num, porc } from "@/lib/formato";
import { BarrasH, Seg, Seccion, Tabla, Tarjeta, Tip, colorSeq, tintaSeq, type Col } from "@/components/ui";
import { Mapa } from "@/components/Mapa";

const ejeProps = { tick: { fill: "var(--text-3)", fontSize: 11 }, axisLine: false, tickLine: false } as const;
const NOMBRES = new Map(VENTAS.map((v) => [v.iso3, v.pais]));

export function Estrategico() {
  return (
    <>
      <div className="intro">
        <div>
          <h1>Panel estratégico</h1>
          <p>Dónde vendemos, qué productos dejan más ganancia y qué clientes cuidar.</p>
        </div>
      </div>
      <div className="grid">
        <MapaVentas />
        <Rentabilidad />
        <Tendencia />
        <Segmentos />
      </div>
    </>
  );
}

function MapaVentas() {
  const { f, sin, toggle } = useFiltros();
  const [m, setM] = useState<"venta" | "margen" | "pedidos" | "pct">("venta");
  const base = sin("pais");
  const g = agrupar(base, (v) => v.iso3);
  const valores = new Map([...g.entries()].map(([k, a]) => [k, m === "pct" ? pct(a) : a[m]]));
  const fmt = m === "pedidos" ? num : m === "pct" ? (x: number) => porc(x) : usd;
  return (
      <Tarjeta className="c12" titulo="¿Dónde vendemos?" sub={`${g.size} países con pedidos · clic en un país para filtrar`}
        extra={<Seg etiqueta="Métrica" valor={m} onChange={setM} opciones={[{ v: "venta", t: "Venta" }, { v: "pedidos", t: "Pedidos" }]} />}
        insight={<>Vendemos en 184 países y <b>ninguno pasa del 2 %</b> de la venta. África y Europa suman la mitad.</>}>
        <Mapa valores={valores} formato={fmt} seleccion={f.pais} onClick={(iso) => toggle("pais", iso)} etiqueta={{ venta: "Venta", margen: "Margen", pct: "% margen", pedidos: "Pedidos" }[m]} nombres={NOMBRES} />
      </Tarjeta>
  );
}

function Rentabilidad() {
  const { f, sin, toggle } = useFiltros();
  const g = agrupar(sin("producto"), (v) => v.producto);
  const datos = [...g.entries()].map(([k, a]) => ({ k, venta: a.venta, p: pct(a) * 100, margen: a.margen, pedidos: a.pedidos }));
  const t = sumar(sin("producto"));
  const mediaV = datos.length ? t.venta / datos.length : 0;
  const mediaP = pct(t) * 100;
  return (
    <Tarjeta className="c7" titulo="¿Qué productos dejan más ganancia?" sub="Más a la derecha, más venta. Más arriba, más ganancia por cada dólar vendido."
      insight={<>Cárnicos y Material de oficina venden mucho pero ganan poco (14 % y 19 %). Ropa gana el 67 % pero vende poco.</>}>
      <div style={{ height: 330 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 14, right: 30, left: 0, bottom: 14 }}>
            <CartesianGrid stroke="var(--grid)" />
            <XAxis type="number" dataKey="venta" {...ejeProps} tickFormatter={eje} name="Venta" label={{ value: "Venta total (US$)", position: "insideBottom", offset: -8, fill: "var(--text-3)", fontSize: 11 }} />
            <YAxis type="number" dataKey="p" {...ejeProps} tickFormatter={(x) => `${x} %`} width={46} domain={[0, 75]} />
            <ZAxis type="number" dataKey="pedidos" range={[60, 360]} />
            <ReferenceLine x={mediaV} stroke="var(--text-3)" strokeWidth={1} />
            <ReferenceLine y={mediaP} stroke="var(--text-3)" strokeWidth={1} label={{ value: `media ${mediaP.toFixed(0)} %`, position: "insideBottomRight", fill: "var(--text-3)", fontSize: 10.5 }} />
            <Tooltip cursor={false} content={<Tip titulo={(p) => p.k} filas={(p) => [["Venta", usd(p.venta)], ["Margen", usd(p.margen)], ["% margen", `${p.p.toFixed(1)} %`], ["Pedidos", num(p.pedidos)]]} pista="Clic para filtrar" />} />
            <Scatter data={datos} shape={PuntoProducto as any} onClick={(d: any) => toggle("producto", d.k ?? d.payload?.k)} style={{ cursor: "pointer" }}>
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {f.producto && <div className="nota">Filtro activo: {f.producto}. El gráfico muestra todos los productos para comparar.</div>}
    </Tarjeta>
  );
}

function Tendencia() {
  const { sin } = useFiltros();
  const [modo, setModo] = useState<"acum" | "mes">("acum");
  const base = sin("anios", "trim", "mes");
  const datos = useMemo(() => {
    const g = agrupar(base, (v) => `${v.anio}-${v.mes}`);
    const acc: Record<number, number> = { 2020: 0, 2021: 0, 2022: 0 };
    return MESES.map((m, i) => {
      const o: any = { m };
      for (const a of [2020, 2021, 2022]) {
        if (a === 2022 && i > 10) continue;
        const v = g.get(`${a}-${i + 1}`)?.venta ?? 0;
        acc[a] += v;
        o[a] = modo === "acum" ? acc[a] : v;
      }
      return o;
    });
  }, [base, modo]);
  const colores: Record<number, string> = { 2020: "var(--s3)", 2021: "var(--s1)", 2022: "var(--s2)" };
  return (
    <Tarjeta className="c5" titulo="¿Vamos mejor o peor que otros años?" sub={modo === "acum" ? "Venta acumulada en el año, mes a mes" : "Venta mensual por año"}
      extra={<Seg etiqueta="Modo" valor={modo} onChange={setModo} opciones={[{ v: "acum", t: "Acumulada" }, { v: "mes", t: "Mensual" }]} />}
      insight={<>2022 va mejor que 2020 y peor que 2021. La línea de 2022 se corta en noviembre porque los datos terminan el día 7.</>}>
      <div className="leyenda">{[2020, 2021, 2022].map((a) => <span key={a}><i style={{ background: colores[a] }} />{a}{a === 2022 ? " (hasta 7 nov)" : ""}</span>)}</div>
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={datos} margin={{ top: 6, right: 34, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="m" {...ejeProps} />
            <YAxis {...ejeProps} tickFormatter={eje} width={50} />
            <Tooltip content={({ active, payload, label }: any) => active && payload?.length ? (
              <div className="tip"><div className="tt">{label}</div>{payload.map((p: any) => <div className="fila" key={p.dataKey}><span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: p.stroke, marginRight: 6 }} />{p.dataKey}</span><b>{usd(p.value)}</b></div>)}</div>
            ) : null} />
            {[2020, 2021, 2022].map((a) => (
              <Line key={a} type="monotone" dataKey={String(a)} stroke={colores[a]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Tarjeta>
  );
}

function Segmentos() {
  const { f, toggle, sin } = useFiltros();
  const [m, setM] = useState<"venta" | "clientes">("venta");
  const ventas = sin("segmento");
  const g = agrupar(ventas, (v) => v.segmento);
  const nCli = new Map<string, number>();
  for (const c of CLIENTES) nCli.set(c.segmento, (nCli.get(c.segmento) ?? 0) + 1);
  const datos = [...SEGMENTOS, ...(m === "clientes" ? ["Sin compras"] : [])].map((k) => ({
    k, v: m === "venta" ? g.get(k)?.venta ?? 0 : nCli.get(k) ?? 0,
    sub: m === "venta" ? `${nCli.get(k) ?? 0} clientes` : undefined,
    titulo: `${k}: ${SEGMENTO_DESC[k]}`,
  }));
  const tot = [...g.values()].reduce((s, a) => s + a.venta, 0) || 1;
  const riesgo = (g.get("En riesgo")?.venta ?? 0) + (g.get("No se pueden perder")?.venta ?? 0);
  return (
    <Tarjeta className="c12" titulo="¿Qué clientes cuidar?" sub="Clientes agrupados según cuándo compraron por última vez, cuántas veces y cuánto gastaron · clic para filtrar"
      extra={<Seg etiqueta="Métrica" valor={m} onChange={setM} opciones={[{ v: "venta", t: "Venta" }, { v: "clientes", t: "Clientes" }]} />}
      insight={<><b>En riesgo</b> y <b>No se pueden perder</b> son 58 clientes que dejaron {porc(riesgo / tot, 0)} de la venta y hace tiempo que no compran.</>}
      nota="Los grupos A–E del archivo de clientes no se usan: los cinco gastan casi lo mismo.">
      <BarrasH datos={datos} seleccion={f.segmento} onClick={(k) => k !== "Sin compras" && toggle("segmento", k)} formato={m === "venta" ? usd : num} />
    </Tarjeta>
  );
}


const ABAJO = new Set(["Snacks", "Cuidado personal", "Cárnicos", "Frutas"]);
function PuntoProducto(props: { cx?: number; cy?: number; size?: number; payload?: { k: string } }) {
  const { cx = 0, cy = 0, size = 100, payload } = props;
  const r = Math.max(5, Math.sqrt(size / Math.PI));
  const value = payload?.k ?? "";
  const abajo = ABAJO.has(value);
  const izq = value === "Material de oficina";
  const der = value === "Alimento infantil";
  const fin = value === "Doméstico";
  const x = izq ? cx - r - 4 : der ? cx + r + 4 : fin ? cx + r : cx;
  const y = izq || der ? cy + 4 : abajo || fin ? cy + r + 12 : cy - r - 5;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="var(--s1)" fillOpacity={0.85} stroke="var(--surface)" strokeWidth={2} />
      <text x={x} y={y} textAnchor={izq || fin ? "end" : der ? "start" : "middle"} fill="var(--text-2)" fontSize={10.5}>{value}</text>
    </g>
  );
}
