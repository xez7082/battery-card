
---

# 5️⃣ Le JS final (dist/battery-card.js)

```js
/*
 ULTRA PRO Marstek / Storcube Card
  - 100% UI Configuration
  - Drag & drop
  - SOC / PWR configurable
  - Style moderne, glow et animations
*/

class MarstekStorcubeUltra extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:"open"}); }

  setConfig(config){
    this.config={batteries:[],segment_count:30,...config};
    if(!Array.isArray(this.config.batteries)) this.config.batteries=[];
  }

  set hass(hass){ this._hass=hass; this._render(); }

  _state(entity){ return this._hass?.states?.[entity]?.state; }

  _batteryHTML(b,index){
    const soc=parseFloat(this._state(b.soc))||0;
    const pwr=this._state(b.pwr)||"0";
    const segCount=b.segments||this.config.segment_count;
    const lit=Math.round((soc/100)*segCount);
    const color=soc<=20?"#ff3b30":soc<=60?"#ffd60a":"#30d158";

    let segments="";
    for(let i=0;i<segCount;i++){
      segments+=`<div class="seg ${i<lit?"on":""}" style="--c:${color};height:${b.segHeight||4}px;margin-bottom:${b.gap||2}px"></div>`;
    }

    const pos=b.pos||{x:0,y:0};
    return `<div class="battery" data-index="${index}" style="width:${b.width||140}px;height:${b.height||300}px;transform:translate(${pos.x}px,${pos.y}px)">
      <div class="segments">${segments}</div>
      <div class="text"><div class="soc">${soc}%</div><div class="pwr">${pwr} W</div></div>
    </div>`;
  }

  _render(){
    if(!this._hass||!this.config) return;
    const bats=this.config.batteries||[];
    this.shadowRoot.innerHTML=`
      <style>
        ha-card{padding:16px;}
        .wrap{position:relative;height:360px;}
        .battery{position:absolute;border-radius:20px;background:#111;cursor:grab;display:flex;flex-direction:column-reverse;}
        .segments{flex:1;display:flex;flex-direction:column-reverse;align-items:center;}
        .seg{width:80%;background:rgba(120,120,120,0.25);transition:all 0.3s;}
        .seg.on{background:var(--c);box-shadow:0 0 10px var(--c);}
        .text{position:absolute;bottom:10px;width:100%;text-align:center;color:white;}
      </style>
      <ha-card><div class="wrap">${bats.map((b,i)=>this._batteryHTML(b,i)).join("")}</div></ha-card>
    `;
    this._enableDrag();
  }

  _enableDrag(){
    const bats=this.shadowRoot.querySelectorAll(".battery");
    bats.forEach(el=>{
      let startX,startY,origX,origY;
      el.onpointerdown=e=>{
        el.setPointerCapture(e.pointerId);
        startX=e.clientX; startY=e.clientY;
        const i=+el.dataset.index;
        const pos=this.config.batteries[i]?.pos||{x:0,y:0};
        origX=pos.x; origY=pos.y;
      };
      el.onpointermove=e=>{
        if(startX==null) return;
        const dx=e.clientX-startX,dy=e.clientY-startY;
        const i=+el.dataset.index;
        if(!this.config.batteries[i]) return;
        this.config.batteries[i].pos={x:origX+dx,y:origY+dy};
        el.style.transform=`translate(${origX+dx}px,${origY+dy}px)`;
        this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this.config},bubbles:true,composed:true}));
      };
      el.onpointerup=el.onpointerleave=()=>{startX=null;};
    });
  }

  static getConfigElement(){ return document.createElement("marstek-storcube-ultra-editor"); }
}

class MarstekStorcubeUltraEditor extends HTMLElement {
  setConfig(c){ this._config=c||{batteries:[]}; if(!Array.isArray(this._config.batteries)) this._config.batteries=[]; }
  set hass(h){ this._hass=h; if(!this._rendered) this._render(); }

  _render(){
    const sensors=Object.keys(this._hass?.states||{});
    this.innerHTML=`<div style="padding:12px"><h3>Configurer les batteries</h3><button id="add">➕ Ajouter batterie</button><div id="list"></div></div>`;
    const list=this.querySelector("#list"); list.innerHTML="";
    this._config.batteries.forEach((b,i)=>{
      const row=document.createElement("div");
      row.style="border:1px solid #444;padding:10px;margin:10px 0;border-radius:8px;background:#222;color:white";
      row.innerHTML=`<h4>Batterie ${i+1}</h4>
        SOC: <select data-i="${i}" data-k="soc">${sensors.map(s=>`<option value="${s}" ${s===b.soc?"selected":""}>${s}</option>`).join("")}</select>
        PWR: <select data-i="${i}" data-k="pwr">${sensors.map(s=>`<option value="${s}" ${s===b.pwr?"selected":""}>${s}</option>`).join("")}</select>
        <br><br>
        Pos X:<input type="number" data-i="${i}" data-k="posX" value="${b.pos?.x||0}" style="width:60px">
        Pos Y:<input type="number" data-i="${i}" data-k="posY" value="${b.pos?.y||0}" style="width:60px">
        Largeur:<input type="number" data-i="${i}" data-k="width" value="${b.width||140}" style="width:60px">
        Hauteur:<input type="number" data-i="${i}" data-k="height" value="${b.height||300}" style="width:60px">
        Segments:<input type="number" data-i="${i}" data-k="segments" value="${b.segments||30}" style="width:60px">
        Gap:<input type="number" data-i="${i}" data-k="gap" value="${b.gap||2}" style="width:60px">
        Skew:<input type="number" data-i="${i}" data-k="skew" value="${b.skew||0}" style="width:60px">
        <br><br>
        <button data-del="${i}" style="background:red;color:white;border:none;padding:4px 8px;border-radius:4px">Supprimer</button>`;
      list.appendChild(row);
    });

    this.querySelectorAll("select").forEach(s=>{ s.onchange=e=>{ const i=e.target.dataset.i,k=e.target.dataset.k; this._config.batteries[i][k]=e.target.value; this._emit(); }; });
    this.querySelectorAll("input").forEach(inp=>{ inp.oninput=e=>{ const i=e.target.dataset.i,k=e.target.dataset.k,val=parseFloat(e.target.value)||0; if(k==="posX"||k==="posY"){this._config.batteries[i].pos=this._config.batteries[i].pos||{x:0,y:0}; this._config.batteries[i].pos[k==="posX"?"x":"y"]=val;} else this._config.batteries[i][k]=val; this._emit(); }; });
    this.querySelectorAll("[data-del]").forEach(btn=>{ btn.onclick=e=>{ const i=e.target.dataset.del; if(i>=0){this._config.batteries.splice(i,1); this._emit(); this._render();} }; });
    this.querySelector("#add").onclick=()=>{ if(!sensors.length) return; this._config.batteries.push({soc:sensors[0],pwr:sensors[1]||sensors[0],pos:{x:0,y:0},width:140,height:300,segments:30,gap:2,skew:0}); this._emit(); this._render(); };
    this._rendered=true;
  }

  _emit(){ this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:true,composed:true})); }
}

// Définition custom elements
customElements.define("marstek-storcube-ultra", MarstekStorcubeUltra);
customElements.define("marstek-storcube-ultra-editor", MarstekStorcubeUltraEditor);

// Déclaration HACS
window.customCards=window.customCards||[];
window.customCards.push({type:"marstek-storcube-ultra",name:"⚡ Marstek Storcube ULTRA",preview:true});

