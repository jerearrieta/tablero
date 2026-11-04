"use client";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, LabelList } from "recharts";
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
          <p>Dónde vende Air Transport, qué productos dejan dinero, qué clientes valen más y hacia dónde va el negocio. Pensado para decisiones de largo plazo.</p>
        </div>
      </div>
      <Seccion titulo="Análisis geográfico" sub="País de destino del pedido" />
      <div className="grid">
        <MapaVentas />
        <Zonas />
      </div>
      <Seccion titulo="Rentabilidad y tendencia" />
      <div className="grid">
        <Rentabilidad />
        <Tendencia />
      </div>
      <Seccion titulo="Segmentación de clientes" sub="RFM (recencia, frecuencia, monto) y grupos A–E del registro" />
      <div className="grid">
        <Segmentos />
        <MatrizRF />
        <Grupos />
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
  const top = [...g.entries()].map(([k, a]) => ({ k, nombre: NOMBRES.get(k)!, ...a, p: pct(a) })).sort((a, b) => b.venta - a.venta);
  type T = (typeof top)[number];
  const cols: Col<T>[] = [
    { k: "nombre", t: "País", v: (r) => r.nombre, orden: (r) => r.nombre },
    { k: "pedidos", t: "Ped.", v: (r) => r.pedidos, orden: (r) => r.pedidos, num: true },
    { k: "venta", t: "Venta", v: (r) => usd(r.venta), orden: (r) => r.venta, num: true },
    { k: "p", t: "% margen", v: (r) => porc(r.p, 0), orden: (r) => r.p, num: true },
  ];
  return (
    <>
      <Tarjeta className="c8" titulo="Mapa de ventas por país" sub={`${g.size} países con pedidos · clic en un país para filtrar`}
        extra={<Seg etiqueta="Métrica" valor={m} onChange={setM} opciones={[{ v: "venta", t: "Venta" }, { v: "margen", t: "Margen" }, { v: "pct", t: "% margen" }, { v: "pedidos", t: "Pedidos" }]} />}
        insight={<>La venta está <b>muy repartida</b>: 184 países y ninguno supera el 2 % del total. África y Europa suman la mitad de la facturación; Norteamérica, donde están la mayoría de los clientes registrados, apenas el 2 %.</>}>
        <Mapa valores={valores} formato={fmt} seleccion={f.pais} onClick={(iso) => toggle("pais", iso)} etiqueta={{ venta: "Venta", margen: "Margen", pct: "% margen", pedidos: "Pedidos" }[m]} nombres={NOMBRES} />
      </Tarjeta>
      <Tarjeta className="c4" titulo="Ranking de países" sub="Clic para filtrar">
        <Tabla filas={top} cols={cols} clave={(r) => r.k} ordenInicial="venta" porPagina={10} seleccion={f.pais} onFila={(r) => toggle("pais", r.k)} buscar={(r) => r.nombre} />
      </Tarjeta>
    </>
  );
}

function Zonas() {
  const { f, sin, toggle } = useFiltros();
  const g = agrupar(sin("zona", "pais"), (v) => v.zona);
  const tot = [...g.values()].reduce((s, a) => s + a.venta, 0) || 1;
  const datos = [...g.entries()].map(([k, a]) => ({ k, v: a.venta, sub: `${porc(a.venta / tot, 0)} · margen ${porc(pct(a), 0)}` })).sort((a, b) => b.v - a.v);
  return (
    <Tarjeta className="c12" titulo="Venta por zona geográfica" sub="Clic para filtrar por zona · «Oriente Medio» es una zona corregida en la limpieza"
      insight={<>El margen es casi igual en todas las zonas (entre 28 % y 30 %): <b>la rentabilidad no la decide el destino sino el producto</b>. Crecer en una zona exige volumen, no cambia la rentabilidad.</>}>
      <BarrasH datos={datos} seleccion={f.zona} onClick={(k) => toggle("zona", k)} formato={usd} />
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
    <Tarjeta className="c7" titulo="Rentabilidad por producto" sub="Venta (eje X) vs. % de margen (eje Y). Líneas = promedio. Clic en un punto para filtrar."
      insight={<>Arriba a la derecha están los productos a <b>defender</b> (Cosméticos). Abajo a la derecha, mucho volumen con poco margen (Doméstico, Cárnicos, Material de oficina): <b>renegociar coste o precio</b>. Arriba a la izquierda, margen alto con poca venta (Ropa 67 %, Cereales 43 %): <b>potenciar</b>.</>}>
      <div style={{ height: 330 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 14, right: 30, left: 0, bottom: 14 }}>
            <CartesianGrid stroke="var(--grid)" />
            <XAxis type="number" dataKey="venta" {...ejeProps} tickFormatter={eje} name="Venta" label={{ value: "Venta (US$)", position: "insideBottom", offset: -8, fill: "var(--text-3)", fontSize: 11 }} />
            <YAxis type="number" dataKey="p" {...ejeProps} tickFormatter={(x) => `${x} %`} width={46} domain={[0, 75]} />
            <ZAxis type="number" dataKey="pedidos" range={[60, 360]} />
            <ReferenceLine x={mediaV} stroke="var(--text-3)" strokeWidth={1} />
            <ReferenceLine y={mediaP} stroke="var(--text-3)" strokeWidth={1} label={{ value: `media ${mediaP.toFixed(0)} %`, position: "insideBottomLeft", fill: "var(--text-3)", fontSize: 10.5 }} />
            <Tooltip cursor={false} content={<Tip titulo={(p) => p.k} filas={(p) => [["Venta", usd(p.venta)], ["Margen", usd(p.margen)], ["% margen", `${p.p.toFixed(1)} %`], ["Pedidos", num(p.pedidos)]]} pista="Clic para filtrar" />} />
            <Scatter data={datos} fill="var(--s1)" fillOpacity={0.85} stroke="var(--surface)" strokeWidth={2} onClick={(d: any) => toggle("producto", d.k ?? d.payload?.k)} style={{ cursor: "pointer" }}>
              <LabelList dataKey="k" content={EtiquetaProducto as any} />
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
    <Tarjeta className="c5" titulo="Tendencia a largo plazo" sub={modo === "acum" ? "Venta acumulada en el año, mes a mes" : "Venta mensual por año"}
      extra={<Seg etiqueta="Modo" valor={modo} onChange={setModo} opciones={[{ v: "acum", t: "Acumulada" }, { v: "mes", t: "Mensual" }]} />}
      insight={<>A igual fecha, <b>2022 va por delante de 2020</b> y por detrás de 2021. Noviembre de 2022 solo tiene 7 días, por eso la línea se corta.</>}>
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
    <Tarjeta className="c5" titulo="Segmentos RFM" sub="Pase el cursor para ver la definición · clic para filtrar todo el tablero"
      extra={<Seg etiqueta="Métrica" valor={m} onChange={setM} opciones={[{ v: "venta", t: "Venta" }, { v: "clientes", t: "Clientes" }]} />}
      insight={<>Los segmentos <b>En riesgo</b> y <b>No se pueden perder</b> (58 clientes) explican {porc(riesgo / tot, 0)} de la venta y llevan tiempo sin comprar: son la prioridad de la campaña de reactivación. 419 clientes registrados nunca compraron.</>}>
      <BarrasH datos={datos} seleccion={f.segmento} onClick={(k) => k !== "Sin compras" && toggle("segmento", k)} formato={m === "venta" ? usd : num} />
    </Tarjeta>
  );
}

function MatrizRF() {
  const { f } = useFiltros();
  const cs = CLIENTES.filter((c) => c.R != null && (!f.grupo || c.grupo === f.grupo));
  const cel = new Map<string, { n: number; v: number }>();
  for (const c of cs) { const k = `${c.R}|${Math.min(5, c.F!)}`; const o = cel.get(k) ?? { n: 0, v: 0 }; o.n++; o.v += c.venta; cel.set(k, o); }
  const max = Math.max(1, ...[...cel.values()].map((o) => o.n));
  return (
    <Tarjeta className="c7" titulo="Matriz recencia × frecuencia" sub="Número de clientes en cada combinación. R = 5 compró hace poco; F = número de pedidos."
      nota="Puntuaciones R y M por quintiles; F es el número de pedidos (5 = cinco o más). El filtro de grupo A–E se aplica aquí.">
      <div className="heat" style={{ gridTemplateColumns: "90px repeat(5, 1fr)", maxWidth: 560 }}>
        <div className="h" />
        {[1, 2, 3, 4, 5].map((F) => <div className="h" key={F}>F = {F === 5 ? "5+" : F}</div>)}
        {[5, 4, 3, 2, 1].map((R) => (
          <Fila key={R} R={R} cel={cel} max={max} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-3)", maxWidth: 560, marginTop: 6 }}>
        <span>← compra poco</span><span>compra a menudo →</span>
      </div>
      <div className="insight">La mayoría de los clientes compró <b>una sola vez</b> (columna F = 1). Los de arriba a la izquierda (recientes, un pedido) son los candidatos ideales para un segundo pedido con incentivo.</div>
    </Tarjeta>
  );
}
function Fila({ R, cel, max }: { R: number; cel: Map<string, { n: number; v: number }>; max: number }) {
  return (
    <>
      <div className="r">R = {R} {R === 5 ? "(reciente)" : R === 1 ? "(antiguo)" : ""}</div>
      {[1, 2, 3, 4, 5].map((F) => {
        const o = cel.get(`${R}|${F}`);
        const n = o?.n ?? 0;
        return (
          <div key={F} className="cel" style={{ background: n ? colorSeq(n, 0, max) : "var(--seq-0)", color: tintaSeq(n, 0, max), minHeight: 34, cursor: "default" }}
            title={`R=${R}, F=${F}: ${n} clientes · ${usd(o?.v ?? 0)}`}>{n || ""}</div>
        );
      })}
    </>
  );
}

function Grupos() {
  const { f, toggle, sin } = useFiltros();
  const ventas = sin("grupo");
  const filas = GRUPOS.map((gr) => {
    const cs = CLIENTES.filter((c) => c.grupo === gr);
    const vs = ventas.filter((v) => v.grupo === gr);
    const a = sumar(vs);
    const conCompra = new Set(vs.map((v) => v.cliente)).size;
    return { gr, clientes: cs.length, conCompra, venta: a.venta, pedidos: a.pedidos, ticket: a.pedidos ? a.venta / a.pedidos : 0, p: pct(a), edad: cs.reduce((s, c) => s + c.edad, 0) / cs.length };
  });
  type F = (typeof filas)[number];
  const cols: Col<F>[] = [
    { k: "gr", t: "Grupo", v: (r) => <b>{r.gr}</b>, orden: (r) => r.gr },
    { k: "clientes", t: "Clientes", v: (r) => r.clientes, orden: (r) => r.clientes, num: true },
    { k: "conCompra", t: "Con compra", v: (r) => r.conCompra, orden: (r) => r.conCompra, num: true },
    { k: "pedidos", t: "Pedidos", v: (r) => r.pedidos, orden: (r) => r.pedidos, num: true },
    { k: "venta", t: "Venta", v: (r) => usd(r.venta), orden: (r) => r.venta, num: true },
    { k: "ticket", t: "Ticket medio", v: (r) => usd(r.ticket), orden: (r) => r.ticket, num: true },
    { k: "p", t: "% margen", v: (r) => porc(r.p), orden: (r) => r.p, num: true },
    { k: "edad", t: "Edad media", v: (r) => r.edad.toFixed(0), orden: (r) => r.edad, num: true },
  ];
  return (
    <Tarjeta className="c12" titulo="Grupos A–E del registro de clientes" sub="Comparación de los cinco grupos · clic en una fila para filtrar"
      insight={<>Los cinco grupos tienen <b>tamaño, ticket medio y margen casi idénticos</b>: la clasificación A–E del archivo no separa clientes por valor. Por eso la segmentación estratégica usa RFM, y A–E queda como filtro administrativo.</>}>
      <Tabla filas={filas} cols={cols} clave={(r) => r.gr} porPagina={5} seleccion={f.grupo} onFila={(r) => toggle("grupo", r.gr)} />
    </Tarjeta>
  );
}

const ABAJO = new Set(["Snacks", "Cuidado personal", "Doméstico", "Cárnicos", "Frutas"]);
function EtiquetaProducto(props: { x?: number; y?: number; width?: number; height?: number; value?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, value = "" } = props;
  const cx = x + width / 2, cy = y + height / 2;
  const abajo = ABAJO.has(value);
  const derecha = value === "Doméstico" || value === "Material de oficina";
  return (
    <text x={derecha ? cx - 10 : cx} y={abajo ? cy + 20 : cy - 12} textAnchor={derecha ? "end" : "middle"} fill="var(--text-2)" fontSize={10.5}>{value}</text>
  );
}
