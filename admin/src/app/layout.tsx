import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Vitasoft Admin",
  description: "Back-office console for operating Vitasoft products.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0 }}>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
