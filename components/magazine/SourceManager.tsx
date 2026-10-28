'use client';
import {useEffect,useState,type FormEvent} from 'react';
import type {SourceDomain} from '@/lib/types';
type Change={id:number;domain:string;actor:string;created_at:string;after_value:SourceDomain};
const kinds={official:'공식 기관·기업',news:'신문·전문 매체',research:'논문·연구',other:'기타'};
const empty={domain:'',label:'',kind:'news',enabled:true,include_subdomains:false,usage_note:'',version:0} as SourceDomain;
export default function SourceManager(){
 const [domains,setDomains]=useState<SourceDomain[]>([]);const [events,setEvents]=useState<Change[]>([]);
 const [form,setForm]=useState<SourceDomain>(empty);const [query,setQuery]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
 async function load(){setBusy(true);try{const r=await fetch('/api/admin/sources',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setDomains(d.domains);setEvents(d.events);setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');try{
  const r=await fetch('/api/admin/sources',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw new Error(d.error);
  setForm(empty);setMessage(`${d.domain.domain} 설정을 저장했습니다. 다음 초안 제출·검사·승인에 반영됩니다.`);await load();
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const filtered=domains.filter(d=>`${d.domain} ${d.label}`.toLowerCase().includes(query.toLowerCase()));
 return <main className="container source-manager"><a className="back-link" href="/admin">← 에디터 스튜디오</a><div className="eyebrow">SOURCES & EDITORIAL POLICY</div><h1>읽을 출처를 관리하세요.</h1><p className="source-lead">기관 자료부터 신문·전문 매체까지, 사용할 출처 도메인을 직접 추가하고 관리합니다.</p>
 <div className="source-policy-notice"><strong>출처 등록은 콘텐츠 이용 허락을 뜻하지 않습니다.</strong><p>기사의 사실을 대조해 직접 요약·해설하고 원문 링크를 남겨주세요. 기사 전문·특유의 문장 구성·사진·표를 복제하지 않습니다. 인용·이미지의 권리와 매체별 이용 조건은 발행 전에 확인해야 합니다.</p><p>유료벽·접근 차단을 우회하지 않습니다. 자동 검사는 접근 여부만 확인하며 사실성·전문 열람·저작권 적법성을 보증하지 않습니다.</p></div>
 {error&&<p role="alert" className="job-error">{error}</p>}{message&&<p role="status" className="source-success">{message}</p>}
 <div className="source-manager-layout"><section><div className="section-heading"><h2>등록된 도메인 <span>{domains.length}</span></h2><button className="button" disabled={busy} onClick={load}>새로고침</button></div><label className="field">출처 검색<input placeholder="도메인 또는 매체명" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 {busy&&!domains.length?<p role="status">출처 목록을 불러오는 중입니다.</p>:<div className="source-domain-list">{filtered.map(d=><article key={d.domain}><div><strong>{d.label}</strong><code>{d.domain}</code><span>{kinds[d.kind]} · {d.include_subdomains?'하위 도메인 포함':'정확한 도메인만'} · v{d.version}</span>{d.usage_note&&<p>{d.usage_note}</p>}</div><div><span className={d.enabled?'source-ok':'source-error'}>{d.enabled?'활성':'비활성'}</span><button className="button" disabled={busy} onClick={()=>{setForm({...d});setMessage('');}}>수정</button></div></article>)}{!filtered.length&&<p>표시할 출처가 없습니다.</p>}</div>}
 </section><section className="source-domain-form"><h2>{form.version?'출처 수정':'새 출처 추가'}</h2><form onSubmit={save}>
 <label className="field">도메인<input required maxLength={253} readOnly={form.version>0} placeholder="news.example.com" value={form.domain} onChange={e=>setForm({...form,domain:e.target.value})}/><small>https://와 기사 경로는 빼고 입력하세요. 기존 도메인은 이름을 바꾸지 않고 비활성화합니다.</small></label>
 <label className="field">매체·기관명<input required maxLength={100} value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/></label>
 <label className="field">출처 유형<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value as SourceDomain['kind']})}>{Object.entries(kinds).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label className="check-field"><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/>이 출처 사용 허용</label>
 <label className="check-field"><input type="checkbox" checked={form.include_subdomains} onChange={e=>setForm({...form,include_subdomains:e.target.checked})}/>하위 도메인도 포함</label><p className="muted small">예: example.com을 등록해도 기본은 www.example.com을 허용하지 않습니다. 개별 하위 도메인의 비활성 설정이 우선합니다.</p>
 <label className="field">이용 조건·편집 메모<textarea maxLength={2000} placeholder="라이선스 확인 링크, 유료 기사 여부, 인용 시 확인할 조건 등을 기록하세요." value={form.usage_note} onChange={e=>setForm({...form,usage_note:e.target.value})}/></label><p className="muted small">이 메모는 초안 작성 도구에도 전달됩니다. 비밀번호·계약 비밀정보는 넣지 마세요.</p>
 <button className="button primary" disabled={busy} type="submit">{busy?'처리 중…':'출처 설정 저장'}</button>{form.version>0&&<button className="button" type="button" disabled={busy} onClick={()=>setForm(empty)}>새 출처 입력</button>}
 </form></section></div>
 <section className="source-history"><h2>최근 변경 이력</h2><p>출처 설정은 자동 수집·제출·승인 시 확인합니다. 비활성화는 이미 공개된 글을 자동으로 내리지 않습니다.</p><ul>{events.map(e=><li key={e.id}><strong>{e.domain}</strong> · {e.after_value.enabled?'활성':'비활성'} · {e.actor} · {new Date(e.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</li>)}</ul></section>
 </main>;
}
