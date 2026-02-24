import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coachify – Team Management",
  description: "Team creation, player management, and performance analysis for team sports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

