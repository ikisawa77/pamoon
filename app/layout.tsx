import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sukhumvit = localFont({
  variable: "--font-sukhumvit",
  display: "swap",
  src: [
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
  description: "เว็บประมูลและซื้อขายการ์ดสะสม พร้อมกระเป๋าเงินและระบบร้านค้า",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="th" className={sukhumvit.variable}>
    <body>{children}</body>
  </html>
);

export default RootLayout;

