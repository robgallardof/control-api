import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "control-app",
  description: "Private userscript license and activity control API."
};

/**
 * Application root layout.
 * @param props Component props.
 * @param props.children Child content.
 * @returns The root HTML layout.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
