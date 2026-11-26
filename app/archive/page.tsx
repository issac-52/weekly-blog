import {connection} from 'next/server';
import Magazine from '@/components/magazine/Magazine';
import {initialPublicState} from '@/lib/published';
export default async function Page(){await connection();return <Magazine mode="archive" initialState={await initialPublicState()}/>;}
