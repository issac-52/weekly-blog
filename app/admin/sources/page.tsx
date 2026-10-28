import {redirect} from 'next/navigation';
import {currentAdmin} from '@/lib/auth';
import SourceManager from '@/components/magazine/SourceManager';
export const dynamic='force-dynamic';
export default async function Page(){if(!await currentAdmin())redirect('/admin/login');return <SourceManager/>;}
