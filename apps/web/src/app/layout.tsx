import type { Metadata } from "next";
import { Barlow_Condensed, Nunito } from "next/font/google";
import "./globals.css";

// Font roles from @rochas-surf-school/design-tokens: display for titles and numbers, body for everything else.
const display = Barlow_Condensed({
  variable: "--ds-font-display",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
});

const body = Nunito({
  variable: "--ds-font-body",
  weight: ["400", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Rocha's Surf School",
  description: "Aulas de surf e skate da Rocha's Surf School",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
