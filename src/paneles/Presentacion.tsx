"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFiltros, type Pestana, type Filtros } from "@/lib/filtros";
import { agrupar, CLIENTES, PRIORIDADES, PROVEEDORES, pct, sumar, VENTAS, ESTADOS_PROV } from "@/lib/datos";
import { usd, num, porc, dias } from "@/lib/formato";
import { BarrasH, COLOR_ESTADO, Estado } from "@/components/ui";

type Decision = { tipo: "Operativa" | "Táctica" | "Estratégica"; texto: string };
type Diap = { id: string; eyebrow: string; titulo: string; texto: ReactNode; decisiones?: Decision[]; visual: ReactNode; ir?: { p: Pestana; f?: Partial<Filtros>; t: string } };

function useCifras() {
  return useMemo(() => {
    const t = sumar(VENTAS);
    const ytd = [2020, 2021, 2022].map((a) => ({ a, v: sumar(VENTAS.filter((x) => x.anio === a && x.mes <= 10)).venta, full: sumar(VENTAS.filter((x) => x.anio === a)).venta }));
    const prio = agrupar(VENTAS, (v) => v.prioridad);
    const prod = [...agrupar(VENTAS, (v) => v.producto).entries()].map(([k, a]) => ({ k, venta: a.venta, p: pct(a), margen: a.margen }));
    const saldo = PROVEEDORES.reduce((s, p) => s + p.saldo, 0);
    const est = ESTADOS_PROV.map((e) => { const g = PROVEEDORES.filter((p) => p.estado === e); return { e, n: g.length, s: g.reduce((x, p) => x + p.saldo, 0) }; });
    const cliCompra = CLIENTES.filter((c) => c.frecuencia > 0);
    const una = cliCompra.filter((c) => c.frecuencia === 1).length;
    const seg = agrupar(VENTAS, (v) => v.segmento);
    const zonas = [...agrupar(VENTAS, (v) => v.zona).entries()].map(([k, a]) => ({ k, v: a.venta, p: pct(a) })).sort((a, b) => b.v - a.v);
    return { t, ytd, prio, prod, saldo, est, cliCompra, una, seg, zonas, paises: new Set(VENTAS.map((v) => v.iso3)).size };
  }, []);
}

export function Presentacion() {
  const { irA } = useFiltros();
  const c = useCifras();
  const [i, setI] = useState(0);

  const diaps: Diap[] = [
    {
      id: "portada", eyebrow: "Consultoría estratégica · Air Transport, Panamá", titulo: "Tres años de datos para decidir mejor",
      texto: <>Un tablero que une <b>ventas</b>, <b>clientes</b> y <b>proveedores</b> para responder tres preguntas: qué mejorar mañana (operativo), qué ajustar este año (táctico) y hacia dónde crecer (estratégico).</>,
      visual: null,
    },
    {
      id: "fuentes", eyebrow: "Cómo se conectan los datos", titulo: "Tres archivos, dos puentes",
      texto: <>Ventas no traía un ID de cliente válido ni un proveedor. Para poder cruzarlos se aplicaron dos <b>supuestos de modelado</b>, declarados en «Datos y supuestos». El de proveedores es una simulación.</>,
      visual: <Fuentes />,
      ir: { p: "datos", t: "Ver supuestos y calidad de datos" },
    },
    {
      id: "ventas", eyebrow: "Ventas · Operativo", titulo: "2022 no está cayendo: está incompleto",
      texto: <>Con el año completo, 2022 parece un {porc(1 - c.ytd[2].full / c.ytd[1].full, 0)} peor que 2021. Pero solo llega al 7 de noviembre. Comparando <b>enero a octubre</b>, 2022 supera a 2020 y queda un {porc(1 - c.ytd[2].v / c.ytd[1].v, 0)} por debajo de 2021.</>,
      visual: <BarrasH datos={c.ytd.map((y) => ({ k: `${y.a} (ene–oct)`, v: y.v }))} formato={usd} />,
      decisiones: [{ tipo: "Operativa", texto: "Comparar siempre períodos equivalentes y fijar metas mensuales sobre el acumulado enero–octubre de 2021." }],
      ir: { p: "operativo", t: "Abrir el drill-down de ventas" },
    },
    {
      id: "envios", eyebrow: "Envíos · Operativo", titulo: "La prioridad del pedido no acelera el envío",
      texto: <>Un pedido <b>Crítico</b> tarda {dias(c.prio.get("Crítica")!.dias / c.prio.get("Crítica")!.pedidos)} en salir; uno de prioridad <b>Baja</b>, {dias(c.prio.get("Baja")!.dias / c.prio.get("Baja")!.pedidos)}. El plazo va de 0 a 50 días sin relación con la urgencia.</>,
      visual: <BarrasH datos={PRIORIDADES.map((k) => ({ k, v: c.prio.get(k)!.dias / c.prio.get(k)!.pedidos }))} formato={dias} max={50} />,
      decisiones: [
        { tipo: "Operativa", texto: "Crear una cola de despacho por prioridad con objetivos de servicio (por ejemplo, Crítica en 7 días o menos, Alta en 15)." },
        { tipo: "Operativa", texto: "Revisar a diario la lista de pedidos con alerta (más de 35 días o Críticos con más de 20)." },
      ],
      ir: { p: "operativo", f: { prioridad: "Crítica" }, t: "Ver pedidos críticos" },
    },
    {
      id: "costes", eyebrow: "Costes · Operativo / Táctico", titulo: "Precios congelados: el margen depende del mix",
      texto: <>Precio y coste unitario de cada producto son <b>idénticos de 2020 a 2022</b>. Cárnicos factura {usd(c.prod.find((p) => p.k === "Cárnicos")!.venta)} con solo {porc(c.prod.find((p) => p.k === "Cárnicos")!.p, 0)} de margen; Ropa deja {porc(c.prod.find((p) => p.k === "Ropa")!.p, 0)}.</>,
      visual: <BarrasH datos={[...c.prod].sort((a, b) => b.p - a.p).map((p) => ({ k: p.k, v: p.p }))} formato={(x) => porc(x, 0)} max={1} />,
      decisiones: [
        { tipo: "Operativa", texto: "Revisar precios congelados desde 2020 en los productos de margen bajo (Cárnicos 14 %, Material de oficina 19 %)." },
        { tipo: "Táctica", texto: "Renegociar el coste unitario con los proveedores de esas categorías antes del próximo ciclo de compras." },
      ],
      ir: { p: "operativo", t: "Ver análisis de costes" },
    },
    {
      id: "proveedores", eyebrow: "Proveedores · Táctico", titulo: `${porc(c.est[2].n / PROVEEDORES.length, 0)} de los proveedores lleva más de 3 años sin compras`,
      texto: <>Y aun así acumulan <b>{usd(c.est[2].s)}</b> de saldo pendiente, el {porc(c.est[2].s / c.saldo, 0)} del total. Solo {c.est[0].n} proveedores tuvieron actividad en el último año, y ninguno en los últimos seis meses.</>,
      visual: (
        <div>
          {c.est.map((e) => (
            <div key={e.e} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><Estado e={e.e} /><span><b>{num(e.n)}</b> proveedores · {usd(e.s)}</span></div>
              <div style={{ height: 10, background: "var(--grid)", borderRadius: 5, marginTop: 5 }}><div style={{ width: `${(e.n / PROVEEDORES.length) * 100}%`, height: "100%", background: COLOR_ESTADO[e.e], borderRadius: 5 }} /></div>
            </div>
          ))}
        </div>
      ),
      decisiones: [
        { tipo: "Táctica", texto: "Conciliar y cobrar o cerrar los saldos de los proveedores dormidos, empezando por los de mayor saldo." },
        { tipo: "Táctica", texto: "Depurar el maestro de proveedores y concentrar el volumen en los activos para ganar poder de negociación." },
      ],
      ir: { p: "tactico", t: "Ver listado de saldos" },
    },
    {
      id: "fidelizacion", eyebrow: "Clientes · Táctico", titulo: `${porc(c.una / c.cliCompra.length, 0)} de los clientes compró una sola vez`,
      texto: <>De {num(c.cliCompra.length)} clientes con compras, {num(c.una)} hicieron un único pedido y solo {c.cliCompra.filter((x) => x.frecuencia >= 3).length} llegan a tres o más. Además, {num(CLIENTES.length - c.cliCompra.length)} clientes registrados no tienen ninguna compra enlazada.</>,
      visual: <BarrasH datos={[1, 2, 3, 4, 5].map((n) => ({ k: n === 5 ? "5 o más pedidos" : `${n} pedido${n > 1 ? "s" : ""}`, v: c.cliCompra.filter((x) => (n === 5 ? x.frecuencia >= 5 : x.frecuencia === n)).length }))} formato={num} />,
      decisiones: [
        { tipo: "Táctica", texto: "Programa de segundo pedido: incentivo a los clientes recientes con una sola compra (fila superior de la matriz R×F)." },
        { tipo: "Táctica", texto: "Activar a los clientes registrados sin compras con una oferta de bienvenida." },
      ],
      ir: { p: "tactico", t: "Ver clientes frecuentes" },
    },
    {
      id: "rfm", eyebrow: "Segmentación · Estratégico", titulo: "Una quinta parte de la venta está en clientes que se enfrían",
      texto: <>Los segmentos <b>En riesgo</b> y <b>No se pueden perder</b> (58 clientes) generaron {usd((c.seg.get("En riesgo")?.venta ?? 0) + (c.seg.get("No se pueden perder")?.venta ?? 0))}, un {porc(((c.seg.get("En riesgo")?.venta ?? 0) + (c.seg.get("No se pueden perder")?.venta ?? 0)) / c.t.venta, 0)} del total, pero llevan tiempo sin comprar. Leales y Campeones (100 clientes) suman otro {porc(((c.seg.get("Leales")?.venta ?? 0) + (c.seg.get("Campeones")?.venta ?? 0)) / c.t.venta, 0)}.</>,
      visual: <BarrasH datos={["Leales", "En riesgo", "Potenciales leales", "Campeones", "Perdidos", "Nuevos", "Hibernando", "No se pueden perder", "Necesitan atención"].map((k) => ({ k, v: c.seg.get(k)?.venta ?? 0 }))} formato={usd} />,
      decisiones: [
        { tipo: "Táctica", texto: "Campaña de reactivación para En riesgo y No se pueden perder, con contacto directo del equipo comercial." },
        { tipo: "Estratégica", texto: "Gestión de cuentas clave para Leales y Campeones; usar RFM (no los grupos A–E, que no diferencian) como segmentación oficial." },
      ],
      ir: { p: "estrategico", f: { segmento: "En riesgo" }, t: "Filtrar el segmento En riesgo" },
    },
    {
      id: "portafolio", eyebrow: "Rentabilidad · Estratégico", titulo: "Defender, renegociar, potenciar",
      texto: <>Cosméticos (40 %) y Alimento infantil (38 %) combinan volumen y margen. Doméstico, Material de oficina y Cárnicos son la mitad de la venta con márgenes de 14–25 %. Ropa (67 %), Cereales (43 %) y Verduras (41 %) son muy rentables pero pequeños.</>,
      visual: <Cuadrantes prod={c.prod} />,
      decisiones: [
        { tipo: "Estratégica", texto: "Rediseñar el portafolio: impulsar comercialmente Ropa, Cereales y Verduras, proteger Cosméticos y Alimento infantil, y revisar la continuidad de Frutas (0.3 % de la venta y margen bajo)." },
      ],
      ir: { p: "estrategico", t: "Ver matriz de rentabilidad" },
    },
    {
      id: "geografia", eyebrow: "Mercados · Estratégico", titulo: `Presencia en ${c.paises} países, sin un mercado ancla`,
      texto: <>Ningún país supera el 2 % de la venta y el margen es casi igual en todas las zonas ({porc(Math.min(...c.zonas.map((z) => z.p)), 0)}–{porc(Math.max(...c.zonas.map((z) => z.p)), 0)}). África y Europa suman la mitad; Norteamérica, apenas el 2 %.</>,
      visual: <BarrasH datos={c.zonas.map((z) => ({ k: z.k, v: z.v }))} formato={usd} />,
      decisiones: [
        { tipo: "Estratégica", texto: "Elegir 2 o 3 zonas foco (África y Europa) para construir escala logística en lugar de dispersar esfuerzos en 184 destinos." },
        { tipo: "Estratégica", texto: "Evaluar la expansión en Norteamérica, donde reside la mayoría de los clientes registrados pero casi no hay envíos." },
      ],
      ir: { p: "estrategico", t: "Abrir el mapa" },
    },
    {
      id: "matriz", eyebrow: "Resumen", titulo: "Hoja de ruta de decisiones",
      texto: null,
      visual: null,
    },
  ];

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") setI((x) => Math.min(diaps.length - 1, x + 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [diaps.length]);

  const d = diaps[i];
  return (
    <div className="pres">
      <div className="pres-nav">
        <div className="puntos" aria-label="Diapositivas">
          {diaps.map((x, j) => <button key={x.id} aria-current={j === i} aria-label={`Ir a ${x.titulo}`} title={x.titulo} onClick={() => setI(j)} />)}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{i + 1} / {diaps.length} · use ← →</span>
          <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</button>
          <button className="btn prim" disabled={i === diaps.length - 1} onClick={() => setI(i + 1)}>Siguiente</button>
        </div>
      </div>

      {d.id === "portada" ? (
        <div className="diap portada">
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1040 }}>
            <div className="eyebrow" style={{ color: "#ffb79c" }}>{d.eyebrow}</div>
            <h2 style={{ fontSize: 40 }}>{d.titulo}</h2>
            <p style={{ fontSize: 17 }}>{d.texto}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, margin: "26px 0" }}>
              {[
                [usd(c.t.venta), "venta 2020–2022"],
                [porc(pct(c.t)), "margen bruto"],
                [num(c.t.pedidos), "pedidos"],
                [String(c.paises), "países de destino"],
                [num(CLIENTES.length), "clientes"],
                [num(PROVEEDORES.length), "proveedores"],
              ].map(([v, t]) => (
                <div key={t} style={{ background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
                  <div style={{ fontSize: 12.5, opacity: .8 }}>{t}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" style={{ background: "#fff", color: "#123a63", borderColor: "#fff" }} onClick={() => setI(1)}>Empezar la presentación</button>
              <button className="btn" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.5)" }} onClick={() => irA("operativo")}>Ir directo al tablero</button>
            </div>
          </div>
        </div>
      ) : d.id === "matriz" ? (
        <div className="diap" style={{ gridTemplateColumns: "1fr", alignItems: "start" }}>
          <div>
            <div className="eyebrow">{d.eyebrow}</div>
            <h2>{d.titulo}</h2>
            <p>Cada decisión sale de un panel del tablero. Las operativas se pueden aplicar este mes; las tácticas, en el próximo trimestre; las estratégicas definen el plan a 2–3 años.</p>
          </div>
          <div className="matriz">
            {(["Operativa", "Táctica", "Estratégica"] as const).map((t) => (
              <div className="col" key={t}>
                <h4 style={{ color: t === "Operativa" ? "var(--s1)" : t === "Táctica" ? "var(--accent)" : "var(--s3)" }}>{t}s</h4>
                <ul>{diaps.flatMap((x) => (x.decisiones ?? []).filter((y) => y.tipo === t).map((y) => <li key={y.texto}>{y.texto}</li>))}</ul>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn prim" onClick={() => irA("operativo")}>Explorar el tablero</button>
            <button className="btn" onClick={() => irA("datos")}>Datos y supuestos</button>
          </div>
        </div>
      ) : (
        <div className="diap">
          <div>
            <div className="eyebrow">{d.eyebrow}</div>
            <h2>{d.titulo}</h2>
            <p>{d.texto}</p>
            {d.decisiones?.map((x) => (
              <div className="decision" key={x.texto}>
                <div className={`tipo ${x.tipo === "Operativa" ? "op" : x.tipo === "Táctica" ? "ta" : "es"}`}>Decisión {x.tipo.toLowerCase()}</div>
                <div>{x.texto}</div>
              </div>
            ))}
            {d.ir && <button className="btn-link" onClick={() => irA(d.ir!.p, d.ir!.f)}>{d.ir.t} →</button>}
          </div>
          <div style={{ minWidth: 0 }}>{d.visual}</div>
        </div>
      )}
    </div>
  );
}

function Fuentes() {
  const caja = (t: string, s: string, color: string) => (
    <div style={{ border: `2px solid ${color}`, borderRadius: 12, padding: "12px 14px", background: "var(--surface)", textAlign: "center" }}>
      <div style={{ fontWeight: 700 }}>{t}</div><div style={{ fontSize: 12, color: "var(--text-3)" }}>{s}</div>
    </div>
  );
  const puente = (t: string, s: string) => (
    <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-2)", padding: "4px 0" }}>
      <div style={{ fontSize: 18, color: "var(--text-3)" }}>↕</div><b>{t}</b><div style={{ color: "var(--text-3)" }}>{s}</div>
    </div>
  );
  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      {caja("Clientes", "999 clientes · EE. UU. y Reino Unido · grupos A–E", "var(--s3)")}
      {puente("ID por los 3 primeros dígitos", "C2421 → C0242 · 1,000 pedidos enlazados con 580 clientes")}
      {caja("Ventas", "1,000 pedidos · 184 países · 12 productos", "var(--s1)")}
      {puente("Categoría de producto (simulado)", "cada proveedor recibe una categoría; los pedidos se reparten entre ellos")}
      {caja("Proveedores", "999 proveedores · saldo pendiente · última compra", "var(--s2)")}
    </div>
  );
}

function Cuadrantes({ prod }: { prod: { k: string; venta: number; p: number }[] }) {
  const mv = prod.reduce((s, p) => s + p.venta, 0) / prod.length;
  const mp = prod.reduce((s, p) => s + p.venta * p.p, 0) / prod.reduce((s, p) => s + p.venta, 0);
  const q = (alto: boolean, grande: boolean) => prod.filter((p) => (p.p >= mp) === alto && (p.venta >= mv) === grande).sort((a, b) => b.venta - a.venta);
  const celda = (t: string, s: string, l: typeof prod, color: string) => (
    <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${color}`, borderRadius: 12, padding: 12, background: "var(--surface-2)" }}>
      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t}</div>
      <div style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 6 }}>{s}</div>
      {l.map((p) => <div key={p.k} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", gap: 8 }}><span>{p.k}</span><span style={{ color: "var(--text-3)" }}>{porc(p.p, 0)}</span></div>)}
      {!l.length && <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>—</div>}
    </div>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {celda("Potenciar", "margen alto · venta baja", q(true, false), "var(--s3)")}
      {celda("Defender", "margen alto · venta alta", q(true, true), "var(--s1)")}
      {celda("Revisar", "margen bajo · venta baja", q(false, false), "var(--muted-mark)")}
      {celda("Renegociar", "margen bajo · venta alta", q(false, true), "var(--s2)")}
      <div style={{ gridColumn: "span 2", fontSize: 11.5, color: "var(--text-3)" }}>Cortes: venta media por producto ({usd(mv)}) y margen medio ponderado ({porc(mp, 0)}).</div>
    </div>
  );
}
