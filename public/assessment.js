(function(root){
const defaults=[{min:70,grade:'A',remark:'Distinction'},{min:60,grade:'B',remark:'Very Good'},{min:50,grade:'C',remark:'Credit'},{min:40,grade:'P',remark:'Pass'},{min:0,grade:'F',remark:'Fail'}];
function total(s){let v=['ca1','ca2','ca3','exam'].map(k=>s[k]);if(v.some(x=>x===null||x===undefined||x===''))return null;if(v.some((x,i)=>!Number.isFinite(Number(x))||Number(x)<0||Number(x)>[10,10,10,70][i]))throw Error('Score out of range');return Math.round(v.reduce((a,b)=>a+Number(b),0)*100)/100;}
function grade(n,bands=defaults){return n===null?{grade:'—',remark:'Incomplete'}:bands.find(b=>n>=b.min);}
function rank(rows){return rows.map(r=>({...r,position:r.average===null?null:1+rows.filter(x=>x.average!==null&&x.average>r.average).length}));}
const api={total,grade,rank,defaults};if(typeof module!=='undefined')module.exports=api;else root.Assessment=api;
})(globalThis);
