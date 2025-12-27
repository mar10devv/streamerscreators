import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StreamersCreators - Hazte viral reaccionando a los videos del momento",
  description: "Descubre los clips más virales del momento en Kick, Twitch y YouTube. Recibe notificaciones automáticas en Discord para reaccionar antes que nadie y hacer crecer tu canal.",
  keywords: [
    "clips virales streamers",
    "videos virales para reaccionar",
    "contenido viral twitch",
    "contenido viral kick",
    "clips trending youtube",
    "bot discord streamers",
    "notificaciones clips virales",
    "herramientas para streamers",
    "hacer crecer canal twitch",
    "videos para reaccionar",
    "contenido viral del momento",
    "streamers creators"
  ],
  authors: [{ name: "StreamersCreators" }],
  creator: "StreamersCreators",
  publisher: "StreamersCreators",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://streamerscreators.netlify.app",
    title: "StreamersCreators - Hazte viral reaccionando a los videos del momento",
    description: "Descubre clips virales de Kick, Twitch y YouTube. Recibe notificaciones en Discord para reaccionar antes que nadie.",
    siteName: "StreamersCreators",
    images: [
      {
        url: "https://streamerscreators.netlify.app/og-image.webp",
        width: 1200,
        height: 630,
        alt: "StreamersCreators - Clips virales para streamers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StreamersCreators - Hazte viral reaccionando",
    description: "Descubre los clips más virales del momento. Notificaciones automáticas en Discord.",
    images: ["https://streamerscreators.netlify.app/og-image.webp"],
  },
  alternates: {
    canonical: "https://streamerscreators.netlify.app",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "StreamersCreators",
              "applicationCategory": "BrowserApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "description": "Descubre clips virales del momento en Kick, Twitch y YouTube. Recibe notificaciones en Discord para reaccionar antes que nadie.",
              "url": "https://streamerscreators.netlify.app",
              "keywords": "clips virales, videos para reaccionar, notificaciones discord streamers, contenido viral twitch kick youtube",
              "audience": {
                "@type": "Audience",
                "audienceType": "Streamers y Creadores de Contenido"
              },
              "featureList": [
                "Notificaciones de clips virales en Discord",
                "Contenido de Kick, Twitch y YouTube",
                "Actualizaciones en tiempo real",
                "Gratis para streamers"
              ]
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}