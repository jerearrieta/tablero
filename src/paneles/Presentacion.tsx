"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFiltros, type Pestana, type Filtros } from "@/lib/filtros";
import { agrupar, CLIENTES, PRIORIDADES, PROVEEDORES, pct, sumar, VENTAS, ESTADOS_PROV } from "@/lib/datos";
import { usd, num, porc, dias } from "@/lib/formato";
import { BarrasH, COLOR_ESTADO, Estado } from "@/components/ui";

type Tipo = "Operativa" | "Táctica" | "Estratégica";
type Decision = { tipo: Tipo; que: string; quien: string; cuando: string; meta: string };
type Diap = { id: string; eyebrow: string; titulo: string; dato: ReactNode; visual: ReactNode; decisiones: Decision[]; ir: { p: Pestana; f?: Partial<Filtros>; t: string } };

const COLOR_TIPO: Record<Tipo, string> = { Operativa: "var(--s1)", Táctica: "var(--accent)", Estratégica: "var(--s3)" };
const CLASE_TIPO: Record<Tipo, string> = { Operativa: "op", Táctica: "ta", Estratégica: "es" };
const PLAZO_TIPO: Record<Tipo, string> = { Operativa: "Este mes", Táctica: "Próximos 3 a 6 meses", Estratégica: "Próximos 2 a 3 años" };

function useCifras() {
  return useMemo(() => {
    const t = sumar(VENTAS);
    const ytd = [2020, 2021, 2022].map((a) => ({ a, v: sumar(VENTAS.filter((x) => x.anio === a && x.mes <= 10)).venta }));
    const prio = agrupar(VENTAS, (v) => v.prioridad);
    const critica = VENTAS.filter((v) => v.prioridad === "Crítica");
    const criticaLenta = critica.filter((v) => v.dias > 7).length;
    const lentos = VENTAS.filter((v) => v.dias > 35).length;
    const prod = [...agrupar(VENTAS, (v) => v.producto).entries()].map(([k, a]) => ({ k, venta: a.venta, p: pct(a) }));
    const est = ESTADOS_PROV.map((e) => { const g = PROVEEDORES.filter((p) => p.estado === e); return { e, n: g.length, s: g.reduce((x, p) => x + p.saldo, 0) }; });
    const saldo = PROVEEDORES.reduce((s, p) => s + p.saldo, 0);
    const top100 = PROVEEDORES.filter((p) => p.estado === "Dormido").sort((a, b) => b.saldo - a.saldo).slice(0, 100).reduce((s, p) => s + p.saldo, 0);
    const conCompra = CLIENTES.filter((c) => c.frecuencia > 0);
    const una = conCompra.filter((c) => c.frecuencia === 1).length;
    const seg = agrupar(VENTAS, (v) => v.segmento);
    const riesgo = (seg.get("En riesgo")?.venta ?? 0) + (seg.get("No se pueden perder")?.venta ?? 0);
    const nRiesgo = CLIENTES.filter((c) => c.segmento === "En riesgo" || c.segmento === "No se pueden perder").length;
    const zonas = [...agrupar(VENTAS, (v) => v.zona).entries()].map(([k, a]) => ({ k, v: a.venta })).sort((a, b) => b.v - a.v);
    const paises = new Set(VENTAS.map((v) => v.iso3)).size;
    return { t, ytd, prio, critica, criticaLenta, lentos, prod, est, saldo, top100, conCompra, una, riesgo, nRiesgo, zonas, paises };
  }, []);
}

export function Presentacion() {
  const { irA } = useFiltros();
  const c = useCifras();
  const [i, setI] = useState(0);
  const p = (k: string) => c.prod.find((x) => x.k === k)!;
  const tresProd = (["Ropa", "Cereales", "Verduras"] as const).reduce((s, k) => s + p(k).venta, 0) / c.t.venta;
  const afEu = c.zonas.filter((z) => z.k === "África" || z.k === "Europa").reduce((s, z) => s + z.v, 0) / c.t.venta;
  const dormido = c.est.find((e) => e.e === "Dormido")!;

  const diaps: Diap[] = [
    {
      id: "ventas", eyebrow: "Táctico · Ventas", titulo: "2022 no cae: solo tiene datos hasta el 7 de noviembre",
      dato: <>Si comparamos lo mismo (enero a octubre), 2022 vendió <b>más que 2020</b> y un {porc(1 - c.ytd[2].v / c.ytd[1].v, 0)} menos que 2021.</>,
      visual: <BarrasH datos={c.ytd.map((y) => ({ k: `${y.a} (ene–oct)`, v: y.v }))} formato={usd} />,
      decisiones: [
        { tipo: "Operativa", que: "Fijar una meta de venta mensual y compararla siempre contra el mismo mes del año anterior.", quien: "Gerente de ventas", cuando: "Desde este mes", meta: `Volver al nivel de 2021: ${usd(c.ytd[1].v / 10)} por mes` },
      ],
      ir: { p: "tactico", t: "Ver ventas por año, mes y día" },
    },
    {
      id: "envios", eyebrow: "Operativo · Envíos", titulo: "Los pedidos urgentes no salen antes",
      dato: <>Un pedido <b>Crítico</b> tarda {dias(c.prio.get("Crítica")!.dias / c.prio.get("Crítica")!.pedidos)} en enviarse, casi igual que uno de prioridad Baja. {num(c.lentos)} pedidos ({porc(c.lentos / c.t.pedidos, 0)}) tardaron más de 35 días.</>,
      visual: <BarrasH datos={PRIORIDADES.map((k) => ({ k, v: c.prio.get(k)!.dias / c.prio.get(k)!.pedidos }))} formato={dias} max={50} />,
      decisiones: [
        { tipo: "Operativa", que: "Despachar primero los pedidos Críticos: máximo 7 días para Crítica y 15 días para Alta.", quien: "Jefe de logística", cuando: "Desde la próxima semana", meta: `Plazo medio de Críticos de ${dias(c.prio.get("Crítica")!.dias / c.prio.get("Crítica")!.pedidos)} a 7 días en 3 meses` },
        { tipo: "Operativa", que: "Revisar cada mañana la cola de despacho del panel Operativo y enviar primero los pedidos atrasados.", quien: "Coordinador de despacho", cuando: "Todos los días", meta: `Pedidos de más de 35 días: de ${porc(c.lentos / c.t.pedidos, 0)} a menos del 5 %` },
      ],
      ir: { p: "operativo", f: { prioridad: "Crítica" }, t: "Ver la cola de pedidos críticos" },
    },
    {
      id: "proveedores", eyebrow: "Táctico · Proveedores", titulo: "3 de cada 4 proveedores llevan más de 3 años sin compras",
      dato: <>Esos {num(dormido.n)} proveedores todavía tienen <b>{usd(dormido.s)}</b> de saldo pendiente, el {porc(dormido.s / c.saldo, 0)} del total.</>,
      visual: (
        <div>
          {c.est.map((e) => (
            <div key={e.e} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><Estado e={e.e} /><span><b>{num(e.n)}</b> proveedores · {usd(e.s)}</span></div>
              <div style={{ height: 10, background: "var(--grid)", borderRadius: 5, marginTop: 5 }}><div style={{ width: `${(e.n / PROVEEDORES.length) * 100}%`, height: "100%", background: COLOR_ESTADO[e.e], borderRadius: 5 }} /></div>
            </div>
          ))}
        </div>
      ),
      decisiones: [
        { tipo: "Táctica", que: `Llamar a los 100 proveedores dormidos con más saldo (${usd(c.top100)}) para conciliar la cuenta y saldarla o cerrarla.`, quien: "Compras y contabilidad", cuando: "En los próximos 3 meses", meta: "Las 100 cuentas conciliadas antes de fin de trimestre" },
        { tipo: "Táctica", que: `Renegociar el coste unitario de Cárnicos (gana ${porc(p("Cárnicos").p, 0)}) y Material de oficina (${porc(p("Material de oficina").p, 0)}) con sus proveedores.`, quien: "Compras", cuando: "Antes del próximo ciclo de compras", meta: "Subir la ganancia de ambos productos al 20 % o más" },
      ],
      ir: { p: "tactico", t: "Ver la lista de saldos" },
    },
    {
      id: "clientes", eyebrow: "Táctico · Clientes", titulo: `${porc(c.una / c.conCompra.length, 0)} de los clientes compró una sola vez`,
      dato: <>De {num(c.conCompra.length)} clientes con compras, {num(c.una)} no volvieron. Y hay {c.nRiesgo} clientes valiosos que dejaron de comprar: generaron <b>{usd(c.riesgo)}</b> ({porc(c.riesgo / c.t.venta, 0)} de la venta).</>,
      visual: <BarrasH datos={[1, 2, 3, 4].map((n) => ({ k: n === 4 ? "4 o más pedidos" : `${n} pedido${n > 1 ? "s" : ""}`, v: c.conCompra.filter((x) => (n === 4 ? x.frecuencia >= 4 : x.frecuencia === n)).length }))} formato={num} />,
      decisiones: [
        { tipo: "Táctica", que: `Enviar a los ${num(c.una)} clientes de una sola compra un 5 % de descuento en su segundo pedido.`, quien: "Marketing", cuando: "Campaña en los próximos 2 meses", meta: "Que 1 de cada 10 vuelva a comprar en 6 meses" },
        { tipo: "Táctica", que: `Contactar uno por uno a los ${c.nRiesgo} clientes de los segmentos En riesgo y No se pueden perder.`, quien: "Equipo comercial", cuando: "En los próximos 3 meses", meta: "Recuperar al menos 20 de ellos" },
      ],
      ir: { p: "estrategico", f: { segmento: "En riesgo" }, t: "Ver clientes en riesgo" },
    },
    {
      id: "productos", eyebrow: "Estratégico · Productos", titulo: "Los productos que más venden no son los que más ganan",
      dato: <>Cárnicos y Material de oficina están entre los que más venden, pero ganan solo {porc(p("Cárnicos").p, 0)} y {porc(p("Material de oficina").p, 0)}. Ropa, Cereales y Verduras ganan más del 40 % y son apenas el {porc(tresProd, 0)} de la venta.</>,
      visual: <BarrasH datos={[...c.prod].sort((a, b) => b.p - a.p).map((x) => ({ k: x.k, v: x.p }))} formato={(x) => porc(x, 0)} max={1} />,
      decisiones: [
        { tipo: "Estratégica", que: "Dar más espacio comercial a Ropa, Cereales y Verduras, los productos que más ganan por dólar vendido.", quien: "Gerencia comercial", cuando: "Plan a 2 años", meta: `Subir su parte de la venta del ${porc(tresProd, 0)} al 20 %` },
        { tipo: "Estratégica", que: `Evaluar dejar de vender Frutas: es el ${porc(p("Frutas").venta / c.t.venta, 1)} de la venta y gana poco.`, quien: "Dirección general", cuando: "Decisión en 6 meses", meta: "Decidir si se mantiene o se retira" },
      ],
      ir: { p: "estrategico", t: "Ver ganancia por producto" },
    },
    {
      id: "mercados", eyebrow: "Estratégico · Mercados", titulo: `Vendemos en ${c.paises} países, pero ninguno es fuerte`,
      dato: <>Ningún país llega al 2 % de la venta. África y Europa juntas son el {porc(afEu, 0)}. Norteamérica, donde vive la mayoría de los clientes registrados, es apenas el 2 %.</>,
      visual: <BarrasH datos={c.zonas.map((z) => ({ k: z.k, v: z.v }))} formato={usd} />,
      decisiones: [
        { tipo: "Estratégica", que: "Elegir África y Europa como zonas principales y concentrar ahí la logística y la promoción.", quien: "Dirección general", cuando: "Plan a 3 años", meta: `Subir su parte de la venta del ${porc(afEu, 0)} al 60 %` },
        { tipo: "Estratégica", que: "Abrir un plan comercial en Norteamérica, donde ya están la mayoría de los clientes registrados.", quien: "Gerencia comercial", cuando: "Plan a 3 años", meta: "Pasar del 2 % al 5 % de la venta" },
      ],
      ir: { p: "estrategico", t: "Ver el mapa" },
    },
  ];
  const total = diaps.length + 2; // portada + diapositivas + resumen

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") setI((x) => Math.min(total - 1, x + 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [total]);

  const todas = diaps.flatMap((d) => d.decisiones);
  const titulos = ["Portada", ...diaps.map((d) => d.titulo), "Resumen de decisiones"];

  return (
    <div className="pres">
      <div className="pres-nav">
        <div className="puntos" aria-label="Diapositivas">
          {titulos.map((t, j) => <button key={j} aria-current={j === i} aria-label={`Ir a ${t}`} title={t} onClick={() => setI(j)} />)}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{i + 1} / {total} · use ← →</span>
          <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</button>
          <button className="btn prim" disabled={i === total - 1} onClick={() => setI(i + 1)}>Siguiente</button>
        </div>
      </div>

      {i === 0 && (
        <div className="diap portada">
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1040 }}>
            <div className="eyebrow" style={{ color: "#ffb79c" }}>Air Transport, Panamá · ventas, clientes y proveedores 2020–2022</div>
            <h2 style={{ fontSize: 40 }}>Qué hacer con lo que dicen los datos</h2>
            <p style={{ fontSize: 17 }}>Seis hallazgos y, para cada uno, decisiones concretas: qué hacer, quién lo hace, cuándo y cómo medir si funcionó.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, margin: "26px 0" }}>
              {[[usd(c.t.venta), "vendidos"], [porc(pct(c.t)), "de ganancia"], [num(c.t.pedidos), "pedidos"], [String(c.paises), "países"]].map(([v, t]) => (
                <div key={t} style={{ background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{v}</div>
                  <div style={{ fontSize: 12.5, opacity: .8 }}>{t}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22, fontSize: 13 }}>
              {(["Operativa", "Táctica", "Estratégica"] as Tipo[]).map((t) => (
                <span key={t} style={{ background: "rgba(255,255,255,.12)", borderRadius: 99, padding: "4px 12px" }}><b>{t}</b> · {PLAZO_TIPO[t].toLowerCase()}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" style={{ background: "#fff", color: "#123a63", borderColor: "#fff" }} onClick={() => setI(1)}>Empezar</button>
              <button className="btn" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.5)" }} onClick={() => irA("operativo")}>Ir al tablero</button>
            </div>
          </div>
        </div>
      )}

      {i > 0 && i <= diaps.length && (() => {
        const d = diaps[i - 1];
        return (
          <div className="diap" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
            <div>
              <div className="eyebrow">{d.eyebrow}</div>
              <h2>{d.titulo}</h2>
              <p>{d.dato}</p>
              <div style={{ marginTop: 18 }}>{d.visual}</div>
              <button className="btn-link" onClick={() => irA(d.ir.p, d.ir.f)}>{d.ir.t} en el tablero →</button>
            </div>
            <div>
              {d.decisiones.map((x) => <TarjetaDecision key={x.que} d={x} />)}
            </div>
          </div>
        );
      })()}

      {i === total - 1 && (
        <div className="diap" style={{ gridTemplateColumns: "1fr", alignItems: "start" }}>
          <div>
            <div className="eyebrow">Resumen</div>
            <h2>Plan de acción</h2>
          </div>
          <div className="tabla-env">
            <table className="tabla">
              <thead><tr><th>Tipo</th><th>Qué hacer</th><th>Quién</th><th>Cuándo</th><th>Meta</th></tr></thead>
              <tbody>
                {todas.map((x) => (
                  <tr key={x.que}>
                    <td><b style={{ color: COLOR_TIPO[x.tipo] }}>{x.tipo}</b></td>
                    <td style={{ whiteSpace: "normal", minWidth: 260 }}>{x.que}</td>
                    <td style={{ whiteSpace: "normal" }}>{x.quien}</td>
                    <td style={{ whiteSpace: "normal" }}>{x.cuando}</td>
                    <td style={{ whiteSpace: "normal", minWidth: 180 }}>{x.meta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn prim" onClick={() => irA("operativo")}>Explorar el tablero</button>
            <button className="btn" onClick={() => irA("datos")}>Cómo se hicieron los cálculos</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TarjetaDecision({ d }: { d: Decision }) {
  const fila = (k: string, v: string) => (
    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 8, fontSize: 13, marginTop: 4 }}>
      <span style={{ color: "var(--text-3)" }}>{k}</span><span>{v}</span>
    </div>
  );
  return (
    <div className="decision" style={{ borderLeft: `4px solid ${COLOR_TIPO[d.tipo]}`, marginTop: 0, marginBottom: 12 }}>
      <div className={`tipo ${CLASE_TIPO[d.tipo]}`}>Decisión {d.tipo.toLowerCase()}</div>
      <div style={{ fontSize: 15, fontWeight: 600, margin: "4px 0 6px" }}>{d.que}</div>
      {fila("Quién", d.quien)}
      {fila("Cuándo", d.cuando)}
      {fila("Meta", d.meta)}
    </div>
  );
}
