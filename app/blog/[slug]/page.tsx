import {connection} from 'next/server';
import Magazine from '@/components/magazine/Magazine';
import {initialPublicState} from '@/lib/published';
export default async function Page({params}:{params:Promise<{slug:string}>}){await connection();const [{slug},initialState]=await Promise.all([params,initialPublicState()]);return <Magazine mode="article" slug={slug} initialState={initialState}/>;}
