import Magazine from '@/components/magazine/Magazine';
export default async function Page({params}:{params:Promise<{slug:string}>}){return <Magazine mode="article" slug={(await params).slug}/>;}
