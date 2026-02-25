import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "VATRI Portal",
  description: "VATRI self-service portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="da">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

