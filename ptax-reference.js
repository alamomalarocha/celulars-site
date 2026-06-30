(function(){
  const CELULARS_EXCHANGE_SPREAD_BRL = 0.15;
  const BCB_CACHE_KEY = 'celulars_bcb_ptax_usd_brl_v3_spread15';
  const BCB_LEGACY_CACHE_KEYS = ['celulars_bcb_ptax_usd_brl_v2','celulars_bcb_ptax_usd_brl_v1'];
  const BCB_CACHE_TTL_MS = 86400000;
  const FALLBACK_BCB_RATE = 5.32;
  window.CELULARS_EXCHANGE_SPREAD_BRL = CELULARS_EXCHANGE_SPREAD_BRL;

  function localDateKey(d = new Date()){
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function bcbParamDate(d){
    return String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'-'+d.getFullYear();
  }

  function formatRate(v){
    return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4});
  }

  function formatDate(v){
    const s=String(v||'').slice(0,10),p=s.split('-');
    return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:'--/--/----';
  }

  function referenceRateFrom(rateInfo){
    return (Number(rateInfo.rate)||FALLBACK_BCB_RATE)+CELULARS_EXCHANGE_SPREAD_BRL;
  }

  function readBcbCache(){
    try{
      const c=JSON.parse(localStorage.getItem(BCB_CACHE_KEY)||'null');
      return c&&Number(c.rate)>0?{...c,cacheVersion:3}:null;
    }catch(e){return null}
  }

  function readLegacyBcbCache(){
    for(const key of BCB_LEGACY_CACHE_KEYS){
      try{
        const c=JSON.parse(localStorage.getItem(key)||'null');
        if(c&&Number(c.rate)>0)return{...c,cacheVersion:key.includes('_v2')?2:1};
      }catch(e){}
    }
    return null;
  }

  function writeBcbCache(c){
    try{
      localStorage.setItem(BCB_CACHE_KEY,JSON.stringify({...c,spread:CELULARS_EXCHANGE_SPREAD_BRL,referenceRate:referenceRateFrom(c),cacheVersion:3}));
    }catch(e){}
  }

  function logBcbStatus(source,rateInfo){
    try{
      console.info('[CELULARS PTAX]',{
        source,
        checkedAt:new Date().toISOString(),
        checkedKey:localDateKey(),
        quoteDate:rateInfo.date||String(rateInfo.dataHoraCotacao||'').slice(0,10),
        ptaxRate:Number(rateInfo.rate)||null,
        spread:CELULARS_EXCHANGE_SPREAD_BRL,
        referenceRate:referenceRateFrom(rateInfo),
        cacheKey:BCB_CACHE_KEY
      });
    }catch(e){}
  }

  function updatePtaxBlocks(rateInfo,status){
    const ptax=Number(rateInfo.rate)||FALLBACK_BCB_RATE,reference=ptax+CELULARS_EXCHANGE_SPREAD_BRL;
    document.querySelectorAll('[data-cel-reference-rate]').forEach(el=>el.textContent=formatRate(reference));
    document.querySelectorAll('[data-cel-ptax-rate]').forEach(el=>el.textContent=formatRate(ptax));
    document.querySelectorAll('[data-cel-spread-rate]').forEach(el=>el.textContent=formatRate(CELULARS_EXCHANGE_SPREAD_BRL));
    document.querySelectorAll('[data-cel-ptax-date]').forEach(el=>{
      el.textContent=status==='fallback'?'Cotação indisponível temporariamente.':'Atualizada em '+formatDate(rateInfo.date||rateInfo.dataHoraCotacao)+'.';
    });
  }

  async function fetchBcbPtax(){
    const end=new Date(),start=new Date();
    start.setDate(end.getDate()-14);
    const url="https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='"+bcbParamDate(start)+"'&@dataFinalCotacao='"+bcbParamDate(end)+"'&$format=json&$orderby=dataHoraCotacao desc&$top=1";
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok)throw new Error('BCB PTAX HTTP '+res.status);
    const data=await res.json(),row=data&&data.value&&data.value[0];
    if(!row||!Number(row.cotacaoVenda))throw new Error('BCB PTAX sem cotacao');
    return{rate:Number(row.cotacaoVenda),date:String(row.dataHoraCotacao).slice(0,10),dataHoraCotacao:row.dataHoraCotacao,fetchedKey:localDateKey(),fetchedAt:Date.now(),source:'Banco Central do Brasil - PTAX USD/BRL venda'};
  }

  async function updateGlobalPtax(){
    if(!document.querySelector('[data-cel-ptax-block]'))return;
    const cached=readBcbCache(),today=localDateKey();
    if(cached&&cached.fetchedKey===today&&Date.now()-Number(cached.fetchedAt||0)<BCB_CACHE_TTL_MS){
      updatePtaxBlocks(cached,'cache');
      logBcbStatus('cache',cached);
      return;
    }
    try{
      const fresh=await fetchBcbPtax();
      writeBcbCache(fresh);
      updatePtaxBlocks(fresh,'live');
      logBcbStatus('api',fresh);
    }catch(e){
      console.warn('Não foi possível carregar PTAX do Banco Central.',e);
      const saved=readBcbCache()||readLegacyBcbCache();
      if(saved){
        updatePtaxBlocks(saved,'saved');
        logBcbStatus('saved-cache',saved);
      }else{
        const fallback={rate:FALLBACK_BCB_RATE,date:''};
        updatePtaxBlocks(fallback,'fallback');
        logBcbStatus('fallback',fallback);
      }
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateGlobalPtax);
  else updateGlobalPtax();
})();
