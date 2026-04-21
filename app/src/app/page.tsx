/**
 * Landing page - redirects to unified dashboard.
 */
import { redirect } from 'next/navigation';

export default function Home() {
    redirect('/dashboard');
}
