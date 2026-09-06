import type { Metadata } from "next";
import { Karla, Poppins } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Mutual Aid NYC Community Resources Library",
    template: "%s | Community Resources Library",
  },
  description:
    "Find food, housing, legal help, social services, and other community resources for New Yorkers. Free and low-cost, community-sourced and volunteer-curated.",
    // TODO: add open graph metadata
  // TODO: Site under development should not be in search results. Delete this line when
  // the site is in production at resources.mutualaidnyc.org.
  robots: { index: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${karla.variable} ${poppins.variable} antialiased min-h-screen flex flex-col`}
      >
        <a
          href="#main-content" className="absolute left-1 top-0 z-[100] bg-white transform -translate-y-full py-4 px-6 
          font-bold underline focus:translate-y-1 transition"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
