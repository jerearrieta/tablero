import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tablero analítico · Air Transport",
  description: "Tablero interactivo de ventas, proveedores y clientes de Air Transport (Panamá) para decisiones operativas, tácticas y estratégicas.",
  icons: { icon: "/logo.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Aplica el tema guardado antes de pintar para evitar parpadeo
const temaScript = `try{var t=localStorage.getItem('tema');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: temaScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
