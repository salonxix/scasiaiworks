import "./globals.css";
import { Providers } from "../components/Providers";

export const metadata = {
  title: "Scasi AI — Your Intelligent Email Assistant",
  description: "Scasi AI uses advanced AI agents to summarise, prioritise, and reply to your emails automatically.",
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Outfit:wght@400;600;700;800;900&family=Playfair+Display:wght@700;900&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="relative m-0 p-0">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}