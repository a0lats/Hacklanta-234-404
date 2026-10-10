// Public Sans: an open-source typeface made for US government sites. Plain,
// trustworthy, very readable on small screens. Self-hosted from npm, so the
// build never depends on reaching Google Fonts.
import "@fontsource-variable/public-sans";
import "./globals.css";

export const metadata = {
  title: "7 Days",
  description: "Got eviction papers? Find your real deadline, understand the paper, and start your answer. Nothing is saved.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#15233f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="antialiased">
      <body className="font-sans">{children}</body>
    </html>
  );
}
