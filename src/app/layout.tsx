import type { Metadata } from "next";
import ClientProviders from "@/app/lib/client-providers";
import AppHeader from "@/app/components/app-header";
import AppFooter from "@/app/components/app-footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    template: "%s | Product Intake",
    default: "Product Intake",
  },
  description: "HONK Product Intake internal tool",
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <ClientProviders>
          <AppHeader />
          <main style={{ flex: 1 }}>{children}</main>
          <AppFooter />
        </ClientProviders>
      </body>
    </html>
  );
}
