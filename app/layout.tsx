import type { Metadata } from "next";import "./globals.css";
export const metadata:Metadata={title:"Atlas Signal Lab",description:"Read-only forward paper validation dashboard for frozen intraday strategies."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
