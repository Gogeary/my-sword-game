/* ==========================================
   [Main_Engine.js] 최종 통합 관리 시스템
   ========================================== */

var currentUser = null, data = null, upIdx = -1, autoTimer = null;
const SECRET_KEY = "my_super_secret_game_key_v1";

const MainEngine = {
    invCurrentTab: 'equip', 
    isAutoHunting: false,

    init: () => {
        if(typeof GameDatabase === 'undefined') return console.error("Database 로드 실패");
        const auto = localStorage.getItem('game_auto_user');
        if(auto) {
            const savedData = localStorage.getItem('game_users');
            const users = MainEngine.decrypt(savedData) || {};
            if(users[auto]) { 
                currentUser = auto; 
                data = users[auto].data; 
                MainEngine.enterGame(); 
            }
        }
    },

    encrypt: (dataObj) => {
        try {
            const str = JSON.stringify(dataObj);
            return CryptoJS.AES.encrypt(str, SECRET_KEY).toString();
        } catch (e) { return null; }
    },

    decrypt: (encryptedStr) => {
        try {
            if (!encryptedStr || encryptedStr === "undefined") return {};
            const bytes = CryptoJS.AES.decrypt(encryptedStr, SECRET_KEY);
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            if (!decryptedData) return JSON.parse(encryptedStr); 
            return JSON.parse(decryptedData);
        } catch (e) {
            try { return JSON.parse(encryptedStr); } catch (err) { return {}; }
        }
    },

    handleLogin: () => {
        const id = document.getElementById('login-id').value;
        const pw = document.getElementById('login-pw').value;
        if(!id || !pw) return alert("정보를 입력해주세요.");

        const savedData = localStorage.getItem('game_users');
        let users = MainEngine.decrypt(savedData) || {};

        if(users[id]) {
            if(users[id].pw !== pw) return alert("비밀번호가 틀립니다.");
            data = users[id].data;
        } else {
            // [수정] 신규 가입 시 모든 장비 부위(gloves, shoes 포함) 초기화
            data = { 
                level:1, exp:0, gold:100000, hp:100, 
                inventory:[], 
                equipment:{weapon:null, armor:null, belt:null, gloves:null, shoes:null}, 
                potionBuffer: 0, mineGrid: []
            };
            users[id] = { pw, data };
        }
        
        currentUser = id;
        if(document.getElementById('auto-login').checked) localStorage.setItem('game_auto_user', id);
        localStorage.setItem('game_users', MainEngine.encrypt(users));
        MainEngine.enterGame();
    },

    enterGame: () => {
        document.getElementById('login-container').style.display='none';
        document.getElementById('game-container').style.display='block';
        MainEngine.updateUI();
    },

    saveGame: () => {
        if(currentUser && data) {
            const savedData = localStorage.getItem('game_users');
            let users = MainEngine.decrypt(savedData) || {};
            if(!users[currentUser]) users[currentUser] = { pw: "", data: {} };
            users[currentUser].data = data;
            localStorage.setItem('game_users', MainEngine.encrypt(users));
        }
    },

    formatNumber: (num) => {
        num = Math.floor(num);
        if (num < 10000) return num.toLocaleString();
        if (num >= 1000000000000) {
            const jo = Math.floor(num / 1000000000000);
            const remain = Math.floor((num % 1000000000000) / 100000000);
            return `${jo}조` + (remain > 0 ? ` ${remain}억` : '');
        }
        if (num >= 100000000) {
            const eok = Math.floor(num / 100000000);
            const remain = Math.floor((num % 100000000) / 10000);
            return `${eok}억` + (remain > 0 ? ` ${remain}만` : '');
        }
        const man = Math.floor(num / 10000);
        const remain = num % 10000;
        return `${man}만` + (remain > 0 ? ` ${remain}` : '');
    },

    updateUI: () => {
        if(!data) return;
        const nextExp = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);
        if(data.exp >= nextExp) { MainEngine.checkLevelUp(); return; }

        const stats = MainEngine.getFinalStats();
        
        let gloveMul = 1.0;
        if (data.equipment.gloves) {
            const g = data.equipment.gloves;
            gloveMul = GameDatabase.ENHANCE_FORMULA.gloves(g.k, g.en);
        }
        const baseAtk = Math.floor(stats.atk / gloveMul);
        const infoAtk = document.getElementById('info-atk');
        if (infoAtk) {
            infoAtk.innerHTML = `<span style="color:#ddd;">${MainEngine.formatNumber(baseAtk)}</span>` + 
                (gloveMul > 1 ? ` x <span style="color:#f1c40f;">${gloveMul.toFixed(2)}</span>` : "") +
                `<br>= <span style="color:#ff5252; font-size:1.2em; font-weight:bold;">${MainEngine.formatNumber(stats.atk)}</span>`;
        }

        document.getElementById('info-def').innerText = MainEngine.formatNumber(stats.def);
        document.getElementById('info-hp').innerText = MainEngine.formatNumber(stats.hp);
        document.getElementById('gold').innerText = MainEngine.formatNumber(data.gold);
        document.getElementById('hp-val').innerText = MainEngine.formatNumber(Math.max(0, data.hp));
        document.getElementById('hp-max').innerText = MainEngine.formatNumber(stats.hp);
        document.getElementById('hp-fill').style.width = (data.hp / stats.hp * 100) + '%';
        
        const expPer = (data.exp / nextExp * 100).toFixed(1);
        document.getElementById('exp-fill').style.width = expPer + '%';
        document.getElementById('user-lv').innerText = data.level;
        document.getElementById('exp-text').innerText = `${MainEngine.formatNumber(data.exp)} / ${MainEngine.formatNumber(nextExp)} (${expPer}%)`;

        const potionItems = data.inventory.filter(it => it.type === 'potion');
        const totalCount = potionItems.reduce((acc, cur) => acc + (cur.count || 1), 0);
        const totalMaxVal = potionItems.reduce((acc, cur) => {
            const db = GameDatabase.CONSUMABLES.potions.find(p => p.id === cur.id);
            return acc + (db ? db.val * (cur.count || 1) : 0);
        }, 0);
        document.getElementById('potion-cnt').innerText = totalCount;
        document.getElementById('potion-val').innerText = MainEngine.formatNumber(Math.max(0, totalMaxVal - (data.potionBuffer || 0)));

        MainEngine.renderInventory();
        MainEngine.saveGame();
    },

    getFinalStats: () => {
        let bAtk = GameDatabase.USER_STATS.CALC_ATK(data.level);
        let bDef = GameDatabase.USER_STATS.CALC_DEF(data.level);
        let bHP = GameDatabase.USER_STATS.CALC_HP(data.level);
        let fAtk = bAtk, fDef = bDef, fHP = bHP;
        const eq = data.equipment;
        if(eq.weapon) fAtk = GameDatabase.ENHANCE_FORMULA.weapon(bAtk, eq.weapon.k, eq.weapon.en);
        if(eq.armor)  fDef = GameDatabase.ENHANCE_FORMULA.armor(bDef, eq.armor.k, eq.armor.en);
        if(eq.belt)   fHP  = GameDatabase.ENHANCE_FORMULA.belt(bHP, eq.belt.k, eq.belt.en);
        if(eq.gloves) fAtk *= GameDatabase.ENHANCE_FORMULA.gloves(eq.gloves.k, eq.gloves.en);
        return { atk: fAtk, def: fDef, hp: fHP };
    },

    addItem: (newItem) => {
        const stackableTypes = ['etc', 'potion', 'scroll', 'ticket'];
        if (stackableTypes.includes(newItem.type)) {
            const existing = data.inventory.find(i => i.type === newItem.type && i.id === newItem.id);
            if (existing) existing.count = (existing.count || 1) + (newItem.count || 1);
            else data.inventory.push({ ...newItem, count: newItem.count || 1 });
        } else {
            data.inventory.push({ ...newItem, en: newItem.en || 0, uid: Date.now() + Math.random() });
        }
        MainEngine.updateUI();
    },

    setInvTab: (tab) => { MainEngine.invCurrentTab = tab; MainEngine.renderInventory(); },

    renderInventory: () => {
        const invList = document.getElementById('inventory-list');
        const eqList = document.getElementById('equipped-list');
        if (!invList || !eqList) return;
        invList.innerHTML = ''; eqList.innerHTML = '';

        data.inventory.forEach((it, idx) => {
            // [중요] uid 기반 정밀 비교
            const isEquipped = data.equipment[it.type] && data.equipment[it.type].uid === it.uid;
            
            let category = (['weapon','armor','belt','gloves','shoes'].includes(it.type)) ? 'equip' : 
                           (['potion','ticket','scroll'].includes(it.type)) ? 'consume' : 'etc';

            const html = MainEngine.createItemHTML(it, idx, isEquipped);
            if (isEquipped) eqList.appendChild(html);
            else if (MainEngine.invCurrentTab === category) invList.appendChild(html);
        });
    },

    /* Main_Engine.js 내 createItemHTML 함수 수정 */
    createItemHTML: (it, idx, isEquipped) => {
        const div = document.createElement('div');
        div.className = 'item-card';
        if (isEquipped) div.style.border = '2px solid #2ecc71';

        // 이미지 로드 실패 시 📦 아이콘으로 대체
        const imgTag = it.img ? 
            `<img src="image/${it.img}" class="item-icon" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'item-icon\'>📦</div>';">` 
            : '<div class="item-icon">📦</div>';

        const type = (it.type || "").toLowerCase();
        const isGear = ['weapon', 'armor', 'belt', 'gloves', 'shoes'].includes(type);
        const isConsumable = ['potion', 'scroll', 'ticket'].includes(type);
        const isGem = (type === 'etc'); // 보석(재료) 타입

        let subText = it.info || "";
        if (isGear) {
            subText = `<span style="color:#f1c40f;">능력치 배율: x${it.k.toFixed(2)}</span>`;
        }

        // [버튼 로직 수정]
        let actionButtons = '';
        
        if (isGem || isConsumable) {
            // 보석이나 소비 아이템은 '판매' 버튼만 표시
            actionButtons = `<button class="item-btn" style="background:#c0392b;" onclick="MainEngine.confirmSell(${idx})">판매</button>`;
        } else if (isGear) {
            // 장비류만 '강화', '장착/해제', '판매' 버튼 표시
            actionButtons = `
                <button class="item-btn" onclick="MainEngine.goToUpgrade(${idx})">강화</button>
                <button class="item-btn" onclick="MainEngine.toggleEquip(${idx})">${isEquipped ? '해제' : '장착'}</button>
                ${!isEquipped ? `<button class="item-btn" style="background:#c0392b;" onclick="MainEngine.confirmSell(${idx})">판매</button>` : ''}
            `;
        }

        div.innerHTML = `
            <div class="item-icon-container" style="width:50px; height:50px; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                ${imgTag}
            </div>
            <div class="item-info">
                <strong>${it.name} ${it.en > 0 ? '+'+it.en : ''}</strong>${it.count > 1 ? ` (x${it.count})` : ""}<br>
                <small>${subText}</small>
            </div>
            <div class="item-actions">
                ${actionButtons}
            </div>
        `;
        return div;
    },

    toggleEquip: (idx) => {
        const it = data.inventory[idx];
        if (!it) return;
        if (!data.equipment) data.equipment = {};
        
        const isAlreadyEquipped = data.equipment[it.type] && data.equipment[it.type].uid === it.uid;
        if (isAlreadyEquipped) data.equipment[it.type] = null;
        else data.equipment[it.type] = it;
        
        MainEngine.updateUI();
    },

    /* Main_Engine.js 내 openInventoryModal 함수 내부 수정 */
    openInventoryModal: (mode = 'normal') => {
    const modal = document.getElementById('modal-inventory');
    const list = document.getElementById('modal-item-list');
    if (!modal || !list) return;

    list.innerHTML = '';
    data.inventory.forEach((item, idx) => {
        let show = true;
        if (mode === 'upgrade') {
            if (['weapon','armor','belt','gloves','shoes'].indexOf(item.type) === -1) show = false;
        } else if (mode === 'support') {
            if (item.type !== 'scroll' && item.type !== 'ticket') show = false;
        }

        if (show) {
            const div = document.createElement('div');
            div.className = 'inven-item';
            div.style.border = `2px solid ${GameDatabase.getItemRarityColor(item)}`;
            
            // 이미지 로드 실패 시 아이콘 표시 (공백 방지)
            const imgHtml = item.img ? 
                `<img src="image/${item.img}" style="width:30px; height:30px; object-fit:contain; margin-right:8px;" onerror="this.onerror=null; this.replaceWith(document.createTextNode('📦 '));">` 
                : '📦 ';

            let infoText = `<b>${item.name}</b>`;
            if (!['potion','scroll','ticket','etc'].includes(item.type)) infoText += ` (+${item.en || 0})`;
            if (item.count > 1) infoText += ` x${item.count}`;
            
            div.innerHTML = `${imgHtml}<div style="flex:1;">${infoText}</div>`;
            div.onclick = () => {
                if (mode === 'upgrade') UpgradeSystem.selectUpgrade(idx);
                else if (mode === 'support') UpgradeSystem.selectSupport(idx);
                MainEngine.closeModal();
            };
            list.appendChild(div);
        }
    });
    modal.style.display = 'flex';
},

    openBatchSell: () => {
        const modal = document.getElementById('modal-batch-sell');
        if (!modal) return;
        modal.querySelector('.modal-content').innerHTML = `
            <h3>💰 아이템 일괄 판매</h3>
            <div style="text-align:left; padding:15px; background:rgba(0,0,0,0.2); border-radius:8px;">
                <label><input type="checkbox" id="sell-no-skill"> 스킬 없는 0강 장비</label><br>
                <label><input type="checkbox" id="sell-with-skill"> 스킬 있는 0강 장비</label><br>
                <label><input type="checkbox" id="sell-gems" checked> 💎 모든 보석 판매</label>
            </div>
            <div style="margin-top:15px; display:flex; gap:10px;">
                <button class="item-btn" style="background:#27ae60; flex:1;" onclick="MainEngine.executeBatchSell()">판매 실행</button>
                <button class="item-btn" style="background:#555; flex:1;" onclick="MainEngine.closeModal()">취소</button>
            </div>
        `;
        modal.style.display = 'flex';
    },

    executeBatchSell: () => {
    // 1. HTML 체크박스 엘리먼트에서 현재 체크 상태를 명확히 가져옵니다.
    // 변수명을 아래 filter 로직과 일치시켰습니다.
    const sellNoSkill = document.getElementById('sell-no-skill')?.checked || false;
    const sellWithSkill = document.getElementById('sell-with-skill')?.checked || false;
    const sellGems = document.getElementById('sell-gems')?.checked || false;

    // 2. 판매 대상 필터링 로직
    const targets = data.inventory.filter(it => {
        // [A] 장착 중인 아이템 보호 (장착 중이면 절대 팔지 않음)
        const isEquipped = data.equipment[it.type] && 
                           (data.equipment[it.type].uid === it.uid || data.equipment[it.type].id === it.id);
        if (isEquipped) return false;

        const type = (it.type || "").toLowerCase();

        // [B] 보석 및 재료 판매 로직 (Type: 'etc' 판별)
        // 사용자님의 데이터베이스 id 101~140번 보석들이 여기에 해당합니다.
        if (type === 'etc') {
            return sellGems; // '보석 전체 판매' 체크박스가 켜져 있으면 true
        }

        // [C] 일반 장비류 판매 로직 (0강인 경우만)
        if (['weapon', 'armor', 'belt', 'gloves', 'shoes'].includes(type)) {
            if ((it.en || 0) > 0) return false; // 강화된 아이템은 보호

            const hasSkill = Array.isArray(it.skills) && it.skills.length > 0;
            if (!hasSkill && sellNoSkill) return true;  // 스킬 없는 0강 장비
            if (hasSkill && sellWithSkill) return true; // 스킬 있는 0강 장비
        }

        return false;
    });

    // 3. 판매 대상 확인
    if (targets.length === 0) {
        alert("판매할 대상이 없습니다.\n'보석(재료) 전체 판매' 체크박스를 켰는지 확인해주세요!");
        return;
    }

    // 4. 수익 계산 (원가의 50%)
    let totalGold = 0;
    targets.forEach(t => {
        const count = t.count || 1;
        totalGold += Math.floor((t.p || 0) * 0.5) * count; 
    });

    // 5. 실행 확인 및 데이터 반영
    if (confirm(`총 ${targets.length}종의 아이템을 판매하시겠습니까?\n수익: ${MainEngine.formatNumber(totalGold)} G`)) {
        // 인벤토리에서 판매된 아이템들만 제외
        data.inventory = data.inventory.filter(item => !targets.includes(item));
        
        data.gold += totalGold;
        alert(`판매 완료! ${MainEngine.formatNumber(totalGold)} G가 입금되었습니다.`);
        
        // 모달 닫기 및 화면 갱신
        MainEngine.closeModal();
        MainEngine.updateUI();
    }
},

    closeModal: () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    },

    checkLevelUp: () => {
        let leveled = false;
        let next = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);
        while(data.exp >= next) { data.exp -= next; data.level++; leveled = true; next = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level); }
        if(leveled) {
            const log = document.getElementById('battle-log');
            if(log) log.innerHTML = `<div style="color:#ffd700; font-weight:bold; border:2px solid #ffd700; padding:10px; margin:10px 0;">🎉 LEVEL UP! - Lv.${data.level} 🎉</div>` + log.innerHTML;
            data.hp = MainEngine.getFinalStats().hp;
            MainEngine.updateUI();
        }
    },

    toggleAutoHunt: () => {
        MainEngine.isAutoHunting = !MainEngine.isAutoHunting;
        const btn = document.getElementById('btn-auto-hunt');
        if(btn) {
            btn.innerText = MainEngine.isAutoHunting ? "🛑 자동 사냥 중지" : "⚔️ 무한 자동 사냥 시작";
            btn.style.background = MainEngine.isAutoHunting ? "#c0392b" : "#2ecc71";
        }
        if (MainEngine.isAutoHunting && !CombatSystem.isEncounter) CombatSystem.scanHunt();
    },

    goToUpgrade: (idx) => { showPage('page-upgrade'); UpgradeSystem.selectUpgrade(idx); },

    confirmSell: (idx) => {
        const it = data.inventory[idx];
        if (data.equipment[it.type] && data.equipment[it.type].uid === it.uid) return alert("장착 중인 아이템은 팔 수 없습니다.");
        const price = Math.floor((it.p || 0) * 0.5) * (it.count || 1);
        if(confirm(`${it.name}을(를) 판매하시겠습니까? (수익: ${MainEngine.formatNumber(price)}G)`)) {
            data.gold += price; data.inventory.splice(idx, 1); MainEngine.updateUI();
        }
    },

    begging: () => {
        const amt = Math.floor(Math.random() * 500) + 1;
        data.gold += amt; alert(`행인이 ${amt}G를 주었습니다.`); MainEngine.updateUI();
        const btn = document.getElementById('btn-beg');
        btn.disabled = true; let left = 10;
        const t = setInterval(() => {
            if(--left > 0) btn.innerText = `⏳ ${left}초...`;
            else { clearInterval(t); btn.disabled = false; btn.innerText = "🤲 동냥하기 (10초)"; }
        }, 1000);
    },

    fullHeal: () => {
        const stats = MainEngine.getFinalStats();
        const missing = stats.hp - data.hp;
        if(missing <= 0) return alert("체력이 가득 찼습니다.");
        const cost = missing * 25;
        if(confirm(`회복하시겠습니까? (비용: ${MainEngine.formatNumber(cost)}G)`)) {
            if(data.gold < cost) return alert("골드가 부족합니다.");
            data.gold -= cost; data.hp = stats.hp; MainEngine.updateUI();
        }
    }
};
// ... MainEngine = { ... } 객체가 여기서 끝남

/* --- 여기서부터는 MainEngine 바깥 (파일 하단) --- */

// 1. 페이지 이동 함수 (수정본)
function showPage(id) {
    if(typeof UpgradeSystem !== 'undefined') UpgradeSystem.stopAuto();
    if (id !== 'page-hunt-play' && typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting) {
        MainEngine.toggleAutoHunt();
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');

    // ★ 사냥터 페이지 진입 시 목록을 그립니다.
    if (id === 'page-hunt-select') {
        renderHuntingZones();
    }

    if (id === 'page-info') MainEngine.renderInventory();
    if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
}

// 2. 사냥터 목록 생성 함수 (여기에 넣으세요!)
function renderHuntingZones() {
    const list = document.getElementById('hunting-zone-list');
    if (!list) return;

    list.innerHTML = ''; // 초기화

    if (typeof GameDatabase !== 'undefined' && GameDatabase.HUNTING_ZONES) {
        GameDatabase.HUNTING_ZONES.forEach(zone => {
            const btn = document.createElement('button');
            btn.className = 'main-menu-btn';
            btn.style.background = 'var(--hunt)';
            btn.innerHTML = `🌲 ${zone.name} (Lv.${zone.minLv}~${zone.maxLv})<br>
                             <span style="font-size:0.8em; color:#f1c40f;">입장료: ${MainEngine.formatNumber(zone.cost || 0)} G</span>`;
            
            btn.onclick = () => CombatSystem.enterZone(zone.id);
            list.appendChild(btn);
        });
    }
}

const GamblingSystem = {
    init: () => {
        document.getElementById('gamble-gold-display').innerText = MainEngine.formatNumber(data.gold);
        document.getElementById('gamble-amount').value = '';
    },
    play: (type) => {
        const amt = parseInt(document.getElementById('gamble-amount').value);
        if(isNaN(amt) || amt <= 0 || data.gold < amt) return alert("금액을 확인해주세요.");
        data.gold -= amt;
        const dice = Math.floor(Math.random() * 100) + 1;
        const isOdd = dice % 2 !== 0;
        const win = (type === 'odd' && isOdd) || (type === 'even' && !isOdd);
        if(win) { data.gold += amt * 2; alert(`승리! (주사위: ${dice})`); }
        else { alert(`패배... (주사위: ${dice})`); }
        GamblingSystem.init(); MainEngine.updateUI();
    }
};


window.onload = MainEngine.init;







