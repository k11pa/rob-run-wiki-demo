/* ROB RUN Wiki · demo 0.1 — renders sections and item pages from data/items.js */
const DATA=window.WIKI_DATA;
const R=new Map(DATA.rarities.map(r=>[r.id,r]));
const IT=new Map(DATA.items.map(i=>[i.id,i]));
const fmt=n=>n==null?'—':Number(n).toLocaleString('ru-RU');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rar=id=>R.get(id)||{name:'',color:'#9a9894'};
let cur={cat:'all',item:null};
function nav(){
  const n=document.getElementById('nav');
  const all=`<button data-cat="all" aria-current="${cur.cat==='all'&&!cur.item}">Все предметы<span>${DATA.total}</span></button>`;
  n.innerHTML=all+DATA.cats.map(c=>`<button data-cat="${c.k}" aria-current="${cur.cat===c.k}">${esc(c.n)}<span>${c.count}</span></button>`).join('');
  document.getElementById('note').innerHTML=`<b>Это пример.</b> Заполнено 10 из ${DATA.total} предметов, по одному-два в разделе. В вики попадают только предметы, у которых есть применение или другой способ получения: покупка, бартер, крафт, база. Предметы «только для продажи», которые лежат в открытом мире, исключены (${DATA.all-DATA.total-1} шт.).`;
}
function mini(id,label){const n=DATA.names[id];if(!n)return '';const r=rar(n.rarity);const go=IT.has(id)?` data-go="${id}"`:'';return `<button class="mini" style="--rare:${r.color}"${go} title="${esc(n.name)}"><img src="${DATA.icons[id]||''}" alt=""><span>${esc(label||n.name)}</span></button>`;}
function list(){
  const cat=DATA.cats.find(c=>c.k===cur.cat);
  const items=DATA.items.filter(i=>cur.cat==='all'||i.cat===cur.cat);
  const tiles=items.map(i=>{const r=rar(i.rarity);return `<button class="tile" data-go="${i.id}" style="--rare:${r.color}"><div class="pic"><img src="${DATA.icons[i.id]}" alt=""></div><strong>${esc(i.name)}</strong><span class="rar">${esc(r.name)}</span><small>${esc(i.type)}</small></button>`;}).join('');
  const missing=cat?Math.max(0,cat.count-items.length):0;
  document.getElementById('main').innerHTML=`<div class="eyebrow">${cat?'Раздел':'Каталог'}</div><h1>${esc(cat?cat.n:'Все предметы')}</h1><p class="lead">${cat?`В разделе ${cat.count} предметов. В примере заполнено ${items.length}.`:'Оружие, боеприпасы, снаряжение, ключи, предметы для бартера и всё для базы. Нажмите на предмет, чтобы открыть его страницу.'}</p><div class="grid">${tiles}${missing?`<div class="placeholder">Ещё ${missing} предметов этого раздела появятся в полной версии</div>`:''}</div>`;
}
function page(i){
  const r=rar(i.rarity),cat=DATA.cats.find(c=>c.k===i.cat);
  const chips=[`Тип: <b>${esc(i.type)}</b>`,`Размер: <b>${i.cells.join(' × ')}</b>`,`В стопке: <b>${fmt(i.stack)}</b>`].map(c=>`<span class="chip">${c}</span>`).join('');
  let stats='';
  if(i.weapon){const w=i.weapon;const cell=(l,v,u,p)=>`<div class="stat"><span>${l}</span><b>${v}</b>${u?`<em>${u}</em>`:''}${p!=null?`<div class="bar"><i style="width:${Math.min(100,p)}%"></i></div>`:''}</div>`;
    stats=`<section class="sec"><h2>Характеристики</h2><div class="stats">${cell('Урон',w.damage,'',w.damage/30*100)}${cell('В голову','×'+w.head,`= ${Math.round(w.damage*w.head)}`)}${cell('Скорострельность',fmt(w.rpm),'выстр/мин',w.rpm/1000*100)}${cell('Магазин',w.mag,'патронов',w.mag/100*100)}${cell('Дальность полного урона',w.range,'м',w.range/100*100)}${cell('Перезарядка',w.reload.toFixed(1),`с (быстрая ${w.reloadMin.toFixed(1)} с)`)}${cell('Прицеливание',w.aim.toFixed(2),'с')}${cell('Доставание',w.draw.toFixed(2),'с')}${cell('Режим огня',w.auto?'Авто':'Одиночный','')}</div><div style="margin-top:12px"><div class="navlabel" style="margin-bottom:6px">Патроны</div><div class="minis">${mini(w.ammo)}</div></div></section>`;}
  if(i.armor){stats=`<section class="sec"><h2>Характеристики</h2><div class="stats"><div class="stat"><span>Сегменты брони</span><b>${i.armor.segments}</b><div class="bar"><i style="width:${i.armor.segments/4*100}%"></i></div></div></div><p class="meta" style="margin-top:10px">Остальные параметры защиты в базе пока не расшифрованы.</p></section>`;}
  const mults=[1,1.1,1.2,1.35,1.5];
  const econ=`<section class="sec"><h2>Экономика</h2><table><tr><th>Показатель</th><th>Наличные</th></tr><tr><td>Базовая цена</td><td>${fmt(i.price)}</td></tr>${i.sell?mults.map((m,n)=>`<tr><td>Продажа скупщику, ур. ${n+1}${n?` (+${Math.round((m-1)*100)}%)`:''}</td><td>${fmt(Math.round(i.sell*m))}</td></tr>`).join(''):''}</table></section>`;
  const ways=[];
  for(const b of i.buy){const cost=b.unlock.map(e=>`${fmt(e.n)} ${e.id==='cash_1'?'наличных':esc(DATA.names[e.id]?.name||e.id)}`).join(' + ');
    ways.push(`<div class="way"><b>Покупка · ${esc(b.vendor)}</b><p>${b.mod>1?`Цена ×${b.mod} от базовой (${fmt(i.price*b.mod)}).`:`Цена ${fmt(i.price)}.`}${b.role?' Доступно только определённой роли.':''}${b.tier?` Ветка торговли, уровень ${b.tier}.`:''}</p>${cost?`<p>Открыть в дереве торговли: ${cost}.</p>`:''}</div>`);}
  for(const f of i.fills)ways.push(`<div class="way"><b>Заполнение · до ${f.max} очков</b><p>${esc(f.action)} Полный вариант:</p><div class="minis">${mini(f.result)}</div><p>Компьютеры есть в локациях:</p><div class="tags">${f.places.map(p=>`<span>${esc(p)}</span>`).join('')}</div></div>`);
  if(i.cat==='keys'&&!i.buy.length)ways.push(`<div class="way"><b>Находка</b><p>Выпадает в мире. Точный источник и шанс в базе пока не указаны.</p></div>`);
  if(i.weapon&&!i.buy.length)ways.push(`<div class="way"><b>Находка</b><p>Встречается в наборах случайного оружейного лута. Покупка у торговцев в базе не найдена.</p></div>`);
  const uses=[];
  if(i.ammoFor)uses.push(`<div class="way"><b>Подходит для оружия · ${i.ammoFor.length}</b><div class="minis">${i.ammoFor.map(id=>mini(id)).join('')}</div></div>`);
  if(i.doors.length)uses.push(`<div class="way"><b>Открывает дверь</b><p>Закрытая комната: ${i.doors.map(esc).join(', ')}.</p></div>`);
  if(i.containers)uses.push(`<div class="way"><b>Вскрывает сейфы · ${i.containers}</b><p>Большие сейфы в закрытых комнатах. Один мини-бур на один сейф.</p><div class="tags">${i.containerPlaces.map(p=>`<span>${esc(p)}</span>`).join('')}</div></div>`);
  for(const rc of i.usedIn)uses.push(`<div class="way"><b>Бартер · секретная дверь в хабе</b><div class="recipe">${rc.ingredients.map(e=>mini(e.id,(e.id==='cash_1'?fmt(e.amount)+' наличных':DATA.names[e.id]?.name+(e.amount>1?' ×'+e.amount:'')))).join('')}<span class="arrow">→</span>${mini(rc.result)}</div></div>`);
  if(i.cat==='base')uses.push(`<div class="way"><b>Ставится на базе</b><p>Постройка для участка игрока. Что именно она производит и с какой скоростью, в базе пока не указано.</p></div>`);
  if(i.cat==='upgrades')uses.push(`<div class="way"><b>Улучшение стола для отмывки</b><p>Ставится на стол для отмывки. Величина ускорения в базе пока не указана.</p></div>`);
  if(i.cat==='meds'||i.cat==='grenades')uses.push(`<div class="way"><b>Используется в бою</b><p>${esc(i.desc)}</p></div>`);
  document.getElementById('main').innerHTML=`<button class="back" data-cat="${i.cat}">← ${esc(cat?.n||'Все предметы')}</button>
  <div class="hero" style="--rare:${r.color}"><div class="pic"><img src="${DATA.icons[i.id]}" alt="${esc(i.name)}"></div><div><div class="eyebrow">${esc(cat?.n||'')}</div><h1>${esc(i.name)}</h1><span class="rar" style="--rare:${r.color}">${esc(r.name)}</span><p class="lead" style="margin-top:12px">${esc(i.desc)}</p><div class="chips">${chips}</div></div></div>
  <div style="display:flex;flex-direction:column;gap:18px">${stats}<div class="cols" style="${uses.length?'':'grid-template-columns:minmax(0,1fr)'}"><section class="sec"><h2>Как получить</h2><div class="src">${ways.join('')||'<p class="meta">Источник в базе пока не указан.</p>'}</div></section>${uses.length?`<section class="sec"><h2>Где используется</h2><div class="src">${uses.join('')}</div></section>`:''}</div>${econ}</div>
  <p class="meta">ID в игре: ${esc(i.id)} · Данные: база robrun_wiki, сборка 26342425</p>`;
  window.scrollTo(0,0);
}
function render(){nav();if(cur.item)page(IT.get(cur.item));else list();}
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){cur.item=g.dataset.go;cur.cat=IT.get(cur.item).cat;location.hash=cur.item.replace(/_/g,'-');render();return;}const c=e.target.closest('[data-cat]');if(c){cur={cat:c.dataset.cat,item:null};location.hash=c.dataset.cat;render();}});
function fromHash(){const h=location.hash.slice(1);const id=h.replace(/-/g,'_');if(IT.has(id))cur={cat:IT.get(id).cat,item:id};else if(DATA.cats.some(c=>c.k===h))cur={cat:h,item:null};else cur={cat:'all',item:null};render();}
addEventListener('hashchange',fromHash);fromHash();
