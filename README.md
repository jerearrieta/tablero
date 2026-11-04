# Tablero analítico · Air Transport

Sitio Next.js (export estático) con los paneles Operativo, Táctico y Estratégico, un modo Presentación con las decisiones y una sección de Datos y supuestos.

## Ejecutar en local
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # genera la carpeta out/ (sitio estático)
```

## Desplegar en Vercel
1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project**, importa el repositorio. Vercel detecta Next.js solo; no hace falta configurar nada (Build: `next build`, salida estática `out/`).
3. Alternativa sin GitHub: `npx vercel` dentro de la carpeta.

## Datos
- `datos/*.json`: datos limpios (salida de `limpiar.py`).
- `npm run datos`: regenera `src/data/*.json` (lo que usa la web) a partir de `datos/`.
- `public/datos/*.csv`: descargas desde la sección Datos y supuestos.

## Estructura
- `src/components/Tablero.tsx`: cabecera, pestañas, filtros globales y KPIs.
- `src/lib/filtros.tsx`: estado de filtros cruzados y drill-down.
- `src/paneles/`: un archivo por panel (Operativo, Tactico, Estrategico, Presentacion, Datos).
- `src/components/Mapa.tsx`: mapa coroplético (d3-geo + world-atlas).
