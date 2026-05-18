import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";

const sukhumvit = localFont({
  variable: "--font-sukhumvit",
  display: "swap",
  preload: true,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
  src: [
    {
      path: "./fonts/SukhumvitSet-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "./fonts/SukhumvitSet-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/SukhumvitSet-Text.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/SukhumvitSet-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/SukhumvitSet-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/SukhumvitSet-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "BidCard TH | ตลาดประมูลการ์ด",
  description:
    "เว็บประมูลและซื้อขายการ์ดสะสม พร้อมกระเป๋าเงิน ระบบ Reseller การแจ้งเตือน และหลังบ้านสำหรับผู้ดูแล",
};

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="th" className={`${sukhumvit.variable} ${sukhumvit.className}`}>
    <body className={`${sukhumvit.className} font-sans`}>{children}</body>
  </html>
);

export default RootLayout;
