import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ภาพรวมงบประมาณภาครัฐ",
  description: "แดชบอร์ดวิเคราะห์การจัดสรรและเบิกจ่ายงบประมาณของหน่วยงานภาครัฐ",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}