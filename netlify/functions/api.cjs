const {createHmac,scryptSync,randomBytes}=require('node:crypto');
const actions=new Set(['public','requestOtp','activate','login','logout','state','saveUser','saveStudent','saveSubject','saveAssignment','saveScores','syncScores','settings','publish','reports','queueEmail','sendEmailBatch','saveExam','candidateLogin','startExam','submitExam','importStudents']);
exports.handler=async event=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 const required=['APPS_SCRIPT_URL','GATEWAY_SECRET','PASSWORD_PEPPER'];
 const missing=required.filter(name=>!process.env[name]||!process.env[name].trim());
 if(event.httpMethod==='GET')return{statusCode:missing.length?503:200,headers,body:JSON.stringify({service:'CACG portal configuration',configured:missing.length===0,missing})};
 if(event.httpMethod!=='POST')return{statusCode:405,headers,body:JSON.stringify({error:'POST required'})};
 try{
  if(missing.length) return{statusCode:503,headers,body:JSON.stringify({error:'Missing Netlify Functions variables: '+missing.join(', ')+'. Set their Production values, then redeploy.',missing})};
  if((event.body||'').length>500000)throw Error('Request too large');
  if(event.headers.origin&&new URL(event.headers.origin).host!==event.headers.host)throw Error('Request origin rejected');
  let data=JSON.parse(event.body||'{}');if(!actions.has(data.action))throw Error('Unknown action');
  if(['login','activate'].includes(data.action)){
   if(typeof data.password!=='string'||data.password.length<12||data.password.length>128)throw Error('Use a password of 12–128 characters');
   const email=String(data.email||'').trim().toLowerCase();
   data.passwordHash=scryptSync(data.password,email+'|'+process.env.PASSWORD_PEPPER,64,{N:16384,r:8,p:1}).toString('hex');delete data.password;
  }
  // Never accept an externally supplied hash in another action.
  else delete data.passwordHash;
  data.token=event.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('cacg_session='))?.slice(13)||'';
  const body=JSON.stringify(data),timestamp=Date.now(),nonce=randomBytes(16).toString('hex');
  const signature=createHmac('sha256',process.env.GATEWAY_SECRET).update(timestamp+'.'+nonce+'.'+body).digest('hex');
  const response=await fetch(process.env.APPS_SCRIPT_URL,{method:'POST',body:JSON.stringify({body,timestamp,nonce,signature}),redirect:'follow',signal:AbortSignal.timeout(55000)});
  if(!response.ok)throw Error('Assessment service unavailable');
  const result=await response.json();
  if(result.token){headers['Set-Cookie']='cacg_session='+result.token+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800';delete result.token;}
  if(data.action==='logout')headers['Set-Cookie']='cacg_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
  return{statusCode:result.error?400:200,headers,body:JSON.stringify(result)};
 }catch(error){return{statusCode:400,headers,body:JSON.stringify({error:error.name==='TimeoutError'?'Service timed out; refresh before retrying a submission.':error.message})};}
};
