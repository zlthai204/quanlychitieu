/* =========================================================
   THU CHI — STATISTICS PREMIUM FINAL
   Rebuild toàn bộ trang thống kê theo hướng dễ hiểu
========================================================= */
(function(){
  'use strict';

  // AppState is declared with const in app.js, so it is not exposed as window.AppState.
  // Always resolve the real application state first.
  const getState = () => (typeof AppState !== 'undefined' ? AppState : (window.AppState || {}));

  const money = v => {
    if (typeof window.parseMoneyValue === 'function') return Number(window.parseMoneyValue(v)) || 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').trim().replace(/[₫đĐ\s]/g,'');
    if (!s) return 0;
    if (s.includes('.') && s.includes(',')) s = s.replace(/\./g,'').replace(',', '.');
    else if (s.includes(',')) {
      const p=s.split(','); s=(p.length===2 && p[1].length<=2) ? p[0].replace(/\./g,'')+'.'+p[1] : s.replace(/,/g,'');
    } else if (s.includes('.')) {
      const p=s.split('.'); if (p.length===2 && p[1].length===3) s=p[0]+p[1];
    }
    return Number(s.replace(/[^0-9.-]/g,'')) || 0;
  };
  const fmt = v => typeof window.formatMoney === 'function' ? window.formatMoney(money(v)) : money(v).toLocaleString('vi-VN')+' ₫';
  const esc = v => {
    if (typeof window.escapeHTML === 'function') return window.escapeHTML(String(v ?? ''));
    return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  };
  const type = v => String(v ?? '').trim().toLowerCase();
  const sourceKey = v => String(v ?? '').trim().toLowerCase();
  const hasFee = v => ['shopeefood','grabfood'].includes(sourceKey(v));
  const sourceInfo = v => {
    const s=sourceKey(v);
    if(s==='shopeefood') return {name:'ShopeeFood',icon:'🟠',cls:'shopee'};
    if(s==='grabfood') return {name:'GrabFood',icon:'🟢',cls:'grab'};
    return {name:'Ngoài sàn',icon:'🔵',cls:'outside'};
  };
  const dstr = d => String(d||'').slice(0,10);
  const localDate = d => {
    const m=dstr(d).match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) return null;
    return new Date(+m[1],+m[2]-1,+m[3],12);
  };
  const todayString = () => {
    const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const fmtDate = d => { const x=localDate(d); return x ? `${String(x.getDate()).padStart(2,'0')}/${String(x.getMonth()+1).padStart(2,'0')}/${x.getFullYear()}` : dstr(d); };
  const parseItems = t => {
    if (typeof window.getTransactionOrderItems === 'function') return window.getTransactionOrderItems(t) || [];
    if (t?.items && Array.isArray(t.items)) return t.items;
    return t?.dish_id || t?.dish_name ? [{dish_id:t.dish_id,dish_name:t.dish_name,qty:1,unit_cost:0}] : [];
  };
  const orderCost = t => {
    if (typeof window.getTransactionOrderCost === 'function') return money(window.getTransactionOrderCost(t));
    if (typeof window.getTransactionDishCost === 'function') return money(window.getTransactionDishCost(t));
    return 0;
  };
  const getRange = () => {
    const p=getState()?.statisticsPeriod || 'day';
    const base=getState()?.statisticsDate instanceof Date ? new Date(getState().statisticsDate) : new Date();
    base.setHours(12,0,0,0);
    let start=new Date(base), end=new Date(base);
    if(p==='week'){
      const day=start.getDay(); const diff=day===0?-6:1-day; start.setDate(start.getDate()+diff); end=new Date(start); end.setDate(end.getDate()+6);
    } else if(p==='month'){
      start=new Date(base.getFullYear(),base.getMonth(),1,12); end=new Date(base.getFullYear(),base.getMonth()+1,0,12);
    }
    const ymd=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
    return {start:ymd(start),end:ymd(end),startDate:start,endDate:end};
  };
  const transactionsInRange = () => {
    const {start,end}=getRange();
    return (getState()?.transactions||[]).filter(t=>{const d=dstr(t?.date); return d && d>=start && d<=end;});
  };
  const setText=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};

  function ensureState(){
    if(typeof AppState === 'undefined' && !window.AppState) window.AppState={};
    if(!['day','week','month'].includes(getState().statisticsPeriod)) getState().statisticsPeriod='day';
    if(!(getState().statisticsDate instanceof Date) || isNaN(getState().statisticsDate)) {
      const ds=todayString(); const [y,m,d]=ds.split('-').map(Number); getState().statisticsDate=new Date(y,m-1,d,12);
    }
  }

  function periodLabel(){
    const r=getRange(), p=getState().statisticsPeriod;
    if(p==='day') return `Ngày ${fmtDate(r.start)}`;
    if(p==='week') return `Tuần ${fmtDate(r.start)} – ${fmtDate(r.end)}`;
    const x=localDate(r.start); return x ? `Tháng ${String(x.getMonth()+1).padStart(2,'0')}/${x.getFullYear()}` : 'Tháng';
  }

  function orderRows(income){
    return income.map((t,i)=>{
      const items=parseItems(t); const revenue=money(t.amount); const cost=orderCost(t); const fee=hasFee(t.source)?money(t.app_fee):0; const net=revenue-cost-fee; const s=sourceInfo(t.source);
      const itemLines=items.length ? items.map(it=>{
        const qty=Math.max(1,Number(it.qty)||1); let unit=money(it.unit_cost);
        if(!unit && Array.isArray(getState()?.dishes)) { const d=getState().dishes.find(x=>String(x.id)===String(it.dish_id)); if(typeof window.getDishCostFromDish==='function') unit=money(window.getDishCostFromDish(d)); }
        return `<div class="sp-order-item"><div><b>${esc(it.dish_name||'Món')}</b><small>${qty} phần</small></div><strong>${fmt(unit*qty)}</strong></div>`;
      }).join('') : `<div class="sp-order-item"><div><b>${esc(t.dish_name||t.name||'Đơn hàng')}</b><small>1 mục</small></div><strong>—</strong></div>`;
      return `<article class="sp-order-card">
        <div class="sp-order-head"><div><div class="sp-order-title">${s.icon} Đơn #${i+1} <span class="sp-source ${s.cls}">${s.name}</span></div><div class="sp-order-meta">${fmtDate(t.date)}${t.note && typeof window.getTransactionDisplayNote==='function' && window.getTransactionDisplayNote(t)?' · '+esc(window.getTransactionDisplayNote(t)):''}</div></div><div class="sp-net"><span>THỰC NHẬN</span><b class="${net>=0?'pos':'neg'}">${fmt(net)}</b></div></div>
        <div class="sp-order-items">${itemLines}</div>
        <div class="sp-order-breakdown">
          <div><span>💰 Tổng tiền đơn</span><b>${fmt(revenue)}</b></div>
          <div><span>📦 Giá vốn</span><b class="muted">− ${fmt(cost)}</b></div>
          <div><span>${hasFee(t.source)?'💳 Chiết khấu '+esc(s.name):'✅ Không trừ phí app'}</span><b class="${hasFee(t.source)?'muted':''}">${hasFee(t.source)?'− '+fmt(fee):fmt(0)}</b></div>
          <div class="sp-order-final"><span>✨ Tiền thực nhận</span><b class="${net>=0?'pos':'neg'}">${fmt(net)}</b></div>
        </div>
      </article>`;
    }).join('');
  }

  function renderShell(){
    const page=document.getElementById('statisticsPage'); if(!page)return;
    page.innerHTML=`<div class="sp-wrap">
      <section class="sp-hero">
        <div class="sp-hero-copy">
          <div class="sp-eyebrow"><span class="sp-eyebrow-dot"></span> PHÂN TÍCH TÀI CHÍNH</div>
          <h2>Thống kê rõ ràng, nhìn là hiểu</h2>
          <p>Theo dõi doanh thu, giá vốn, phí nền tảng, chi phí và số tiền thực nhận trong cùng một màn hình.</p>
          <div class="sp-hero-actions"><span class="sp-live-dot"></span><span>Dữ liệu đồng bộ từ giao dịch đã lưu</span></div>
        </div>
        <div class="sp-hero-visual"><div class="sp-ring"><span>📊</span></div><div class="sp-floating sp-floating-a">↑ Doanh thu</div><div class="sp-floating sp-floating-b">✨ Lợi nhuận</div></div>
      </section>

      <section class="sp-control card">
        <div class="sp-control-top">
          <div><span class="sp-kicker">KHOẢNG THỜI GIAN</span><h3>Chọn thời gian muốn xem</h3><p>Chuyển nhanh giữa ngày, tuần hoặc tháng.</p></div>
          <button id="spToday" type="button" class="sp-today">↻ Hôm nay</button>
        </div>
        <div class="sp-tabs" role="tablist"><button data-period="day" type="button">Ngày</button><button data-period="week" type="button">Tuần</button><button data-period="month" type="button">Tháng</button></div>
        <div class="sp-date-row">
          <button type="button" class="sp-nav-btn" id="spPrev" aria-label="Kỳ trước">‹</button>
          <div class="sp-period-center"><span class="sp-period-label" id="spPeriodLabel"></span><small>Ngày tham chiếu</small></div>
          <button type="button" class="sp-nav-btn" id="spNext" aria-label="Kỳ sau">›</button>
          <label class="sp-date-field"><span>Ngày / tháng / năm</span><input id="spDate" type="date"></label>
        </div>
      </section>

      <section class="sp-kpi-grid">
        <article class="sp-kpi revenue"><div class="sp-kpi-icon">↑</div><div><span>DOANH THU</span><strong id="spRevenue">0 ₫</strong><small id="spOrders">0 đơn</small></div></article>
        <article class="sp-kpi cost"><div class="sp-kpi-icon">📦</div><div><span>GIÁ VỐN</span><strong id="spCost">0 ₫</strong><small id="spCostRate">0% doanh thu</small></div></article>
        <article class="sp-kpi fee"><div class="sp-kpi-icon">%</div><div><span>PHÍ NỀN TẢNG</span><strong id="spFee">0 ₫</strong><small id="spFeeRate">Shopee + Grab</small></div></article>
        <article class="sp-kpi expense"><div class="sp-kpi-icon">↓</div><div><span>CHI PHÍ KHÁC</span><strong id="spExpense">0 ₫</strong><small id="spExpenseCount">0 khoản</small></div></article>
        <article class="sp-kpi profit"><div class="sp-kpi-icon">✨</div><div><span>LỢI NHUẬN THỰC</span><strong id="spProfit">0 ₫</strong><small id="spMargin">Biên lợi nhuận 0%</small></div></article>
      </section>

      <section class="sp-story-grid">
        <article class="sp-story primary" id="spInsightMain"></article>
        <article class="sp-story" id="spInsightPlatform"></article>
        <article class="sp-story" id="spInsightCost"></article>
      </section>

      <section class="sp-section card">
        <div class="sp-section-head"><div><span>DIỄN BIẾN DÒNG TIỀN</span><h3>Doanh thu & chi phí theo ngày</h3><p>Cột xanh là tiền thu, cột đỏ là tiền chi trong kỳ.</p></div><div class="sp-legend"><span><i class="rev"></i>Thu</span><span><i class="exp"></i>Chi</span></div></div>
        <div id="spChart" class="sp-chart"></div>
      </section>

      <section class="sp-two-col">
        <article class="sp-section card"><div class="sp-section-head"><div><span>NGUỒN ĐƠN</span><h3>Hiệu quả từng nền tảng</h3><p>So sánh tiền vào, giá vốn, phí và thực nhận.</p></div></div><div id="spSources"></div></article>
        <article class="sp-section card"><div class="sp-section-head"><div><span>CƠ CẤU LỢI NHUẬN</span><h3>Doanh thu được sử dụng ra sao?</h3><p>Tỷ trọng từng khoản trên tổng doanh thu.</p></div></div><div id="spStructure"></div></article>
      </section>

      <section class="sp-section card"><div class="sp-section-head"><div><span>MÓN BÁN</span><h3>Top món mang lại doanh thu</h3><p>Giúp bạn nhận biết món bán chạy và phần vốn đang tiêu tốn.</p></div></div><div id="spDishes"></div></section>

      <section class="sp-section card"><div class="sp-section-head"><div><span>DOANH THU</span><h3>Chi tiết từng đơn</h3><p>Mỗi đơn đọc theo một công thức: Tổng tiền → Giá vốn → Phí app → Tiền thực nhận.</p></div><strong class="sp-section-count" id="spOrderCountLabel"></strong></div><div id="spOrdersList"></div></section>

      <section class="sp-two-col">
        <article class="sp-section card"><div class="sp-section-head"><div><span>CHI PHÍ</span><h3>Chi phí theo danh mục</h3><p>Nhìn nhanh khoản nào đang chiếm nhiều nhất.</p></div></div><div id="spExpenseCats"></div></article>
        <article class="sp-section card"><div class="sp-section-head"><div><span>KIỂM TRA CHI</span><h3>Danh sách khoản chi</h3><p>Dùng để đối soát từng giao dịch.</p></div></div><div id="spExpenseList"></div></article>
      </section>

      <section class="sp-bottom-note"><div class="sp-bottom-icon">💡</div><div><b>Cách đọc lợi nhuận thực</b><span>Doanh thu − Giá vốn − Phí nền tảng − Chi phí khác = Lợi nhuận thực. Đơn Ngoài sàn không trừ phí app.</span></div></section>
    </div>`;
    document.getElementById('spPrev')?.addEventListener('click',()=>window.statisticsPrevious?.());
    document.getElementById('spNext')?.addEventListener('click',()=>window.statisticsNext?.());
  }

  function renderChart(tx){
    const c=document.getElementById('spChart'); if(!c)return;
    const map={}; tx.forEach(t=>{const d=dstr(t.date);if(!d)return;map[d] ||= {thu:0,chi:0}; if(type(t.type)==='thu')map[d].thu+=money(t.amount); else if(type(t.type)==='chi')map[d].chi+=money(t.amount);});
    const dates=Object.keys(map).sort(); if(!dates.length){c.innerHTML='<div class="sp-empty">📊 Chưa có giao dịch trong kỳ.</div>';return;}
    const max=Math.max(...dates.map(d=>Math.max(map[d].thu,map[d].chi)),1);
    c.innerHTML=dates.map(d=>{const a=map[d];const rh=a.thu/max*100,ch=a.chi/max*100;return `<div class="sp-chart-col"><div class="sp-bars"><span class="rev" style="height:${Math.max(rh,a.thu?4:0)}%" title="Thu ${fmt(a.thu)}"></span><span class="exp" style="height:${Math.max(ch,a.chi?4:0)}%" title="Chi ${fmt(a.chi)}"></span></div><small>${fmtDate(d).slice(0,5)}</small></div>`;}).join('');
  }

  function renderSources(income){
    const el=document.getElementById('spSources');if(!el)return;
    const data=['ShopeeFood','GrabFood','Ngoài sàn'].map(name=>{const rows=income.filter(t=>sourceInfo(t.source).name===name);const revenue=rows.reduce((s,t)=>s+money(t.amount),0);const cost=rows.reduce((s,t)=>s+orderCost(t),0);const fee=rows.reduce((s,t)=>s+(hasFee(t.source)?money(t.app_fee):0),0);const net=revenue-cost-fee;return {name,rows,revenue,cost,fee,net,avg:rows.length?revenue/rows.length:0};});
    el.innerHTML=data.map(x=>{const s=sourceInfo(x.name);const margin=x.revenue?x.net/x.revenue*100:0;return `<div class="sp-source-card"><div class="sp-source-head"><div><span class="sp-source-icon ${s.cls}">${s.icon}</span><b>${x.name}</b><small>${x.rows.length} đơn · TB ${fmt(x.avg)}</small></div><strong class="${x.net>=0?'pos':'neg'}">${fmt(x.net)}</strong></div><div class="sp-metric-line"><span>Doanh thu</span><b>${fmt(x.revenue)}</b></div><div class="sp-metric-line"><span>Giá vốn</span><b>− ${fmt(x.cost)}</b></div><div class="sp-metric-line"><span>Phí app</span><b>${hasFee(x.name)?'− '+fmt(x.fee):'0 ₫'}</b></div><div class="sp-progress"><span style="width:${Math.min(100,Math.max(0,margin))}%"></span></div><small class="sp-margin-note">Biên thực ${margin.toFixed(1)}%</small></div>`;}).join('');
  }

  function renderStructure(revenue,cost,fee,expense,profit){
    const el=document.getElementById('spStructure');if(!el)return;
    const rows=[['Giá vốn',cost,'cost'],['Phí nền tảng',fee,'fee'],['Chi phí khác',expense,'expense'],['Lợi nhuận thực',profit,'profit']];
    el.innerHTML=rows.map(([n,v,c])=>{const p=revenue?Math.abs(v)/revenue*100:0;return `<div class="sp-structure-row"><div><span>${esc(n)}</span><b>${fmt(v)}</b></div><div class="sp-progress ${c}"><span style="width:${Math.min(100,p)}%"></span></div><small>${p.toFixed(1)}% doanh thu</small></div>`;}).join('');
  }

  function renderDishes(income){
    const el=document.getElementById('spDishes');if(!el)return;
    const map={}; income.forEach(t=>{parseItems(t).forEach(it=>{const name=String(it.dish_name||'Món'); const qty=Math.max(1,Number(it.qty)||1); let unit=money(it.unit_cost); if(!unit && Array.isArray(getState()?.dishes)){const d=getState().dishes.find(x=>String(x.id)===String(it.dish_id)); if(typeof window.getDishCostFromDish==='function')unit=money(window.getDishCostFromDish(d));} const revShare=qty ? (money(t.amount)/Math.max(1,parseItems(t).reduce((s,x)=>s+Math.max(1,Number(x.qty)||1),0))*qty) : 0; map[name] ||= {qty:0,revenue:0,cost:0};map[name].qty+=qty;map[name].revenue+=revShare;map[name].cost+=unit*qty;});});
    const entries=Object.entries(map).sort((a,b)=>b[1].revenue-a[1].revenue);if(!entries.length){el.innerHTML='<div class="sp-empty">🍜 Chưa có dữ liệu món bán.</div>';return;}
    const max=entries[0][1].revenue||1;el.innerHTML=entries.slice(0,12).map(([name,x],i)=>{const profit=x.revenue-x.cost;return `<div class="sp-dish-row"><div class="sp-rank">${i+1}</div><div class="sp-dish-main"><div><b>${esc(name)}</b><small>${x.qty} phần</small></div><div class="sp-mini-bar"><span style="width:${Math.min(100,x.revenue/max*100)}%"></span></div></div><div class="sp-dish-money"><b>${fmt(x.revenue)}</b><small>Vốn ${fmt(x.cost)}</small></div><strong class="${profit>=0?'pos':'neg'}">${fmt(profit)}</strong></div>`;}).join('');
  }

  function renderExpenseCats(expenses){
    const el=document.getElementById('spExpenseCats');if(!el)return; const total=expenses.reduce((s,t)=>s+money(t.amount),0); const map={};expenses.forEach(t=>{const n=String(t.category_name||t.category||'Khác');map[n]=(map[n]||0)+money(t.amount);}); const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]); if(!rows.length){el.innerHTML='<div class="sp-empty">💸 Chưa có khoản chi.</div>';return;} el.innerHTML=rows.map(([n,v])=>{const p=total?v/total*100:0;return `<div class="sp-exp-cat"><div><b>${esc(n)}</b><strong>${fmt(v)}</strong></div><div class="sp-progress expense"><span style="width:${p}%"></span></div><small>${p.toFixed(1)}% tổng chi</small></div>`;}).join('');
  }
  function renderExpenseList(expenses){
    const el=document.getElementById('spExpenseList');if(!el)return; if(!expenses.length){el.innerHTML='<div class="sp-empty">🧾 Chưa có khoản chi trong kỳ.</div>';return;} const rows=[...expenses].sort((a,b)=>dstr(b.date).localeCompare(dstr(a.date))); el.innerHTML=rows.slice(0,30).map(t=>`<div class="sp-exp-row"><div><b>${esc(t.dish_name||t.name||'Khoản chi')}</b><small>${esc(t.category_name||t.category||'Khác')} · ${fmtDate(t.date)}</small></div><strong>− ${fmt(t.amount)}</strong></div>`).join('');
  }

  function renderInsights(revenue,cost,fee,expense,profit,income){
    const count=income.length, avg=count?revenue/count:0, margin=revenue?profit/revenue*100:0, costRate=revenue?cost/revenue*100:0;
    const top=[...income].sort((a,b)=>money(b.amount)-money(a.amount))[0];
    const main=`<span>🎯 KẾT QUẢ KỲ NÀY</span><b>${profit>=0?'Bạn đang có lợi nhuận':'Bạn đang âm lợi nhuận'}</b><strong class="${profit>=0?'pos':'neg'}">${fmt(profit)}</strong><small>Biên lợi nhuận thực ${margin.toFixed(1)}%. ${count?`Trung bình ${fmt(avg)} doanh thu/đơn.`:'Chưa đủ dữ liệu.'}</small>`;
    const platformRows=['ShopeeFood','GrabFood'].map(s=>{const rs=income.filter(t=>sourceInfo(t.source).name===s);return `${s}: ${fmt(rs.reduce((x,t)=>x+(hasFee(t.source)?money(t.app_fee):0),0))}`;}).join(' · ');
    const plat=`<span>💳 PHÍ NỀN TẢNG</span><b>${fmt(fee)}</b><small>${platformRows}. Đơn Ngoài sàn không bị trừ phí app.</small>`;
    const itemName=top?.dish_name||'—'; const costInsight=`<span>📦 GIÁ VỐN</span><b>${fmt(cost)}</b><small>Đang chiếm ${costRate.toFixed(1)}% doanh thu. ${top?`Đơn doanh thu cao nhất: ${esc(itemName)} – ${fmt(top.amount)}.`:''}</small>`;
    document.getElementById('spInsightMain').innerHTML=main; document.getElementById('spInsightPlatform').innerHTML=plat; document.getElementById('spInsightCost').innerHTML=costInsight;
  }

  function render(){
    ensureState();
    const page=document.getElementById('statisticsPage');if(!page)return;
    if(!page.querySelector('.sp-wrap')) renderShell();
    const dateInput=document.getElementById('spDate'); if(dateInput){ const d=getState().statisticsDate; dateInput.value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; dateInput.onchange=()=>{const ds=dateInput.value;const [y,m,d]=ds.split('-').map(Number);getState().statisticsDate=new Date(y,m-1,d,12);render();}; }
    document.querySelectorAll('.sp-tabs button').forEach(b=>{b.classList.toggle('active',b.dataset.period===getState().statisticsPeriod);b.onclick=()=>{getState().statisticsPeriod=b.dataset.period;render();};});
    const today=document.getElementById('spToday');if(today)today.onclick=()=>{const ds=todayString();const [y,m,d]=ds.split('-').map(Number);getState().statisticsDate=new Date(y,m-1,d,12);render();};
    setText('spPeriodLabel',periodLabel());
    const tx=transactionsInRange(), income=tx.filter(t=>type(t.type)==='thu'), expenses=tx.filter(t=>type(t.type)==='chi');
    const revenue=income.reduce((s,t)=>s+money(t.amount),0), cost=income.reduce((s,t)=>s+orderCost(t),0), fee=income.reduce((s,t)=>s+(hasFee(t.source)?money(t.app_fee):0),0), expense=expenses.reduce((s,t)=>s+money(t.amount),0), profit=revenue-cost-fee-expense;
    const margin=revenue?profit/revenue*100:0;
    setText('spRevenue',fmt(revenue));setText('spOrders',`${income.length} đơn`);setText('spCost',fmt(cost));setText('spCostRate',`${revenue?(cost/revenue*100).toFixed(1):'0.0'}% doanh thu`);setText('spFee',fmt(fee));setText('spFeeRate',`${income.filter(t=>hasFee(t.source)).length} đơn có phí app`);setText('spExpense',fmt(expense));setText('spExpenseCount',`${expenses.length} khoản`);setText('spProfit',fmt(profit));setText('spMargin',`Biên lợi nhuận ${margin.toFixed(1)}%`);
    const pe=document.getElementById('spProfit');if(pe)pe.className=profit>=0?'pos':'neg';
    renderInsights(revenue,cost,fee,expense,profit,income);renderChart(tx);renderSources(income);renderStructure(revenue,cost,fee,expense,profit);renderDishes(income);document.getElementById('spOrdersList').innerHTML=orderRows(income)||'<div class="sp-empty">📦 Chưa có đơn bán trong kỳ.</div>';setText('spOrderCountLabel',`${income.length} đơn`);renderExpenseCats(expenses);renderExpenseList(expenses);
  }

  window.renderStatistics = render;
  window.statisticsPrevious = function(){ensureState();const d=getState().statisticsDate;const p=getState().statisticsPeriod;if(p==='day')d.setDate(d.getDate()-1);else if(p==='week')d.setDate(d.getDate()-7);else d.setMonth(d.getMonth()-1);render();};
  window.statisticsNext = function(){ensureState();const d=getState().statisticsDate;const p=getState().statisticsPeriod;if(p==='day')d.setDate(d.getDate()+1);else if(p==='week')d.setDate(d.getDate()+7);else d.setMonth(d.getMonth()+1);render();};
  window.statisticsToday = function(){ensureState();const ds=todayString();const [y,m,d]=ds.split('-').map(Number);getState().statisticsDate=new Date(y,m-1,d,12);render();};
  window.setStatisticsPeriod = function(p){if(!['day','week','month'].includes(p))p='day';getState().statisticsPeriod=p;render();};

  document.addEventListener('DOMContentLoaded',()=>setTimeout(render,100));
})();
