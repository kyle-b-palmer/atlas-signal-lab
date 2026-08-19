import type { Metadata } from "next";import "./globals.css";import "./research.css";
export const metadata:Metadata={title:"Atlas Signal Lab",description:"Read-only paper-model board for V1–V2, C1–C6, DMAA, K, and V3/V5 filing tests."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
