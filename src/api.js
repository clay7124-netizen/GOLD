import {cleanSymbol,indicatorData,isTaiwanStock} from "./core.js";
const CACHE=new Map();
async function jsonFetch(url,options={},timeout=7000){
  const c=new AbortController();const id=setTimeout(()=>c.abort(),timeout);
  try{const r=await fetch(url,{...options,signal:c.signal});if(!r.ok)throw Error("HTTP "+r.status);return await r.json();}
  finally{clearTimeout(id);}
}
async function yahooJSON(url) {
  const target=encodeURIComponent(url);
  const urls=["https://api.codetabs.com/v1/proxy?quest="+target,"https://api.allorigins.win/raw?url="+target,"https://corsproxy.io/?"+target];
  const tasks=urls.map(url=>jsonFetch(url,{},6000).then(j=>typeof j.contents==="string"?JSON.parse(j.contents):j));
  const j=await Promise.any(tasks);if(!j?.chart?.result?.[0])throw Error("Yahoo no data");return j.chart.result[0];
}
function calcQuote(p,prev,high,low,open,source,date){
  const price=Number(p),prevClose=Number(prev);
  if(!(price>0&&prevClose>0))throw Error("無有效價格");
  const change=price-prevClose;
  return {price,prevClose,change,changePercent:change/prevClose*100,high:Number(high)||price,low:Number(low)||price,open:Number(open)||price,source,quoteDate:date||"",errorMsg:""};
}
function yDate(ts,market,intraday){
  const options={timeZone:market==="TW"?"Asia/Taipei":"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",hour:intraday?"2-digit":undefined,minute:intraday?"2-digit":undefined,hour12:false};
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",options).formatToParts(new Date(ts*1000)).map(x=>[x.type,x.value]));
  return parts.year+"-"+parts.month+"-"+parts.day+(intraday?" "+parts.hour+":"+parts.minute:"");
}
async function yahooQuote(code,market){
  const symbols=market==="TW"?[code+".TW",code+".TWO"]:[code];
  const results=await Promise.any(symbols.map(async symbol=>{
    const res=await yahooJSON("https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(symbol)+"?range=5d&interval=1d");
    const m=res.meta;return calcQuote(m.regularMarketPrice,m.previousClose||m.chartPreviousClose,m.regularMarketDayHigh,m.regularMarketDayLow,m.regularMarketOpen,"Yahoo",m.regularMarketTime?yDate(m.regularMarketTime,market,true):"");
  }));return results;
}
async function finmindRows(code,market,startDate){
  const dataset=market==="TW"?"TaiwanStockPrice":"USStockPrice";
  const url="https://api.finmindtrade.com/api/v4/data?dataset="+dataset+"&data_id="+encodeURIComponent(code)+"&start_date="+startDate;
  const data=await jsonFetch(url,{},9000);
  if(!Array.isArray(data.data)||!data.data.length)throw Error("FinMind 無資料");
  return data.data.map(x=>({date:String(x.date),open:Number(x.open??x.Open??x.close??x.Close),
    high:Number(x.max??x.High??x.high??x.close??x.Close),low:Number(x.min??x.Low??x.low??x.close??x.Close),
    close:Number(x.close??x.Close),volume:Number(x.Trading_Volume??x.Volume??x.volume??0)}))
    .filter(x=>x.close>0&&x.high>0&&x.low>0).sort((a,b)=>a.date.localeCompare(b.date));
}
export async function fetchQuote(stock,market,keys){
  const code=cleanSymbol(stock.id);
  try{
    if(market==="US"&&keys?.finnhub){
      const x=await jsonFetch("https://finnhub.io/api/v1/quote?symbol="+encodeURIComponent(code)+"&token="+encodeURIComponent(keys.finnhub),{},5500);
      if(x.c>0&&x.pc>0)return calcQuote(x.c,x.pc,x.h,x.l,x.o,"Finnhub",x.t?yDate(x.t,market,true):"");
    }
    if(market==="TW"&&keys?.fugle){
      const x=await jsonFetch("https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/"+encodeURIComponent(code),{headers:{"X-API-KEY":keys.fugle}},5500);
      const p=x.lastTrade?.price??x.closingPrice??x.previousClose;
      if(p>0&&x.previousClose>0)return calcQuote(p,x.previousClose,x.highPrice,x.lowPrice,x.openPrice,"Fugle",x.lastTrade?.time||"");
    }
  }catch(err){/* fallback to public market sources */}
  try{return await yahooQuote(code,market);}catch(err){/* fallback to EOD */}
  try{
    const start=new Date();start.setDate(start.getDate()-17);
    const rows=await finmindRows(code,market,start.toISOString().slice(0,10));
    const last=rows.at(-1),previous=rows.at(-2);
    if(!previous)throw Error("前收資料不足");
    return calcQuote(last.close,previous.close,last.high,last.low,last.open,"FinMind 收盤資料",last.date);
  }catch(err){throw new Error("報價讀取失敗；"+(err?.message||"資料源不可用"));}
}
async function yahooCandles(code,market,range){
  const plan={
    "1D":["5d","5m",true,90],"1W":["1mo","60m",true,50],
    "1M":["3mo","1d",false,22],"3M":["6mo","1d",false,66],
    "6M":["1y","1d",false,132],"1Y":["2y","1d",false,265],
    "5Y":["5y","1wk",false,300],"ALL":["10y","1mo",false,240]
  }[range]||["6mo","1d",false,66];
  const symbols=market==="TW"?[code+".TW",code+".TWO"]:[code];
  const result=await Promise.any(symbols.map(async symbol=>{
    const url="https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(symbol)+"?range="+plan[0]+"&interval="+plan[1];
    const data=await yahooJSON(url),q=data.indicators?.quote?.[0];
    if(!q||!data.timestamp)throw Error("無K線");
    const raw=data.timestamp.map((t,i)=>({date:yDate(t,market,plan[2]),open:Number(q.open[i]??q.close[i]),
      high:Number(q.high[i]??q.close[i]),low:Number(q.low[i]??q.close[i]),close:Number(q.close[i]),
      volume:Number(q.volume[i]??0)})).filter(x=>x.close>0&&x.high>0&&x.low>0);
    if(!raw.length)throw Error("無有效K線");
    return indicatorData(raw).slice(-plan[3]);
  }));return {data:result,source:"Yahoo "+plan[1],asOf:result.at(-1)?.date};
}
export async function fetchChart(code,market,range,refresh=false){
  code=cleanSymbol(code);const key=market+":"+code+":"+range;
  const old=CACHE.get(key);if(!refresh&&old&&Date.now()-old.cachedAt<300000)return old;
  let result;
  if(range==="1D"||range==="1W"){result=await yahooCandles(code,market,range);}
  else{
    try{
      const dt=new Date(),years=range==="ALL"?10:range==="5Y"?6:range==="1Y"?2:1;
      dt.setFullYear(dt.getFullYear()-years);
      const rows=await finmindRows(code,market,dt.toISOString().slice(0,10));
      const period={"1M":22,"3M":66,"6M":132,"1Y":265,"5Y":1280,"ALL":2800}[range]||66;
      const full=indicatorData(rows);
      const subset=full.slice(-period);
      if(!subset.length)throw Error("無歷史K線");
      result={data:subset,source:"FinMind 日K",asOf:subset.at(-1)?.date};
    }catch(err){result=await yahooCandles(code,market,range);}
  }
  CACHE.set(key,{...result,cachedAt:Date.now()});
  return result;
}
export async function fetchUsdTwd(){
  const x=await jsonFetch("https://open.er-api.com/v6/latest/USD",{},5500);
  if(x.result!=="success"||!(x.rates?.TWD>0))throw Error("匯率資料不可用");
  return {rate:x.rates.TWD,date:x.time_last_update_utc||""};
}
export async function geminiAnalysis(stock,candle,keys){
  if(!keys?.gemini)throw Error("請先在設定輸入自己的 Gemini API Key");
  if(!candle)throw Error("尚未取得技術指標，無法分析");
  const model=keys.model||"gemini-2.5-flash";
  const num=v=>Number.isFinite(v)?v.toFixed(2):"無資料";
  const prompt="你是審慎的台美股研究助理。請使用繁體中文，僅根據提供的價格與技術指標寫250字分析，不能捏造即時新聞、財報或基本面；明確標示數據日期、資料限制，不可把技術指標解讀成確定獲利。股票："+stock.name+" ("+stock.id+")；報價來源："+stock.source+" 日期："+stock.quoteDate+"，價："+stock.price+"，變動："+stock.changePercent.toFixed(2)+"%。K線日期："+candle.date+"，MA5/20/60="+[candle.ma5,candle.ma20,candle.ma60].map(num).join("/")+"，KD="+num(candle.k)+"/"+num(candle.d)+"，MACD OSC="+num(candle.osc)+"，RSI14="+num(candle.rsi)+"。請依序說明趨勢判讀、支撐壓力參考與風控注意事項。";
  const result=await jsonFetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(keys.gemini),{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})
  },20000);
  const text=result.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("\n").trim();
  if(!text)throw Error(result.error?.message||"AI 無回傳內容");
  return text;
}
