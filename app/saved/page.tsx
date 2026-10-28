import Magazine from '@/components/magazine/Magazine';
import {currentAdmin} from '@/lib/auth';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){if(!await currentAdmin())redirect('/admin/login');return <Magazine mode="saved"/>;}
