'use client';
import {useState} from 'react';
import type {Source,ReviewEvent} from '@/lib/types';
export default function SourceReviewCard({source:s,busy,record,onReview}:{source:Source;busy:boolean;record?:ReviewEvent;onReview:(id:string,note:string,confirmed:boolean)=>Promise<void>}){
 const [note,setNote]=useState('');const [error,setError]=useState('');
 const confirmed=Boolean(s.manualReview);const blocked=s.policyAllowed===false;
 return <div className="source-review"><a target="_blank" rel="noopener noreferrer" href={s.url}>{s.publisher} ↗</a><p>{s.title}</p><span className={s.reachable&&!blocked?'source-ok':'source-error'}>{blocked?'도메인 미등록·비활성':s.reachable?'자동 접근 확인':'자동 접근 미확인'} · {s.verifiedAt?.slice(0,10)||'미검사'}</span>{s.error&&<p>{s.error}</p>}
 <p className="muted small">접근 확인은 전문 열람·사실성·이용 허락을 뜻하지 않습니다.</p>
 {confirmed&&<div className="manual-source-confirmation"><strong>편집자 원문 확인 기록</strong><p>{record?.note}</p><small>{record?.actor||'관리자'} · {s.manualReview!.reviewedAt.slice(0,10)}</small></div>}
 {!s.reachable&&!blocked&&<><label className="field">수동 원문 확인 기록<textarea value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} placeholder="합법적으로 원문을 열람한 방법과 대조한 사실을 20자 이상 남겨주세요. 검색 결과나 제목만 보고 확인하지 마세요."/></label>{error&&<p role="alert" className="source-error">{error}</p>}<button type="button" className="button" disabled={busy} onClick={async()=>{if(!confirmed&&note.trim().length<20){setError('직접 확인한 원문과 대조한 내용을 20자 이상 기록해주세요.');return;}setError('');await onReview(s.id,confirmed?'편집자가 기존 수동 원문 확인 기록을 해제했습니다.':note,!confirmed);}}>{confirmed?'수동 확인 해제':'원문 직접 확인 기록 저장'}</button></>}
 {blocked&&<a className="text-link" href="/admin/sources">출처 관리에서 도메인 확인 →</a>}
 </div>;
}
