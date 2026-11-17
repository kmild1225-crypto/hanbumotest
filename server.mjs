// Optional Node.js 20+ server. Serve the static dashboard and (when configured) proxy AI requests.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3000);
const system=`당신은 대한민국 한부모가족 지원제도 안내 AI 상담원입니다. 한국어로 답하세요. 2026년 일반 한부모·조손가족 복지급여 소득인정액 기준은 기준 중위소득 65% 이하, 청소년 한부모 증명서 발급 기준은 72%(급여 65%)입니다. 3년 근로소득 평균에 따른 경계가구 구제와 모든 한부모가족 비현금서비스 보편 제공은 정책개선 제안이지 현행 시행 제도가 아닙니다. 공적 신청은 복지로/정부24에서 진행되며 이 앱은 시연판입니다. 실제 수급 자격 확정, 금액 지급, 기관 연계를 했다고 주장하지 마세요. 법령/금액의 세부사항은 성평등가족부와 복지로 공식 자료 확인을 권하세요. 민감한 개인정보 수집을 요청하지 마세요. 위험한 상황은 관련 전문기관의 즉시 도움을 권하세요.`;
function respond(res,status,obj){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'same-origin'});res.end(JSON.stringify(obj))}
const server=createServer(async(req,res)=>{if(req.method==='POST'&&req.url==='/api/chat'){
 if(!process.env.OPENAI_API_KEY){respond(res,503,{error:'AI API not configured; browser will use its built-in demo advisory.'});return}
 let raw='';try{for await(const ch of req){raw+=ch;if(raw.length>4000){respond(res,413,{error:'Request too large'});return}}const {message}=JSON.parse(raw);if(typeof message!=='string'||!message.trim()||message.length>500){respond(res,400,{error:'Invalid message'});return}
 const upstream=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions:system,input:message,max_output_tokens:550})});if(!upstream.ok){respond(res,502,{error:'AI provider unavailable'});return}const data=await upstream.json();const answer=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');respond(res,200,{answer:answer||'답변을 생성하지 못했습니다. 공식 기관을 확인해 주세요.'})}catch{respond(res,500,{error:'AI request failed'})}return}
 if(req.method!=='GET'||(req.url!=='/'&&req.url!=='/index.html')){res.writeHead(404);res.end('Not found');return}try{const html=await readFile(join(root,'index.html'));res.writeHead(200,{'content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"});res.end(html)}catch{res.writeHead(500);res.end('Server error')}});
server.listen(port,()=>console.log(`Hanbumo ON demo: http://localhost:${port}`));
