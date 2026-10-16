import React,{useState,useEffect,useMemo,useRef} from "react";
import {LineChart,Line,AreaChart,Area,ComposedChart,Bar,Cell,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,ReferenceLine} from "recharts";
import {TrendingUp,TrendingDown,Search,Plus,ArrowLeft,RefreshCw,Trash2,Sun,Moon,ChevronRight,X,AlertTriangle,Sparkles,Bot,Loader2,Crown,FolderPlus,Download,Upload,Pin,Sliders,Briefcase,BarChart3,Activity,Check,ArrowUpDown} from "lucide-react";
import {STOCK_DICT,GROUP_DEFAULTS,QUICK_ADD,GURUS,INITIAL_TW,INITIAL_US,cleanSymbol,isTaiwanStock,stockName,uniqueStocks,enhanceStock,indicatorData,technicalSignals,fmt} from "./core.js";
import {fetchQuote,fetchChart,fetchUsdTwd,geminiAnalysis} from "./api.js";
const choose=(k,f)=>{try{const d=JSON.parse(localStorage.getItem(k));return d??f;}catch{return f;}};
const upColor=v=>v>0?"text-rose-400":v<0?"text-emerald-400":"text-slate-400";
const container="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-4 sm:p-5";
const button="pill border border-slate-700 text-slate-300 hover:border-indigo-500";
const active="pill bg-indigo-600 text-white shadow-md";
function App(){
  const [dark,setDark]=useState(()=>localStorage.getItem("sm_theme_v4")!=="light");
  const [market,setMarket]=useState("TW"),[tab,setTab]=useState("market"),[selected,setSelected]=useState("2330"),[mobileDetail,setMobileDetail]=useState(false);
  const [tw,setTw]=useState(()=>uniqueStocks(choose("watchlist_TW",INITIAL_TW).concat(choose("watchlist_US",[]).filter(s=>isTaiwanStock(s.id||s.symbol)))));
  const [us,setUs]=useState(()=>uniqueStocks(choose("watchlist_US",INITIAL_US).filter(s=>!isTaiwanStock(s.id||s.symbol))));
  const [groupsTW,setGroupsTW]=useState(()=>choose("sm_groups_TW",GROUP_DEFAULTS.TW));
  const [groupsUS,setGroupsUS]=useState(()=>choose("sm_groups_US",GROUP_DEFAULTS.US));
  const [groupTW,setGroupTW]=useState("全部"),[groupUS,setGroupUS]=useState("全部");
  const [sort,setSort]=useState("custom"),[searchOpen,setSearchOpen]=useState(false),[search,setSearch]=useState("");
  const [newGroup,setNewGroup]=useState(""),[addingGroup,setAddingGroup]=useState(false),[remove,setRemove]=useState(null);
  const [keys,setKeys]=useState(()=>choose("sm_api_keys_v4",{finnhub:"",fugle:"",gemini:"",model:"gemini-2.5-flash"}));
  const [fx,setFx]=useState(null),[fxDate,setFxDate]=useState("");
  const [loading,setLoading]=useState(false),[toast,setToast]=useState(""),[lastSync,setLastSync]=useState("");
  const updater=useRef(false),twRef=useRef(tw),usRef=useRef(us);
  useEffect(()=>{twRef.current=tw;localStorage.setItem("watchlist_TW",JSON.stringify(tw));},[tw]);
  useEffect(()=>{usRef.current=us;localStorage.setItem("watchlist_US",JSON.stringify(us));},[us]);
  useEffect(()=>{localStorage.setItem("sm_groups_TW",JSON.stringify(groupsTW));},[groupsTW]);
  useEffect(()=>{localStorage.setItem("sm_groups_US",JSON.stringify(groupsUS));},[groupsUS]);
  useEffect(()=>{localStorage.setItem("sm_theme_v4",dark?"dark":"light");},[dark]);
  useEffect(()=>{localStorage.setItem("sm_api_keys_v4",JSON.stringify(keys));},[keys]);
  const notify=t=>{setToast(t);setTimeout(()=>setToast(""),3100);};
  const list=market==="TW"?tw:us,setList=market==="TW"?setTw:setUs,groups=market==="TW"?groupsTW:groupsUS;
  const group=market==="TW"?groupTW:groupUS,setGroup=market==="TW"?setGroupTW:setGroupUS;
  const current=[...tw,...us].find(x=>x.id===selected&&isTaiwanStock(selected)===(market==="TW"))||list[0];
  useEffect(()=>{if(!list.some(s=>s.id===selected)&&list.length)setSelected(list[0].id);},[market,tw,us,selected]);
  const cycle=async()=>{
    if(updater.current)return;updater.current=true;setLoading(true);
    try{
      const original=(market==="TW"?twRef.current:usRef.current);
      const out=await Promise.allSettled(original.map(s=>fetchQuote(s,market,keys)));
      const valueById=new Map(original.map((s,i)=>[s.id,out[i].status==="fulfilled"?out[i].value:{errorMsg:"本次更新失敗，保留上次報價"}]));
      const setter=market==="TW"?setTw:setUs;
      setter(prev=>prev.map(s=>({...s,...valueById.get(s.id)})));
      setLastSync(new Date().toLocaleTimeString("zh-TW"));
    }finally{setLoading(false);updater.current=false;}
  };
  useEffect(()=>{cycle();const timer=setInterval(cycle,60000);return()=>clearInterval(timer);},[market,keys.finnhub,keys.fugle]);
  useEffect(()=>{let mounted=true;async function run(){try{const x=await fetchUsdTwd();if(mounted){setFx(x.rate);setFxDate(x.date);}}catch{if(mounted)setFx(null);}}
    run();const id=setInterval(run,3600000);return()=>{mounted=false;clearInterval(id);};},[]);
  const summary=useMemo(()=>{
    let value=0,cost=0,day=0,excluded=0;
    for(const s of [...tw,...us]){
      if(s.shares<=0)continue;
      if(!s.price||(isTaiwanStock(s.id)===false&&!fx)){excluded++;continue;}
      const multiplier=isTaiwanStock(s.id)?1:fx;
      value+=s.price*s.shares*multiplier;cost+=s.avgCost*s.shares*multiplier;
      if(s.prevClose>0)day+=(s.price-s.prevClose)*s.shares*multiplier;
    }
    return {value,cost,day,gain:value-cost,excluded};
  },[tw,us,fx]);
  const display=useMemo(()=>{
    const data=(group==="全部"?list:list.filter(s=>s.group===group)).slice();
    data.sort((a,b)=>a.pinned!==b.pinned?(a.pinned?-1:1):sort==="changeDesc"?b.changePercent-a.changePercent:sort==="changeAsc"?a.changePercent-b.changePercent:sort==="priceDesc"?b.price-a.price:sort==="idAsc"?a.id.localeCompare(b.id):0);
    return data;
  },[list,group,sort]);
  const suggestions=useMemo(()=>{
    const q=search.trim().toUpperCase();if(!q)return[];
    return Object.entries(STOCK_DICT).filter(([id,info])=>id.includes(q)||info[0].toUpperCase().includes(q)||info[1].includes(q)).slice(0,10);
  },[search]);
  function addStock(input){
    const code=cleanSymbol(input);if(!code)return;
    if(!/^[A-Z0-9.]+$/.test(code)){notify("請輸入股票代號或選擇搜尋結果");return;}
    const target=isTaiwanStock(code)?"TW":"US",setter=target==="TW"?setTw:setUs,already=(target==="TW"?twRef.current:usRef.current).some(s=>s.id===code);
    if(already){notify("股票已存在");setMarket(target);setTab("market");setSelected(code);return;}
    const newStock=enhanceStock({id:code,group:target===market&&group!=="全部"?group:target==="TW"?"核心存股":"科技巨頭"});
    setter(prev=>uniqueStocks([newStock,...prev]));setMarket(target);setTab("market");setSelected(code);notify("已加入 "+newStock.name);
    fetchQuote(newStock,target,keys).then(result=>setter(prev=>prev.map(s=>s.id===code?{...s,...result}:s))).catch(()=>{});
  }
  function addMany(e){e.preventDefault();const terms=search.split(/[\s,，;；]+/).filter(Boolean);for(const term of terms){
    const nameMatch=Object.keys(STOCK_DICT).find(id=>STOCK_DICT[id][0]===term);addStock(nameMatch||term);
  }setSearch("");}
  function makeGroup(){
    const name=newGroup.trim();if(!name||name==="全部")return;
    const setter=market==="TW"?setGroupsTW:setGroupsUS;
    setter(prev=>prev.includes(name)?prev:[...prev,name]);setGroup(name);setNewGroup("");setAddingGroup(false);notify("已新增群組 "+name);
  }
  function patchStock(id,updates){setList(prev=>prev.map(s=>s.id===id?{...s,...updates}:s));notify("已儲存設定");}
  function backup(){
    const blob=new Blob([JSON.stringify({version:"4.1",date:new Date().toISOString(),watchlistTW:tw,watchlistUS:us,groupsTW,groupsUS},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="StockMaster_Backup_"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url);
  }
  async function importBackup(e){
    const file=e.target.files?.[0];if(!file)return;
    try{
      const x=JSON.parse(await file.text());
      if(!Array.isArray(x.watchlistTW)||!Array.isArray(x.watchlistUS))throw Error("invalid watchlists");
      const safeTW=uniqueStocks(x.watchlistTW.filter(s=>isTaiwanStock(s.id||s.symbol)));
      const safeUS=uniqueStocks(x.watchlistUS.filter(s=>!isTaiwanStock(s.id||s.symbol)));
      setTw(safeTW);setUs(safeUS);
      if(Array.isArray(x.groupsTW))setGroupsTW([...new Set(["全部",...x.groupsTW.filter(v=>typeof v==="string"&&v!=="全部")])]);
      if(Array.isArray(x.groupsUS))setGroupsUS([...new Set(["全部",...x.groupsUS.filter(v=>typeof v==="string"&&v!=="全部")])]);
      notify("資料已還原");
    }catch{notify("備份格式錯誤，未匯入");}
    e.target.value="";
  }
  return <div className={dark?"min-h-screen bg-[#090D16] text-slate-100":"min-h-screen bg-slate-100 text-slate-900"}>
    {toast&&<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-xl text-xs font-bold">{toast}</div>}
    <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-[#090D16]/95 text-white backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><div className="bg-gradient-to-br from-indigo-500 to-violet-600 w-10 h-10 rounded-xl grid place-items-center font-bold text-amber-300">⚡</div>
            <div><h1 className="font-extrabold tracking-tight">StockMaster <span className="text-indigo-400">PRO</span> <small className="text-[10px] bg-emerald-500/15 text-emerald-400 rounded px-1">v4.1</small></h1>
              <p className="text-[10px] text-slate-400">USD/TWD：{fx?fmt(fx,2):"待取得"}　{lastSync?"行情檢查 "+lastSync:""}</p></div>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <button className={tab==="market"&&market==="TW"?active:button} onClick={()=>{setMarket("TW");setTab("market");setMobileDetail(false);}}>🇹🇼 台股 {tw.length}</button>
            <button className={tab==="market"&&market==="US"?active:button} onClick={()=>{setMarket("US");setTab("market");setMobileDetail(false);}}>🇺🇸 美股 {us.length}</button>
            <button className={tab==="guru"?active:button} onClick={()=>setTab("guru")}>大師 13F</button>
            <button className={tab==="settings"?active:button} onClick={()=>setTab("settings")}>設定</button>
            <button title="更新行情" className={button} onClick={cycle} disabled={loading}><RefreshCw size={15} className={loading?"animate-spin":""}/></button>
            <button title="明暗模式" className={button} onClick={()=>setDark(v=>!v)}>{dark?<Sun size={15}/>:<Moon size={15}/>}</button>
          </div>
        </div>
        {summary.value>0&&<div className="flex flex-wrap items-center gap-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] p-2">
          <Briefcase size={13} className="text-indigo-400"/><b>總持倉 NT$ {fmt(summary.value,0)}</b><span className={upColor(summary.gain)}>累計 {summary.gain>=0?"+":""}{fmt(summary.gain,0)}</span>
          <span className={upColor(summary.day)}>單日 {summary.day>=0?"+":""}{fmt(summary.day,0)}</span>
          {summary.excluded>0&&<span className="text-amber-300">部分持股無報價/匯率未納入 ({summary.excluded})</span>}
        </div>}
      </div>
    </header>
    {tab==="settings"?<section className="max-w-xl mx-auto p-4 sm:pt-8 pb-24 space-y-5 text-white">
      <div className={container}><h2 className="text-lg font-bold mb-2 flex items-center gap-2"><Download size={18}/> 匯出與還原</h2>
        <p className="text-xs text-slate-400 mb-3">自選股、持有股數與成本、群組保存在此瀏覽器。JSON 備份不包含 API 金鑰。</p>
        <div className="flex gap-2"><button className={active+" flex-1"} onClick={backup}><Download size={13} className="inline mr-1"/>匯出 JSON</button>
        <label className={button+" flex-1 text-center cursor-pointer"}><Upload size={13} className="inline mr-1"/>匯入 JSON<input type="file" accept=".json" hidden onChange={importBackup}/></label></div>
      </div>
      <div className={container}><h2 className="text-lg font-bold mb-2 flex items-center gap-2"><Sliders size={18}/> 自行設定 API 金鑰</h2>
        <p className="text-xs text-amber-300 mb-4">已移除原程式內建金鑰。輸入的金鑰只保存在此瀏覽器，但瀏覽器前端金鑰並不等於伺服器機密；請設定配額並避免在共用裝置輸入。</p>
        {[
          ["finnhub","Finnhub 美股報價"],["fugle","Fugle 台股報價"],["gemini","Gemini AI 分析"],["model","Gemini 模型名稱"]
        ].map(([field,label])=><label key={field} className="block text-xs font-bold text-slate-300 mb-3">{label}
          <input className="input mt-1" type={field==="model"?"text":"password"} autoComplete="off" value={keys[field]||""} onChange={e=>setKeys(prev=>({...prev,[field]:e.target.value}))}/>
        </label>)}
        <p className="text-[11px] text-slate-400">行情連線失敗不會使用假價格；每筆資料標示來源與日期。每 60 秒檢查報價，可能受 API 配額與跨來源限制影響。</p>
      </div>
    </section>:tab==="guru"?<GuruSection onAdd={addStock}/>:<main className="max-w-[1440px] mx-auto px-3 sm:px-4 py-4 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className={(mobileDetail?"hidden lg:block":"block")+" lg:col-span-5 xl:col-span-4 space-y-3"}>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {groups.map(g=><button key={g} className={group===g?active:button} onClick={()=>setGroup(g)}>{g}</button>)}
            {addingGroup?<div className="flex gap-1"><input className="input w-28 text-xs" placeholder="群組名稱" value={newGroup} onChange={e=>setNewGroup(e.target.value)} onKeyDown={e=>e.key==="Enter"&&makeGroup()}/><button className={active} onClick={makeGroup}><Check size={14}/></button></div>:<button className={button+" flex items-center gap-1 whitespace-nowrap"} onClick={()=>setAddingGroup(true)}><FolderPlus size={13}/>新增群組</button>}
          </div>
          <div className="flex justify-between items-center gap-2">
            <label className="text-slate-400 flex items-center gap-1"><ArrowUpDown size={13}/><select className="bg-slate-900 text-slate-200 text-xs border border-slate-700 rounded-lg px-2 py-1.5" value={sort} onChange={e=>setSort(e.target.value)}>
              <option value="custom">釘選／預設</option><option value="changeDesc">漲幅最高</option><option value="changeAsc">跌幅最高</option><option value="priceDesc">股價最高</option><option value="idAsc">代號排序</option>
            </select></label>
            <button className={active+" flex gap-1 items-center"} onClick={()=>setSearchOpen(v=>!v)}>{searchOpen?<X size={14}/>:<Plus size={14}/>}新增股票</button>
          </div>
          {searchOpen&&<div className={container+" space-y-3 text-white"}>
            <form className="flex gap-2" onSubmit={addMany}><input className="input text-xs flex-1 min-w-0" placeholder="輸入代號；可用空白分隔批次加入" value={search} onChange={e=>setSearch(e.target.value)}/><button className={active} type="submit">加入</button></form>
            {!!suggestions.length&&<div className="space-y-1">{suggestions.map(([id,info])=><button key={id} className="w-full flex justify-between gap-2 text-xs hover:bg-slate-800 p-2 rounded-lg text-left" onClick={()=>addStock(id)}><b className="text-indigo-300">{id}</b><span className="flex-1">{info[0]}</span><Plus size={13}/></button>)}</div>}
            <p className="text-[10px] text-slate-400">熱門標的（點選立即加入）</p><div className="flex gap-1 flex-wrap">{QUICK_ADD[market].map(id=><button key={id} className={button} onClick={()=>addStock(id)}>{stockName(id)} {id}</button>)}</div>
          </div>}
          <div className="space-y-2 text-white">
            {!display.length&&<div className={container+" text-center text-slate-400 py-12"}>此群組尚無股票</div>}
            {display.map(s=><button key={s.id} className={"w-full text-left border rounded-2xl p-3 flex items-center gap-2 hover:border-indigo-500 "+(selected===s.id?"border-indigo-500 bg-indigo-950/40":"border-slate-800 bg-slate-900/80")} onClick={()=>{setSelected(s.id);setMobileDetail(true);}}>
              <div className={"w-1.5 self-stretch rounded-full "+(s.change>0?"bg-rose-500":s.change<0?"bg-emerald-500":"bg-slate-500")}/>
              <div className="flex-1 min-w-0"><div className="flex gap-1 items-center flex-wrap">{s.pinned&&<Pin size={13} className="text-amber-400"/>}<b className="text-sm">{s.name}</b><small className="font-mono text-slate-400">{s.id}</small></div>
                <div className="text-[10px] text-slate-400 mt-1">{s.group} · {s.source}{s.quoteDate?" · "+s.quoteDate:""}</div>
                {s.shares>0&&s.avgCost>0&&s.price>0&&<div className={"text-[10px] "+upColor(s.price-s.avgCost)}>持有損益 {fmt((s.price-s.avgCost)*s.shares,0)}</div>}</div>
              <div className="text-right shrink-0">{s.price>0?<><div className={"text-lg font-mono font-bold "+upColor(s.change)}>{fmt(s.price)}</div><span className={"font-mono text-[11px] font-bold "+upColor(s.change)}>{s.changePercent>0?"+":""}{fmt(s.changePercent)}%</span></>:<span className="text-xs text-amber-400">無報價</span>}</div>
              <div className="flex flex-col gap-1 ml-1">
                <span role="button" tabIndex={0} title="釘選" onClick={e=>{e.stopPropagation();setList(prev=>prev.map(x=>x.id===s.id?{...x,pinned:!x.pinned}:x));}}><Pin size={14} className={s.pinned?"text-amber-300":"text-slate-500"}/></span>
                <span role="button" tabIndex={0} title="刪除" onClick={e=>{e.stopPropagation();setRemove(s);}}><Trash2 size={14} className="text-slate-500 hover:text-rose-400"/></span>
              </div>
            </button>)}
          </div>
        </div>
        <div className={(mobileDetail?"block":"hidden lg:block")+" lg:col-span-7 xl:col-span-8 text-white"}>
          {current?<Detail key={market+":"+current.id} stock={current} market={market} keys={keys} groups={groups}
            onBack={()=>setMobileDetail(false)} onSave={u=>patchStock(current.id,u)}/>:<div className={container}>請先新增股票</div>}
        </div>
      </div>
    </main>}
    {remove&&<div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4">
      <div className={container+" w-full max-w-xs text-white text-center space-y-4"}><Trash2 className="mx-auto text-rose-400"/><b>確定移除 {remove.name}？</b>
        <div className="flex gap-2"><button className={button+" flex-1"} onClick={()=>setRemove(null)}>取消</button>
          <button className={active+" bg-rose-600 flex-1"} onClick={()=>{setList(prev=>prev.filter(s=>s.id!==remove.id));setRemove(null);}}>確定刪除</button></div>
      </div>
    </div>}
    <footer className="py-4 text-center text-[10px] text-slate-500">StockMaster PRO · 價格與指標僅供研究，不構成投資建議 · 來源失敗時不模擬行情</footer>
  </div>;
}
function Detail({stock,market,keys,groups,onBack,onSave}){
  const [time,setTime]=useState("3M"),[mode,setMode]=useState("trend"),[sub,setSub]=useState("kd");
  const [showMA,setShowMA]=useState(true),[showBB,setShowBB]=useState(false);
  const [candles,setCandles]=useState([]),[source,setSource]=useState(""),[asOf,setAsOf]=useState(""),[busy,setBusy]=useState(false),[chartError,setChartError]=useState("");
  const [hover,setHover]=useState(null),[edit,setEdit]=useState(false),[shares,setShares]=useState(stock.shares||""),[cost,setCost]=useState(stock.avgCost||""),[grp,setGrp]=useState(stock.group);
  const [report,setReport]=useState(""),[aiBusy,setAiBusy]=useState(false);
  const req=useRef(0);
  async function load(force=false){
    const index=++req.current;setBusy(true);setChartError("");setHover(null);
    try{const x=await fetchChart(stock.id,market,time,force);if(index!==req.current)return;setCandles(x.data);setSource(x.source);setAsOf(x.asOf);}
    catch(e){if(index!==req.current)return;setCandles([]);setSource("");setChartError(e.message||"讀取失敗");}
    finally{if(index===req.current)setBusy(false);}
  }
  useEffect(()=>{load(false);return()=>{req.current++;};},[stock.id,market,time]);
  const latest=candles.at(-1),point=hover||latest,signals=useMemo(()=>technicalSignals(candles),[candles]);
  function save(e){e.preventDefault();if(Number(shares)<0||Number(cost)<0){return;}onSave({shares:Number(shares)||0,avgCost:Number(cost)||0,group:grp});setEdit(false);}
  async function generate(){
    setAiBusy(true);setReport("");try{setReport(await geminiAnalysis(stock,latest,keys));}catch(e){setReport("分析失敗："+(e.message||"請確認金鑰與連線"));}finally{setAiBusy(false);}
  }
  return <div className={container+" space-y-4"}>
    <div className="flex items-start gap-2 border-b border-slate-800 pb-4">
      <button className={button+" lg:hidden"} onClick={onBack}><ArrowLeft size={16}/></button>
      <div className="flex-1"><div className="flex flex-wrap gap-2 items-center"><h2 className="text-xl sm:text-2xl font-extrabold">{stock.name}</h2><span className="text-xs text-indigo-300 font-mono border border-indigo-500/40 rounded px-2">{stock.id}</span></div>
        <div className="text-xs text-slate-400 mt-1">{stock.sector} · {stock.source}{stock.quoteDate?" · "+stock.quoteDate:""}</div></div>
      <div className="text-right shrink-0">{stock.price>0?<><div className={"text-3xl font-bold font-mono "+upColor(stock.change)}>{fmt(stock.price)}</div><div className={"text-xs font-mono "+upColor(stock.change)}>{stock.change>0?"+":""}{fmt(stock.change)} ({stock.changePercent>0?"+":""}{fmt(stock.changePercent)}%)</div></>:<div className="text-amber-400 text-sm">行情暫不可用</div>}</div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {[["開盤",stock.open],["最高",stock.high],["最低",stock.low],["昨收",stock.prevClose]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-center"><p className="text-[10px] text-slate-400">{label}</p><b className="font-mono text-sm">{value>0?fmt(value):"-"}</b></div>)}
      <button className="rounded-xl bg-indigo-600/20 border border-indigo-500/40 p-2 text-[11px] font-bold col-span-2 sm:col-span-1" onClick={()=>setEdit(v=>!v)}><Briefcase size={13} className="inline"/> {stock.shares>0?stock.shares+" 股":"持倉／群組"}<br/>均價 {stock.avgCost||"-"}</button>
    </div>
    {stock.errorMsg&&<p className="text-xs text-amber-400"><AlertTriangle size={12} className="inline"/> {stock.errorMsg}</p>}
    {edit&&<form onSubmit={save} className="border border-indigo-500/40 rounded-xl p-3 grid sm:grid-cols-4 gap-2 items-end">
      <label className="text-xs">分類<select className="input mt-1" value={grp} onChange={e=>setGrp(e.target.value)}>{groups.filter(g=>g!=="全部").map(g=><option key={g}>{g}</option>)}</select></label>
      <label className="text-xs">股數<input className="input mt-1" type="number" min="0" step="any" value={shares} onChange={e=>setShares(e.target.value)}/></label>
      <label className="text-xs">買進均價<input className="input mt-1" type="number" min="0" step="any" value={cost} onChange={e=>setCost(e.target.value)}/></label>
      <button type="submit" className={active}>儲存</button>
    </form>}
    {!!signals.length&&<div className="flex gap-1.5 flex-wrap">{signals.map((s,i)=><span key={i} className={"text-[10px] rounded-full border px-2 py-1 "+(s.up?"border-rose-500/30 text-rose-300 bg-rose-500/10":"border-emerald-500/30 text-emerald-300 bg-emerald-500/10")}>{s.text}</span>)}</div>}
    <div className="flex flex-wrap gap-2 justify-between items-center">
      <div className="flex flex-wrap gap-1">{[["trend","趨勢圖"],["range","高低收盤圖"]].map(([id,label])=><button key={id} className={mode===id?active:button} onClick={()=>setMode(id)}>{label}</button>)}</div>
      <div className="flex gap-2"><button className={showMA?active:button} onClick={()=>setShowMA(v=>!v)}>MA5/20/60</button><button className={showBB?active:button} onClick={()=>setShowBB(v=>!v)}>BB通道</button></div>
    </div>
    <div className="flex gap-1 overflow-x-auto no-scrollbar items-center">{["1D","1W","1M","3M","6M","1Y","5Y","ALL"].map(x=><button key={x} className={x===time?active:button} onClick={()=>setTime(x)}>{x}</button>)}
      <button className={button} onClick={()=>load(true)} disabled={busy} title="強制更新K線"><RefreshCw size={14} className={busy?"animate-spin":""}/></button>
    </div>
    <div className="text-[10px] text-slate-400">{source?"來源："+source+" ｜最後K線："+asOf:"尚未取得K線"}　{time==="1D"?"日內圖需取得分時資料；不以日K假冒":""}</div>
    {point&&<div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono">
      <span className="text-indigo-300">{point.date}</span><span>開 {fmt(point.open)}</span><span>高 {fmt(point.high)}</span><span>低 {fmt(point.low)}</span><span>收 {fmt(point.close)}</span>{showMA&&<><span className="text-amber-300">MA5 {point.ma5!=null?fmt(point.ma5):"-"}</span><span className="text-violet-300">MA20 {point.ma20!=null?fmt(point.ma20):"-"}</span><span className="text-sky-300">MA60 {point.ma60!=null?fmt(point.ma60):"-"}</span></>}
    </div>}
    <div className="rounded-2xl border border-slate-800 bg-[#0b101b] p-2">
      {busy?<div className="h-[390px] grid place-items-center text-indigo-300 text-xs"><span><Loader2 className="animate-spin inline mr-2"/>同步歷史資料中...</span></div>:!candles.length?<div className="h-[390px] grid place-items-center text-center text-amber-300 text-xs px-6">{chartError||"無有效歷史資料"}<br/>請檢查來源或點右上角重新抓取</div>:<>
        <div className="h-[260px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={candles} onMouseMove={state=>{const p=state?.activePayload?.[0]?.payload;if(p)setHover(p);}} onMouseLeave={()=>setHover(null)}>
          <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fill:"#64748b",fontSize:9}} tickLine={false} minTickGap={28}/><YAxis orientation="right" domain={["auto","auto"]} tick={{fill:"#64748b",fontSize:10}} width={48}/><Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:11,borderRadius:10}}/>
          {mode==="trend"?<Area type="monotone" dataKey="close" stroke="#818cf8" fill="#6366f1" fillOpacity={0.13} dot={false} isAnimationActive={false} name="收盤價"/>:<><Line dataKey="high" stroke="#fb7185" strokeWidth={1} dot={false} name="最高"/><Line dataKey="low" stroke="#34d399" strokeWidth={1} dot={false} name="最低"/><Line dataKey="close" stroke="#e2e8f0" strokeWidth={1.8} dot={false} name="收盤"/></>}
          {showBB&&<><Line dataKey="bbUpper" stroke="#22d3ee" strokeDasharray="3 3" dot={false}/><Line dataKey="bbLower" stroke="#22d3ee" strokeDasharray="3 3" dot={false}/></>}
          {showMA&&<><Line dataKey="ma5" stroke="#fbbf24" strokeWidth={1.5} dot={false}/><Line dataKey="ma20" stroke="#c084fc" strokeWidth={1.5} dot={false}/><Line dataKey="ma60" stroke="#38bdf8" strokeWidth={1.5} dot={false}/></>}
        </ComposedChart></ResponsiveContainer></div>
        <div className="border-t border-slate-800 my-2 pt-2 flex flex-wrap gap-1">{[["kd","KD (9,3,3)"],["macd","MACD"],["rsi","RSI (14)"],["volume","成交量"]].map(([id,label])=><button className={sub===id?active:button} key={id} onClick={()=>setSub(id)}>{label}</button>)}</div>
        <div className="h-[125px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={candles}>
          <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3 3"/><XAxis dataKey="date" hide/><YAxis orientation="right" width={48} tick={{fill:"#64748b",fontSize:9}} domain={sub==="kd"||sub==="rsi"?[0,100]:["auto","auto"]}/><Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:11}}/>
          {sub==="kd"&&<><ReferenceLine y={80} stroke="#fb7185" strokeDasharray="3 3"/><ReferenceLine y={20} stroke="#34d399" strokeDasharray="3 3"/><Line dataKey="k" stroke="#fbbf24" dot={false} name="K"/><Line dataKey="d" stroke="#c084fc" dot={false} name="D"/></>}
          {sub==="macd"&&<><ReferenceLine y={0} stroke="#64748b"/><Bar dataKey="osc" name="OSC" isAnimationActive={false}>{candles.map((p,i)=><Cell key={i} fill={p.osc>=0?"#fb7185":"#34d399"}/>)}</Bar><Line dataKey="dif" stroke="#fbbf24" dot={false}/><Line dataKey="macd" stroke="#22d3ee" dot={false}/></>}
          {sub==="rsi"&&<><ReferenceLine y={70} stroke="#fb7185" strokeDasharray="3 3"/><ReferenceLine y={30} stroke="#34d399" strokeDasharray="3 3"/><Line dataKey="rsi" stroke="#818cf8" dot={false}/></>}
          {sub==="volume"&&<Bar dataKey="volume" name="成交量" isAnimationActive={false}>{candles.map((p,i)=><Cell key={i} fill={p.close>=p.open?"#fb7185":"#34d399"}/>)}</Bar>}
        </ComposedChart></ResponsiveContainer></div>
      </>}
    </div>
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3"><h3 className="font-bold text-sm flex gap-2 items-center"><Sparkles size={16} className="text-indigo-400"/> AI 策略分析 <span className="font-normal text-[10px] text-slate-400">只依據已載入的數據</span></h3>
        <button className={active} disabled={aiBusy||!latest} onClick={generate}><Bot size={13} className="inline mr-1"/>{aiBusy?"分析中":"生成深度報告"}</button></div>
      {report?<p className="whitespace-pre-line text-xs leading-6 text-slate-200">{report}</p>:<p className="text-xs text-slate-400">使用 Gemini API Key 解讀 MA、KD、MACD 和 RSI。報告不包含經驗證的即時產業新聞；請勿視為買賣指令。</p>}
    </div>
  </div>;
}
function GuruSection({onAdd}){
  const [id,setId]=useState(GURUS[0].id),guru=GURUS.find(x=>x.id===id)||GURUS[0];
  return <main className="max-w-[1100px] mx-auto p-4 pb-24 text-white">
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 mb-4"><AlertTriangle size={14} className="inline mr-1"/>大師清單僅為原程式提供的研究示例，並非同步的最新 13F 資料。沒有經驗證的權重或揭露日期，因此不顯示即時持倉比例。</div>
    <div className="grid md:grid-cols-3 gap-4"><aside className="space-y-2">{GURUS.map(g=><button key={g.id} onClick={()=>setId(g.id)} className={"w-full text-left p-4 rounded-xl border "+(id===g.id?"border-indigo-500 bg-indigo-950/50":"border-slate-800 bg-slate-900")}><b>{g.icon} {g.name}</b><p className="text-xs text-slate-400 mt-1">{g.title}</p></button>)}</aside>
      <section className={container+" md:col-span-2"}><h2 className="font-bold text-lg mb-1">{guru.icon} {guru.name}</h2><p className="text-xs text-slate-400 mb-4">示例追蹤清單，非最新申報持股</p>
        <div className="grid sm:grid-cols-2 gap-2">{guru.symbols.map(code=><div key={code} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-2"><b className="text-indigo-300 font-mono">{code}</b><span className="text-xs flex-1">{stockName(code)}</span><button className={active} onClick={()=>onAdd(code)}><Plus size={14}/></button></div>)}</div>
      </section></div>
  </main>;
}
export default App;
