import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LunchFlow — School Lunch Ordering",
  description: "Order and manage school lunches online. Simple ordering, QR code collection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
