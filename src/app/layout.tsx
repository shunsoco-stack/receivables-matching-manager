import type { Metadata } from "next";
import { StoreProvider } from "@/components/store";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "売掛・入金消込マネージャー",
  description:
    "入金明細から請求を突き合わせる、小さな会社の経理向け消込作業台。架空データのデモです。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Shell>
          <StoreProvider>{children}</StoreProvider>
        </Shell>
      </body>
    </html>
  );
}
