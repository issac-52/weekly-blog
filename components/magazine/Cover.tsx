'use client';
import type { Article } from '@/lib/types';
export default function Cover({kind,large=false}:{kind:Article['cover'];large?:boolean}) {
 return <div className={`cover cover-${kind} ${large?'cover-large':''}`} aria-hidden="true">
  <div className="cover-grain"/>
  {kind==='market'?<><div className="market-grid"/><div className="market-orb"/><div className="market-bars">{[26,40,34,61,53,75,68,92].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div><div className="cover-word">PERSPECTIVE</div><div className="market-line"><svg viewBox="0 0 600 300"><path d="M0 270 70 236 120 254 190 178 250 196 310 136 380 148 450 80 510 102 600 10" fill="none" stroke="#b6cbff" strokeWidth="3"/></svg></div></>:
  kind==='globe'?<><div className="globe-ball"><div className="globe-lat a"/><div className="globe-lat b"/><div className="globe-long a"/><div className="globe-long b"/><div className="globe-long c"/></div><div className="globe-orbit"/><span className="cover-index">A WORLD<br/>IN MOTION.</span></>:
  kind==='chip'?<><div className="chip-circles"/><div className="chip-core"><span>AI</span></div><span className="cover-index">HUMAN IDEAS.<br/>NEW POSSIBILITIES.</span></>:
  kind==='leaf'?<><div className="leaf-one"/><div className="leaf-two"/><div className="leaf-three"/><span className="cover-index">LESS NOISE.<br/>MORE MEANING.</span></>:
  <><div className="abstract-one"/><div className="abstract-two"/><div className="abstract-three"/><span className="cover-index">THINK<br/>FORWARD.</span></>}
  <span className="cover-brand">b.</span><span className="cover-corner">THE WEEKLY EDIT</span>
 </div>;
}
