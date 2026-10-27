export function previousKoreanWeek(now=new Date()){
 const k=new Date(now.getTime()+9*3600000);k.setUTCHours(0,0,0,0);const day=k.getUTCDay()||7;
 const start=new Date(k);start.setUTCDate(start.getUTCDate()-(day-1)-7);const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);
 const thursday=new Date(start);thursday.setUTCDate(thursday.getUTCDate()+3);const year=thursday.getUTCFullYear();const jan4=new Date(Date.UTC(year,0,4));const week1=new Date(jan4);week1.setUTCDate(jan4.getUTCDate()-((jan4.getUTCDay()||7)-1));const week=1+Math.round((start-week1)/604800000);
 return {id:`${year}-W${String(week).padStart(2,'0')}`,start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10),label:`${start.getUTCMonth()+1}월 ${start.getUTCDate()}일–${end.getUTCMonth()+1}월 ${end.getUTCDate()}일`};
}
