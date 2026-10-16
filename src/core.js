export const STOCK_DICT = {
  "2330":["台積電","半導體"],"2317":["鴻海","電子代工"],"2454":["聯發科","IC設計"],
  "2382":["廣達","AI伺服器"],"3231":["緯創","AI伺服器"],"3017":["奇鋐","散熱模組"],
  "2308":["台達電","電源與自動化"],"3481":["群創","光電面板"],"2409":["友達","光電面板"],
  "3264":["欣銓","半導體封測"],"3149":["正達","光電玻璃"],"2603":["長榮","航運"],
  "2881":["富邦金","金融保險"],"2882":["國泰金","金融保險"],
  "0050":["元大台灣50","市值型ETF"],"006208":["富邦台50","市值型ETF"],
  "0056":["元大高股息","高息ETF"],"00878":["國泰永續高股息","高息ETF"],
  "00919":["群益台灣精選高息","高息ETF"],"00929":["復華台灣科技優息","科技ETF"],
  "00631L":["元大台灣50正2","槓桿型ETF"],"00675L":["富邦臺灣加權正2","槓桿型ETF"],
  "00632R":["元大台灣50反1","反向型ETF"],"00981A":["統一台股增長主動ETF","主動型ETF"],
  "00980A":["野村臺灣智慧優選主動ETF","主動型ETF"],
  "00679B":["元大美債20年","債券型ETF"],"00687B":["國泰20年美債","債券型ETF"],
  "00937B":["群益ESG投等債20+","債券型ETF"],
  "AAPL":["蘋果 Apple","消費科技"],"NVDA":["輝達 NVIDIA","AI與半導體"],
  "MSFT":["微軟 Microsoft","雲端與軟體"],"GOOGL":["谷歌 Alphabet","網路與AI"],
  "GOOG":["谷歌C Alphabet","網路與AI"],"AMZN":["亞馬遜 Amazon","電商與雲端"],
  "META":["Meta","社群與AI"],"TSLA":["特斯拉 Tesla","電動車與AI"],
  "TSM":["台積電 ADR","半導體"],"AMD":["超微 AMD","半導體"],
  "AVGO":["博通 Broadcom","網通與AI晶片"],"SPY":["SPDR 標普500","美股ETF"],
  "VOO":["Vanguard 標普500","美股ETF"],"QQQ":["Invesco 那斯達克100","科技ETF"],
  "SPYM":["SPDR 標普500迷你","美股ETF"],"BRK.B":["波克夏B","控股集團"],
  "BAC":["美國銀行","金融銀行"],"AXP":["美國運通","金融支付"],
  "KO":["可口可樂","消費必需品"],"CVX":["雪佛龍","石油能源"],
  "OXY":["西方石油","石油能源"],"PANW":["Palo Alto資安","網路安全"],
  "HLT":["希爾頓飯店","旅宿"],"CMG":["Chipotle","餐飲"],
  "QSR":["Restaurant Brands","餐飲"],"TRMD":["Torm","航運"],
  "SBLK":["Star Bulk","航運"],"VALE":["淡水河谷","原物料"]
};
export const GROUP_DEFAULTS={ TW:["全部","核心存股","AI波段","觀察清單"],US:["全部","科技巨頭","ETF配置","波段觀察"] };
export const QUICK_ADD={TW:["2330","2317","2454","2308","006208","00631L","00878","00679B","00981A"],US:["NVDA","AAPL","MSFT","TSM","AMD","AVGO","QQQ","VOO","SPY"]};
export const GURUS=[
  {id:"buffett",name:"華倫·巴菲特",title:"Berkshire Hathaway",icon:"💵",symbols:["AAPL","AXP","BAC","KO","CVX","OXY"]},
  {id:"pelosi",name:"南西·裴洛西",title:"國會交易觀察",icon:"🏛️",symbols:["NVDA","MSFT","GOOGL","AMZN","PANW","AVGO"]},
  {id:"ackman",name:"比爾·艾克曼",title:"Pershing Square",icon:"🦁",symbols:["GOOGL","HLT","CMG","QSR"]},
  {id:"marks",name:"霍華·馬克斯",title:"Oaktree Capital",icon:"🌳",symbols:["TRMD","SBLK","VALE"]}
];
export function cleanSymbol(input){return String(input||"").toUpperCase().trim().replace(/\.(TW|TWO)$/,"");}
export function isTaiwanStock(input){return /^\d+[A-Z]*$/.test(cleanSymbol(input));}
export function stockName(code){return STOCK_DICT[cleanSymbol(code)]?.[0]||cleanSymbol(code);}
export function enhanceStock(x) {
  const id=cleanSymbol(x.id||x.symbol);const tw=isTaiwanStock(id);
  return {id,name:x.name||stockName(id),sector:x.sector||STOCK_DICT[id]?.[1]||"其他",
    symbol:tw?id+(id.endsWith("B")?".TWO":".TW"):id,group:x.group||(tw?"核心存股":"科技巨頭"),
    pinned:!!x.pinned,shares:Math.max(0,Number(x.shares)||0),avgCost:Math.max(0,Number(x.avgCost)||0),
    price:Number(x.price)||0,prevClose:Number(x.prevClose)||0,change:Number(x.change)||0,
    changePercent:Number(x.changePercent)||0,high:Number(x.high)||0,low:Number(x.low)||0,
    open:Number(x.open)||0,quoteDate:x.quoteDate||"",source:x.source||"未載入",errorMsg:x.errorMsg||""};
}
export function uniqueStocks(list){const seen=new Set();return list.filter(x=>{const id=cleanSymbol(x.id||x.symbol);if(!id||seen.has(id))return false;seen.add(id);return true;}).map(enhanceStock);}
export const INITIAL_TW=uniqueStocks([{id:"2330",pinned:true},{id:"00631L",group:"AI波段"},{id:"2317",group:"AI波段"},{id:"0050"}]);
export const INITIAL_US=uniqueStocks([{id:"NVDA",pinned:true},{id:"AAPL"},{id:"TSM"}]);
export function indicatorData(raw){
  const a=[...raw].sort((x,y)=>x.date.localeCompare(y.date)).map(x=>({...x}));if(!a.length)return a;
  let k=50,d=50,e12=a[0].close,e26=a[0].close,dea=0,gain=0,loss=0;
  a.forEach((p,i)=>{
    const ma=(n)=>i>=n-1?a.slice(i-n+1,i+1).reduce((s,t)=>s+t.close,0)/n:null;
    p.ma5=ma(5);p.ma20=ma(20);p.ma60=ma(60);
    if(p.ma20!=null){const sd=Math.sqrt(a.slice(i-19,i+1).reduce((s,t)=>s+(t.close-p.ma20)**2,0)/20);p.bbUpper=p.ma20+2*sd;p.bbLower=p.ma20-2*sd;}
    const w=a.slice(Math.max(0,i-8),i+1),hi=Math.max(...w.map(x=>x.high)),lo=Math.min(...w.map(x=>x.low));
    const rsv=hi!==lo?(p.close-lo)/(hi-lo)*100:50;k=k*2/3+rsv/3;d=d*2/3+k/3;p.k=k;p.d=d;
    e12=p.close*(2/13)+e12*(11/13);e26=p.close*(2/27)+e26*(25/27);
    p.dif=e12-e26;dea=(p.dif)*(2/10)+dea*(8/10);p.macd=dea;p.osc=p.dif-dea;
    if(i===0){p.rsi=null;return;}
    const dx=p.close-a[i-1].close,up=Math.max(dx,0),down=Math.max(-dx,0);
    if(i<=14){gain+=up;loss+=down;if(i===14){gain/=14;loss/=14;}}
    else{gain=(13*gain+up)/14;loss=(13*loss+down)/14;}
    p.rsi=i>=14?(loss===0?(gain===0?50:100):100-100/(1+gain/loss)):null;
  });
  return a;
}
export function technicalSignals(a){
  if(!a?.length)return[];const p=a[a.length-1],prev=a.at(-2),s=[];
  if(p.ma20!=null)s.push({text:p.close>=p.ma20?"站上20日均線":"跌破20日均線",up:p.close>=p.ma20});
  if(prev&&p.k!=null){
    if(prev.k<=prev.d&&p.k>p.d)s.push({text:"KD黃金交叉",up:true});
    if(prev.k>=prev.d&&p.k<p.d)s.push({text:"KD死亡交叉",up:false});
    if(p.k>80)s.push({text:"KD高檔 >80",up:false});
    if(p.k<20)s.push({text:"KD低檔 <20",up:true});
  }
  if(p.osc!=null)s.push({text:p.osc>=0?"MACD柱正值":"MACD柱負值",up:p.osc>=0});
  if(p.rsi!=null)s.push({text:"RSI14 "+p.rsi.toFixed(1),up:p.rsi>=50});
  return s;
}
export function fmt(v,d=2){return Number.isFinite(v)?v.toLocaleString("zh-TW",{maximumFractionDigits:d,minimumFractionDigits:d}):"-";}
