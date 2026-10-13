import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klyro ERP — Business Management Platform",
  description:
    "The complete enterprise business operations platform. Inventory, procurement, recipes, production, CRM, multi-branch analytics, and QR ordering.",
  keywords: "business ERP, inventory, procurement, production, multi-branch, operations platform",
  icons: {
    icon: "/brand/klyro-favicon.svg",
    apple: "/brand/klyro-app-icon.svg",
  },
  openGraph: {
    title: "Klyro ERP",
    description: "The complete enterprise operations platform for multi-branch businesses.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
