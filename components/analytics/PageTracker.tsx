'use client';
import {useEffect,useRef} from 'react';
export default function PageTracker({path,enabled}:{path:string;enabled:boolean}){
 const current=useRef<{path:string;id:string}|null>(null);
 useEffect(()=>{if(!enabled)return;if(current.current?.path!==path)current.current={path,id:crypto.randomUUID()};const id=current.current.id;
 // Same ID survives Strict Mode effect replay and retry; server de-duplicates it.
 fetch('/api/analytics/pageview',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',keepalive:true,body:JSON.stringify({eventId:id,path})}).catch(()=>{});
 },[path,enabled]);return null;
}
