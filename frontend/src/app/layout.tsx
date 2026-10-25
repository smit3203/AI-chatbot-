import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChallanAI (EmbroideryOS) - શ્રી કૃષ્ણ એમ્બ્રોઇડરી",
  description:
    "Textile Embroidery Job-Work Operating System: Mobile AI Challan Vision OCR, Gujarati Vernacular Voice Assistant, Real-Time Lot Reconciliation & Machine Shift Tracker.",
  keywords: [
    "Embroidery",
    "Challan",
    "Job-Work",
    "Surat",
    "Ahmedabad",
    "Kasar",
    "Gujarati",
    "Textile OS",
    "Stitch Calculator",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#075e54",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="gu">
      <body className="antialiased select-none md:select-auto min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
