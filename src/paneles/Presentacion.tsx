"use client";
import { useEffect, useMemo, useState } from "react";
import { useFiltros, type Pestana, type Filtros } from "@/lib/filtros";
import { agrupar, CLIENTES, PROVEEDORES, pct, sumar, VENTAS, ESTADOS_PROV } from "@/lib/datos";
import { usd, num, porc, dias } from "@/lib/formato";

type Tipo = "Operativa" | "Táctica" | "Estratégica";
type Decision = { que: string; quien: string; cuando: string; meta: string };
type Ir = { p: Pestana; f?: Partial<Filtros>; t: string };
type Hallazgo = { cifra: string; texto: string; ir?: Ir };
type Diap = { tipo: Tipo; eyebrow: string; titulo: string; hallazgos: Hallazgo[]; decisiones: Decision[] };

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
      hallazgos: [
        { cifra: dias(critDias), texto: "tarda en enviarse un pedido Crítico, casi lo mismo que uno de prioridad Baja.", ir: { p: "operativo", f: { prioridad: "Crítica" }, t: "Ver la cola de críticos" } },
        { cifra: porc(c.lentos / c.t.pedidos, 0), texto: `de los pedidos (${num(c.lentos)}) tardaron más de 35 días en salir.` },
        { cifra: porc(1 - c.ytd[2].v / c.ytd[1].v, 0), texto: "menos vendió 2022 que 2021 de enero a octubre. No es una caída: 2022 solo tiene datos hasta el 7 de noviembre.", ir: { p: "tactico", t: "Ver ventas por año y mes" } },
      ],
      decisiones: [
        { que: "Despachar primero los Críticos: máximo 7 días para Crítica y 15 para Alta.", quien: "Jefe de logística", cuando: "Desde la próxima semana", meta: `Críticos de ${dias(critDias)} a 7 días en 3 meses` },
        { que: "Revisar cada mañana la cola de despacho y enviar primero los atrasados.", quien: "Coordinador de despacho", cuando: "Todos los días", meta: `Pedidos de más de 35 días: de ${porc(c.lentos / c.t.pedidos, 0)} a menos del 5 %` },
        { que: "Fijar una meta de venta mensual y compararla contra el mismo mes del año anterior.", quien: "Gerente de ventas", cuando: "Desde este mes", meta: `${usd(c.ytd[1].v / 10)} por mes (nivel de 2021)` },
      ],
    },
    {
      tipo: "Táctica", eyebrow: "2 · Clientes y proveedores", titulo: "Muchos clientes no vuelven y muchos proveedores están parados",
      hallazgos: [
        { cifra: porc(c.una / c.conCompra.length, 0), texto: `de los clientes compró una sola vez (${num(c.una)} de ${num(c.conCompra.length)}).` },
        { cifra: usd(c.riesgo), texto: `vendieron los ${c.nRiesgo} clientes valiosos que dejaron de comprar (${porc(c.riesgo / c.t.venta, 0)} de la venta).`, ir: { p: "estrategico", f: { segmento: "En riesgo" }, t: "Ver clientes en riesgo" } },
        { cifra: porc(dormido.n / PROVEEDORES.length, 0), texto: `de los proveedores lleva más de 3 años sin compras y aún tiene ${usd(dormido.s)} de saldo.`, ir: { p: "tactico", t: "Ver la lista de saldos" } },
      ],
      decisiones: [
        { que: `Ofrecer 5 % de descuento en el segundo pedido a los ${num(c.una)} clientes de una sola compra.`, quien: "Marketing", cuando: "Campaña en 2 meses", meta: "Que 1 de cada 10 vuelva en 6 meses" },
        { que: `Contactar uno por uno a los ${c.nRiesgo} clientes En riesgo y No se pueden perder.`, quien: "Equipo comercial", cuando: "En 3 meses", meta: "Recuperar al menos 20" },
        { que: `Una vez unificado el código, revisar los ${num(sinCompra)} clientes sin compras y reactivar a los que de verdad estén inactivos.`, quien: "Marketing y equipo comercial", cuando: "Después de unificar el código", meta: "Que 1 de cada 10 haga su primer pedido" },
        { que: `Conciliar los 100 proveedores dormidos con más saldo (${usd(c.top100)}) y saldar o cerrar la cuenta.`, quien: "Compras y contabilidad", cuando: "En 3 meses", meta: "Las 100 cuentas conciliadas" },
      ],
    },
    {
      tipo: "Estratégica", eyebrow: "3 · Productos y mercados", titulo: "Vendemos mucho de lo que menos gana, en mercados dispersos",
      hallazgos: [
        { cifra: porc(tresProd, 0), texto: "de la venta son Ropa, Cereales y Verduras, los únicos que ganan más del 40 %.", ir: { p: "estrategico", t: "Ver ganancia por producto" } },
        { cifra: porc(afEu, 0), texto: `de la venta viene de África y Europa. Vendemos en ${c.paises} países y ninguno llega al 2 %.`, ir: { p: "estrategico", t: "Ver el mapa" } },
        { cifra: "2 %", texto: "de la venta es de Norteamérica, donde vive la mayoría de los clientes registrados." },
        { cifra: porc(sinCompra / CLIENTES.length, 0), texto: `de los clientes registrados (${num(sinCompra)} de ${num(CLIENTES.length)}) no tiene compras enlazadas. Es una cifra aproximada: ventas y clientes usan códigos distintos y se unieron por los 3 primeros dígitos, así que C0001 a C0099 nunca pueden recibir pedidos.`, ir: { p: "datos", t: "Ver cómo se unieron los datos" } },
      ],
      decisiones: [
        { que: "Dar más espacio comercial a Ropa, Cereales y Verduras.", quien: "Gerencia comercial", cuando: "Plan a 2 años", meta: `Del ${porc(tresProd, 0)} al 20 % de la venta` },
        { que: `Evaluar dejar de vender Frutas (${porc(p("Frutas").venta / c.t.venta, 1)} de la venta y poca ganancia).`, quien: "Dirección general", cuando: "Decisión en 6 meses", meta: "Mantener o retirar" },
        { que: "Concentrar logística y promoción en África y Europa.", quien: "Dirección general", cuando: "Plan a 3 años", meta: `Del ${porc(afEu, 0)} al 60 % de la venta` },
        { que: "Abrir un plan comercial en Norteamérica.", quien: "Gerencia comercial", cuando: "Plan a 3 años", meta: "Del 2 % al 5 % de la venta" },
        { que: "Unificar el código de cliente entre ventas y el registro de clientes, para que cada pedido quede ligado a su cliente sin aproximaciones.", quien: "Dirección general y sistemas", cuando: "Plan a 1 año", meta: "100 % de los pedidos con cliente identificado" },
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
            <p style={{ fontSize: 17 }}>Tres diapositivas, una por nivel de decisión: operativa, táctica y estratégica. En cada una, lo que dicen los datos y qué hacer: quién, cuándo y con qué meta.</p>
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
          <div className="diap nivel">
            <div>
              <div className="eyebrow">{d.eyebrow} · <span style={{ color: COLOR_TIPO[d.tipo] }}>Decisiones {d.tipo.toLowerCase()}s</span></div>
              <h2>{d.titulo}</h2>
              <div className="hallazgos">
                {d.hallazgos.map((h) => (
                  <div key={h.texto} className="hallazgo">
                    <div className="cifra" style={{ color: COLOR_TIPO[d.tipo] }}>{h.cifra}</div>
                    <div>
                      <p>{h.texto}</p>
                      {h.ir && <button className="btn-link" onClick={() => irA(h.ir!.p, h.ir!.f)}>{h.ir.t} →</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ color: "var(--text-3)" }}>Qué hacer · {PLAZO_TIPO[d.tipo].toLowerCase()}</div>
              {d.decisiones.map((x) => <TarjetaDecision key={x.que} d={x} color={COLOR_TIPO[d.tipo]} />)}
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

function TarjetaDecision({ d, color }: { d: Decision; color: string }) {
  return (
    <div className="decision" style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 14.5, fontWeight: 600 }}>{d.que}</div>
      <div className="decision-meta">
        <span><b>Quién:</b> {d.quien}</span>
        <span><b>Cuándo:</b> {d.cuando}</span>
        <span><b>Meta:</b> {d.meta}</span>
      </div>
    </div>
  );
}
