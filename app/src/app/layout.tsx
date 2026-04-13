import type { Metadata } from 'next';
import { Geist, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header.tsx';
import { RosProvider } from '@/components/ros/ros-provider.tsx';

const geistSans = Geist({
    variable: '--font-sans',
    subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
    variable: '--font-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'SLAM Car Dashboard',
    description: 'Web dashboard for SLAM Tracking Car robot control',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang='en'
            className={`${geistSans.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
        >
            <body className='min-h-full flex flex-col'>
                <RosProvider>
                    <Header />
                    <main className='flex-1 flex flex-col'>{children}</main>
                </RosProvider>
            </body>
        </html>
    );
}
