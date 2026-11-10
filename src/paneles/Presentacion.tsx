"use client";
import { useEffect, useMemo, useState } from "react";
import { useFiltros, type Pestana, type Filtros } from "@/lib/filtros";
import { agrupar, CLIENTES, PROVEEDORES, pct, sumar, VENTAS, ESTADOS_PROV } from "@/lib/datos";
import { usd, num, porc, dias } from "@/lib/formato";

type Tipo = "Operativa" | "Táctica" | "Estratégica";
type Ir = { p: Pestana; f?: Partial<Filtros>; t: string };
type Decision = { que: string; por?: string; cuando: string; ir?: Ir };
type Diap = { tipo: Tipo; eyebrow: string; titulo: string; decisiones: Decision[] };

const COLOR_TIPO: Record<Tipo, string> = { Operativa: "var(--s1)", Táctica: "var(--accent)", Estratégica: "var(--s3)" };
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

  const sinCompra = CLIENTES.length - c.conCompra.length;
  const critDias = c.prio.get("Crítica")!.dias / c.prio.get("Crítica")!.pedidos;

  const diaps: Diap[] = [
    {
      tipo: "Operativa", eyebrow: "1 · Operación del día a día", titulo: "Los pedidos urgentes salen igual de lento que los demás",
      decisiones: [
        { que: "Despachar primero los Críticos: máximo 7 días para Crítica y 15 para Alta.", por: `Hoy un pedido Crítico tarda ${dias(critDias)}, casi lo mismo que uno de prioridad Baja.`, cuando: "Desde la próxima semana", ir: { p: "operativo", f: { prioridad: "Crítica" }, t: "Ver la cola de críticos" } },
        { que: "Revisar cada mañana la cola de despacho y enviar primero los atrasados.", por: `El ${porc(c.lentos / c.t.pedidos, 0)} de los pedidos tardó más de 35 días en salir.`, cuando: "Todos los días" },
        { que: "Fijar una meta de venta mensual y compararla contra el mismo mes del año anterior.", cuando: "Desde este mes" },
      ],
    },
    {
      tipo: "Táctica", eyebrow: "2 · Clientes y proveedores", titulo: "Muchos clientes no vuelven y muchos proveedores están parados",
      decisiones: [
        { que: `Ofrecer 5 % de descuento en el segundo pedido a los clientes de una sola compra.`, por: `El ${porc(c.una / c.conCompra.length, 0)} de los clientes (${num(c.una)}) compró una sola vez.`, cuando: "Campaña en 2 meses" },
        { que: `Contactar uno por uno a los clientes En riesgo y No se pueden perder.`, por: `Son ${c.nRiesgo} clientes valiosos que dejaron de comprar y que vendieron ${usd(c.riesgo)}.`, cuando: "En 3 meses", ir: { p: "estrategico", f: { segmento: "En riesgo" }, t: "Ver clientes en riesgo" } },
        { que: `Conciliar los 100 proveedores dormidos con más saldo y saldar o cerrar la cuenta.`, por: `El ${porc(dormido.n / PROVEEDORES.length, 0)} de los proveedores lleva más de 3 años sin compras; los 100 con más saldo deben ${usd(c.top100)}.`, cuando: "En 3 meses", ir: { p: "tactico", t: "Ver la lista de saldos" } },
      ],
    },
    {
      tipo: "Estratégica", eyebrow: "3 · Productos y mercados", titulo: "Vendemos mucho de lo que menos gana, en mercados dispersos",
      decisiones: [
        { que: "Dar más espacio comercial a Ropa, Cereales y Verduras.", por: `Son los únicos que ganan más del 40 % y apenas el ${porc(tresProd, 0)} de la venta.`, cuando: "Plan a 2 años", ir: { p: "estrategico", t: "Ver ganancia por producto" } },
        { que: "Evaluar dejar de vender Frutas.", por: `Es el ${porc(p("Frutas").venta / c.t.venta, 1)} de la venta y gana poco.`, cuando: "Decisión en 6 meses" },
        { que: "Concentrar logística y promoción en África y Europa.", por: `Juntas son el ${porc(afEu, 0)} de la venta; ninguno de los ${c.paises} países llega al 2 %.`, cuando: "Plan a 3 años", ir: { p: "estrategico", t: "Ver el mapa" } },
        { que: "Abrir un plan comercial en Norteamérica.", por: "Allí vive la mayoría de los clientes registrados, pero es solo el 2 % de la venta.", cuando: "Plan a 3 años" },
        { que: "Unificar el código de cliente entre ventas y el registro de clientes.", por: `Hoy se unen de forma aproximada: el ${porc(sinCompra / CLIENTES.length, 0)} de los clientes (${num(sinCompra)}) queda sin compras enlazadas.`, cuando: "Plan a 1 año", ir: { p: "datos", t: "Ver cómo se unieron los datos" } },
      ],
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

  const todas = diaps.flatMap((d) => d.decisiones.map((x) => ({ ...x, tipo: d.tipo })));
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
            <p style={{ fontSize: 17 }}>Tres diapositivas, una por nivel de decisión: operativa, táctica y estratégica. En cada una, lo que dicen los datos, qué hacer y cuándo.</p>
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
          <div className="diap resumen">
            <div>
              <div className="eyebrow">{d.eyebrow} · <span style={{ color: COLOR_TIPO[d.tipo] }}>Decisiones {d.tipo.toLowerCase()}s</span></div>
              <h2>{d.titulo}</h2>
            </div>
            <div className="decisiones">
              {d.decisiones.map((x) => <TarjetaDecision key={x.que} d={x} color={COLOR_TIPO[d.tipo]} irA={irA} />)}
            </div>
          </div>
        );
      })()}

      {i === total - 1 && (
        <div className="diap resumen">
          <div>
            <div className="eyebrow">Resumen</div>
            <h2>Plan de acción</h2>
          </div>
          <div className="tabla-env">
            <table className="tabla">
              <thead><tr><th>Tipo</th><th>Qué hacer</th><th>Cuándo</th></tr></thead>
              <tbody>
                {todas.map((x) => (
                  <tr key={x.que}>
                    <td><b style={{ color: COLOR_TIPO[x.tipo] }}>{x.tipo}</b></td>
                    <td style={{ whiteSpace: "normal", minWidth: 260 }}>{x.que}</td>
                    <td style={{ whiteSpace: "normal" }}>{x.cuando}</td>
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

function TarjetaDecision({ d, color, irA }: { d: Decision; color: string; irA: (p: Pestana, f?: Partial<Filtros>) => void }) {
  return (
    <div className="decision" style={{ borderLeft: `4px solid ${color}`, marginTop: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{d.que}</div>
      {d.por && <div className="decision-por">{d.por}</div>}
      <div className="decision-meta">
        <span><b>Cuándo:</b> {d.cuando}</span>
        {d.ir && <button className="btn-link" style={{ margin: 0 }} onClick={() => irA(d.ir!.p, d.ir!.f)}>{d.ir.t} →</button>}
      </div>
    </div>
  );
}
