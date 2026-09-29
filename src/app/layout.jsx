import '@phosphor-icons/web/duotone';

export const metadata = {
  metadataBase: new URL(process.env.URL || 'http://localhost:3000'),
  title: 'Vaitik Dental Care - Dentist in Koraput and Semiliguda',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23042C53'/%3E%3Ctext x='16' y='22' font-family='Arial' font-weight='700' font-size='17' fill='%23fff' text-anchor='middle'%3EV%3C/text%3E%3C/svg%3E",
  },
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+Oriya:wght@400;500&family=Plus+Jakarta+Sans:wght@700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
