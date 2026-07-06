import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Vitasoft — AI-Powered Software Studio",
  description:
    "Vitasoft builds AI-powered products: Mind (math learning), marketing automation, and more.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: "Georgia, serif" }}>{children}</body>
    </html>
  );
}
