import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NAPED | Educação Médica',
  description: 'Registro e acompanhamento das atividades do NAPED',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
