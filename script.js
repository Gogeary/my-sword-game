/* =========================================
   1. 초기 데이터 및 설정
   ========================================= */
const SAVE_KEY = 'swordRPG_vx_x';
let data = {
    level: 1, exp: 0, gold: 10000, hp: 100,
    potions: 0, potionCount: 0,
    equipment: { weapon: null, armor: null, belt: null },
    inventory: [],
    scrolls: { item1: 0, item2: 0, item3: 0 },
    mineGrid: [], currentMineTier: -1
};

/* 수치 공식 */
const getBaseAtk = lv => 10 + 0.5 * Math.pow(lv - 1, 1.2);
const getBaseDef = lv => 2 + 0.1 * Math.pow(lv - 1, 1.1);
const getBaseMaxHP = lv => 100 + 5 * Math.pow(lv - 1, 1.3);
const getNextExp = lv => lv * 100 * 1.4;

const getFinalStats = () => {
    let bAtk = getBaseAtk(data.level);
    let bDef = getBaseDef(data.level);
    let bHP = getBaseMaxHP(data.level);

    let finalAtk = bAtk;
    let finalDef = bDef;
    let finalHP = bHP;

    if(data.equipment.weapon) {
        const it = data.equipment.weapon;
        finalAtk = bAtk * it.k * (1 + 0.2 * Math.pow(it.en, 1.1));
    }
    if(data.equipment.armor) {
        const it = data.equipment.armor;
        finalDef = bDef * it.k * (1 + 0.5 * it.en);
    }
    if(data.equipment.belt) {
        const it = data.equipment.belt;
        finalHP = bHP * it.k * (1 + 0.1 * Math.pow(it.en, 1.25));
    }
    return { atk: finalAtk, def: finalDef, hp: finalHP };
};

/* DB 데이터 */
const EQUIP_DB = [
    { lv: 1, name: '나무 검', k: 1.1, p: 1000, type: 'weapon', img: 'wood_sword.png' },
    { lv: 1, name: '헐거운 옷', k: 1.0, p: 1000, type: 'armor', img: 'loose_clothes.png' },
    { lv: 1, name: '낡은 벨트', k: 1.0, p: 1000, type: 'belt', img: 'old_belt.png' },
    { lv: 5, name: '낡은 검', k: 1.2, p: 10000, type: 'weapon' },
    { lv: 5, name: '천 옷', k: 1.1, p: 10000, type: 'armor' },
    { lv: 5, name: '천 벨트', k: 1.2, p: 10000, type: 'belt' },
    { lv: 10, name: '철 검', k: 1.4, p: 100000, type: 'weapon' },
    { lv: 10, name: '질긴 옷', k: 1.3, p: 100000, type: 'armor' },
    { lv: 10, name: '질긴 벨트', k: 1.5, p: 100000, type: 'belt' },
    { lv: 15, name: '강철 검', k: 1.7, p: 500000, type: 'weapon' },
    { lv: 15, name: '가죽 옷', k: 1.6, p: 500000, type: 'armor' },
    { lv: 15, name: '가죽 벨트', k: 1.9, p: 500000, type: 'belt' },
    { lv: 20, name: '연마된 강철 검', k: 2.1, p: 1500000, type: 'weapon' },
    { lv: 20, name: '강화 가죽 옷', k: 2.0, p: 1500000, type: 'armor' },
    { lv: 20, name: '강화 가죽 벨트', k: 2.5, p: 1500000, type: 'belt' },
    { lv: 25, name: '은빛 강철 검', k: 2.7, p: 3500000, type: 'weapon' },
    { lv: 25, name: '비늘 갑옷', k: 2.5, p: 3500000, type: 'armor' },
    { lv: 25, name: '금속 장식 벨트', k: 3.3, p: 3500000, type: 'belt' },
    { lv: 30, name: '은 검', k: 3.5, p: 8000000, type: 'weapon' },
    { lv: 30, name: '강철 갑옷', k: 3.2, p: 8000000, type: 'armor' },
    { lv: 30, name: '용병 벨트', k: 4.5, p: 8000000, type: 'belt' }
];

const MON_STAGES = [
    { lv: 1, hp: 280, atk: 25, def: 5, gold: 100, exp: 10 },
    { lv: 5, hp: 380, atk: 35, def: 8, gold: 1000, exp: 50 },
    { lv: 10, hp: 650, atk: 55, def: 15, gold: 7000, exp: 100 },
    { lv: 15, hp: 1200, atk: 95, def: 30, gold: 10000, exp: 150 },
    { lv: 20, hp: 2200, atk: 160, def: 55, gold: 15000, exp: 200 },
    { lv: 25, hp: 4200, atk: 300, def: 100, gold: 30000, exp: 300 },
    { lv: 30, hp: 7500, atk: 550, def: 180, gold: 50000, exp: 500 }
];

const MINE_DATA = [
    { name: '고갈된 광산', p: 1000, rates: [0.4, 0.4, 0.2, 0, 0, 0] },
    { name: '무너진 광산', p: 10000, rates: [0.4, 0.2, 0.3, 0.1, 0, 0] },
    { name: '빛나는 광산', p: 100000, rates: [0.4, 0.1, 0.2, 0.25, 0.05, 0] },
    { name: '찬란한 광산', p: 500000, rates: [0.39, 0.1, 0.15, 0.2, 0.15, 0.01] }
];

const ORE_INFO = [
    { n: '빈공간', v: 0, s: '' },
    { n: '돌', v: 1000, s: '🪨' },
    { n: '구리', v: 2000, s: '🥉' },
    { n: '은', v: 20000, s: '🥈' },
    { n: '금', v: 100000, s: '🥇' },
    { n: '다이아몬드', v: 2000000, s: '💎' }
];

/* =========================================
   2. UI 핸들링 함수
   ========================================= */
const updateUI = () => {
    const stats = getFinalStats();
    document.getElementById('gold').innerText = Math.floor(data.gold).toLocaleString();
    document.getElementById('potion-total').innerText = Math.floor(data.potions).toLocaleString();
    document.getElementById('potion-count').innerText = data.potionCount;
    
    document.getElementById('hp-val').innerText = Math.floor(data.hp).toLocaleString();
    document.getElementById('hp-max').innerText = Math.floor(stats.hp).toLocaleString();
    document.getElementById('hp-fill').style.width = (data.hp / stats.hp * 100) + '%';
    
    document.getElementById('user-lv').innerText = data.level;
    document.getElementById('exp-val').innerText = Math.floor(data.exp).toLocaleString();
    const nextExp = getNextExp(data.level);
    document.getElementById('exp-next').innerText = Math.floor(nextExp).toLocaleString();
    document.getElementById('exp-fill').style.width = (data.exp / nextExp * 100) + '%';
    
    document.getElementById('info-atk').innerText = Math.floor(stats.atk).toLocaleString();
    document.getElementById('info-def').innerText = Math.floor(stats.def).toLocaleString();
    document.getElementById('info-hp').innerText = Math.floor(stats.hp).toLocaleString();

    document.getElementById('inv-scroll-1').innerText = data.scrolls.item1;
    document.getElementById('inv-scroll-2').innerText = data.scrolls.item2;
    document.getElementById('inv-scroll-3').innerText = data.scrolls.item3;

    document.getElementById('emergency-btn').style.display = 
        (data.gold < 1000 && data.inventory.length === 0 && !data.equipment.weapon) ? 'block' : 'none';
    
    renderInventory();
    save();
};

const showPage = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

const addLog = (m, c) => {
    const log = document.getElementById('log-container');
    log.innerHTML = `<div style="color:${c || '#95a5a6'}">> ${m}</div>` + log.innerHTML;
};

/* =========================================
   3. 인벤토리 및 장비 관리
   ========================================= */
const renderInventory = () => {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    data.inventory.forEach((it, idx) => {
        const isEquipped = (data.equipment[it.type] && data.equipment[it.type].id === it.id);
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div style="flex:1;">
                <strong>${it.name} +${it.en}</strong> ${isEquipped ? '[장착중]' : ''}<br>
                <small>${it.type} (상수: ${it.k})</small>
            </div>
            <button class="item-btn" style="background:var(--hunt);" onclick="equipItem(${idx})">${isEquipped ? '해제' : '장착'}</button>
            <button class="item-btn" style="background:#c0392b;" onclick="sellItem(${idx})">판매</button>
        `;
        list.appendChild(card);
    });
};

const equipItem = (idx) => {
    const it = data.inventory[idx];
    const type = it.type;
    if(data.equipment[type] && data.equipment[type].id === it.id) {
        data.equipment[type] = null;
    } else {
        data.equipment[type] = it;
    }
    const newStats = getFinalStats();
    if(data.hp > newStats.hp) data.hp = newStats.hp;
    updateUI();
};

const sellItem = (idx) => {
    const it = data.inventory[idx];
    data.gold += Math.floor(it.p * 0.5);
    if(data.equipment[it.type] && data.equipment[it.type].id === it.id) data.equipment[it.type] = null;
    data.inventory.splice(idx, 1);
    updateUI();
};

/* =========================================
   4. 상점 및 소비 아이템
   ========================================= */
const openShop = (cat) => {
    showPage('page-shop-detail');
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    if(cat === 'equip') {
        document.getElementById('shop-title').innerText = '장비 상점';
        EQUIP_DB.forEach(proto => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div style="flex:1;"><strong>${proto.name}</strong> (Lv.${proto.lv})<br>가격: ${proto.p.toLocaleString()}G</div>
                <button class="item-btn" style="background:var(--money); color:black;" onclick="buyEquip(${JSON.stringify(proto).replace(/"/g, '&quot;')})">구매</button>
            `;
            list.appendChild(card);
        });
    } else {
        document.getElementById('shop-title').innerText = '소비 상점';
        const potTiers = [
            { n:'최하급', r:100, p:2000 }, { n:'하급', r:1000, p:20000 },
            { n:'중급', r:5000, p:100000 }, { n:'상급', r:10000, p:200000 }, { n:'최상급', r:50000, p:1000000 }
        ];
        potTiers.forEach(p => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `<div><strong>${p.n}</strong> 회복: ${p.r.toLocaleString()}<br>${p.p.toLocaleString()}G</div>
            <button class="item-btn" style="background:var(--mine); color:black;" onclick="buyPotion(${p.r}, ${p.p})">구매</button>`;
            list.appendChild(card);
        });
        const scrolls = [{ n:'하급 방지권', t:1, p:100000 }, { n:'중급 방지권', t:2, p:500000 }, { n:'상급 방지권', t:3, p:2000000 }];
        scrolls.forEach(s => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `<div><strong>${s.n}</strong><br>${s.p.toLocaleString()}G</div>
            <button class="item-btn" style="background:var(--hunt);" onclick="buyScroll(${s.t}, ${s.p})">구매</button>`;
            list.appendChild(card);
        });
    }
};

const buyEquip = (proto) => {
    if(data.gold < proto.p) return alert('골드 부족!');
    data.gold -= proto.p;
    data.inventory.push({ ...proto, en: 0, id: Date.now() + Math.random() });
    updateUI();
};

const buyPotion = (rec, price) => {
    if(data.gold < price) return alert('골드 부족!');
    if(data.potionCount >= 10) return alert('물약 최대 소지량(10개) 초과!');
    data.gold -= price;
    data.potions += rec; data.potionCount++;
    updateUI();
};

const buyScroll = (tier, price) => {
    if(data.gold < price) return alert('골드 부족!');
    data.gold -= price;
    data.scrolls['item'+tier]++;
    updateUI();
};

/* =========================================
   5. 강화 시스템
   ========================================= */
let upIdx = -1;
let autoTimer = null;

const openInventoryModal = () => {
    document.getElementById('inv-modal').style.display = 'block';
    const list = document.getElementById('modal-item-list');
    list.innerHTML = '';
    data.inventory.forEach((it, idx) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `<div><strong>${it.name} +${it.en}</strong></div><button class="item-btn" style="background:var(--hunt);" onclick="selectUpgrade(${idx})">선택</button>`;
        list.appendChild(card);
    });
};

const closeModal = () => document.getElementById('inv-modal').style.display = 'none';

const selectUpgrade = (idx) => {
    upIdx = idx;
    const it = data.inventory[idx];
    document.getElementById('upgrade-target-display').innerHTML = `<strong>${it.name} +${it.en}</strong> <button onclick="sellFromUp()" style="width:60px; font-size:0.75em; background:#c0392b; margin-left:10px;">판매</button>`;
    
    const cost = Math.floor(it.p * 0.5 * Math.pow(1.5, it.en));
    document.getElementById('btn-up-exec').innerText = `강화하기 (${cost.toLocaleString()}G)`;
    document.getElementById('btn-up-exec').disabled = false;

    const sc = it.en < 3 ? 100 : it.en < 6 ? 85 : it.en < 9 ? 60 : 40;
    const bc = it.en >= 10 ? Math.min(50, 5 + (it.en - 10) * 5) : 0;
    document.getElementById('up-chance').innerText = sc;
    document.getElementById('up-break').innerText = bc;
    closeModal();
};

const tryUpgrade = () => {
    if(upIdx === -1) return;
    const it = data.inventory[upIdx];
    const cost = Math.floor(it.p * 0.5 * Math.pow(1.5, it.en));
    if(data.gold < cost) { stopAuto(); return alert('골드 부족!'); }

    const sel = document.querySelector('input[name="prot"]:checked').value;
    if(sel !== '0') {
        if(data.scrolls['item'+sel] > 0) data.scrolls['item'+sel]--;
        else { stopAuto(); return alert('방지권 부족!'); }
    }

    data.gold -= cost;
    const sc = it.en < 3 ? 100 : it.en < 6 ? 85 : it.en < 9 ? 60 : 40;
    const bc = it.en >= 10 ? Math.min(50, 5 + (it.en - 10) * 5) : 0;

    if(Math.random()*100 < sc) {
        it.en++; addLog(`성공! +${it.en}`, 'var(--mine)');
    } else {
        if(Math.random()*100 < bc && sel !== '3') {
            if(data.equipment[it.type] && data.equipment[it.type].id === it.id) data.equipment[it.type] = null;
            data.inventory.splice(upIdx, 1);
            addLog('파괴됨...', 'red'); upIdx = -1; stopAuto();
            document.getElementById('upgrade-target-display').innerText = '강화할 장비를 선택하세요.';
            document.getElementById('btn-up-exec').disabled = true;
        } else {
            it.en = Math.max(0, it.en - 1); addLog('강화 실패(하락)', '#95a5a6');
        }
    }
    updateUI();
    if(upIdx !== -1) selectUpgrade(upIdx);
};

const startAutoUpgrade = () => {
    if(autoTimer) { stopAuto(); }
    else { autoTimer = setInterval(tryUpgrade, 100); document.getElementById('auto-btn').innerText = '자동 중단'; }
};
const stopAuto = () => { clearInterval(autoTimer); autoTimer = null; document.getElementById('auto-btn').innerText = '자동 강화 (+10강)'; };
const sellFromUp = () => { if(upIdx !== -1) sellItem(upIdx); upIdx = -1; document.getElementById('upgrade-target-display').innerText = '강화할 장비를 선택하세요.'; };

/* =========================================
   6. 전투 및 사냥 시스템
   ========================================= */
const getMonsterStats = (lv) => {
    let low = MON_STAGES[0], high = MON_STAGES[MON_STAGES.length-1];
    for(let i=0; i<MON_STAGES.length-1; i++) {
        if(lv >= MON_STAGES[i].lv && lv <= MON_STAGES[i+1].lv) { low = MON_STAGES[i]; high = MON_STAGES[i+1]; break; }
    }
    const r = (lv - low.lv) / (high.lv - low.lv || 1);
    const lerp = (a, b) => a + (b - a) * r;
    return { lv, hp: lerp(low.hp, high.hp), atk: lerp(low.atk, high.atk), def: lerp(low.def, high.def), gold: lerp(low.gold, high.gold), exp: lerp(low.exp, high.exp) };
};

const scanHunt = () => {
    const grid = document.getElementById('hunt-grid');
    grid.innerHTML = '';
    for(let i=0; i<5; i++) {
        const lv = Math.max(1, data.level + Math.floor(Math.random()*11) - 5);
        const m = getMonsterStats(lv);
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.innerHTML = `👾<span class="monster-lv">Lv.${lv}</span>`;
        cell.onclick = () => startBattle(m);
        grid.appendChild(cell);
    }
};

const startBattle = (m) => {
    if(data.hp <= 0) return alert('치료소에서 회복이 필요합니다!');
    const log = document.getElementById('battle-log');
    log.innerHTML = `Lv.${m.lv} 몬스터 조우!<br>`;
    const pStats = getFinalStats();
    let mHP = m.hp;

    const bItv = setInterval(() => {
        const calcDmg = (a, d) => (a >= d) ? (a * 2 - d) : (Math.pow(a, 2) / d);
        
        // 내 공격
        const pDmg = Math.floor(calcDmg(pStats.atk, m.def));
        mHP -= pDmg;
        log.innerHTML = `유저는 공격했다. ${pDmg}의 데미지 (남은 적 체력 : ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;
        
        if(mHP <= 0) {
            clearInterval(bItv);
            data.gold += m.gold; data.exp += m.exp;
            log.innerHTML = `<span style="color:var(--money)">승리! +${Math.floor(m.gold)}G, +${Math.floor(m.exp)}EXP</span><br>` + log.innerHTML;
            checkLevelUp(); updateUI(); return;
        }

        // 적 공격
        let mDmg = Math.floor(calcDmg(m.atk, pStats.def));
        data.hp -= mDmg;
        // 포션 자동 회복
        if(data.potions > 0) {
            const h = Math.min(mDmg, data.potions);
            data.hp += h; data.potions -= h;
            if(data.potions <= 0) data.potionCount = 0;
        }
        log.innerHTML = `공격받았다. ${mDmg}의 데미지 (남은 체력 : ${Math.max(0, Math.floor(data.hp))}) [물약:${Math.floor(data.potions)}]<br>` + log.innerHTML;
        
        if(data.hp <= 0) {
            clearInterval(bItv); data.hp = 0;
            log.innerHTML = `<span style="color:red">패배... 마을 귀환</span><br>` + log.innerHTML;
            updateUI();
        }
    }, 100);
};

const checkLevelUp = () => {
    while(data.exp >= getNextExp(data.level)) {
        data.exp -= getNextExp(data.level);
        data.level++; alert(`레벨업! Lv.${data.level}`);
    }
};

/* =========================================
   7. 광산 시스템
   ========================================= */
const enterMine = (tier) => {
    const cost = MINE_DATA[tier].p;
    if(data.gold < cost) return alert('골드 부족!');
    data.gold -= cost; data.currentMineTier = tier;
    generateMine(); showPage('page-mine-play'); updateUI();
};

const generateMine = () => {
    const rates = MINE_DATA[data.currentMineTier].rates;
    data.mineGrid = [];
    for(let i=0; i<16; i++) {
        const r = Math.random(); let acc = 0; let type = 0;
        for(let j=0; j<rates.length; j++) { acc += rates[j]; if(r < acc) { type = j; break; } }
        data.mineGrid.push(type);
    }
    renderMine();
};

const renderMine = () => {
    const grid = document.getElementById('mine-grid');
    grid.innerHTML = ''; let hasOre = false;
    data.mineGrid.forEach((idx, i) => {
        const cell = document.createElement('div'); cell.className = 'cell';
        cell.innerText = ORE_INFO[idx].s;
        if(idx > 0) {
            hasOre = true;
            cell.onclick = () => { data.gold += ORE_INFO[idx].v; data.mineGrid[i] = 0; renderMine(); updateUI(); };
        }
        grid.appendChild(cell);
    });
    document.getElementById('mine-refresh').style.display = hasOre ? 'none' : 'block';
};

const refreshMine = () => { enterMine(data.currentMineTier); };

/* =========================================
   8. 시스템 기능
   ========================================= */
const save = () => localStorage.setItem(SAVE_KEY, JSON.stringify(data));
const load = () => { const s = localStorage.getItem(SAVE_KEY); if(s) data = JSON.parse(s); };
const fullHeal = () => { data.hp = getFinalStats().hp; updateUI(); alert('회복 완료!'); };
const getEmergencyMoney = () => { data.gold += 1000; updateUI(); alert('구제금 지급!'); };

load();
updateUI();
</script>
</body>
</html>