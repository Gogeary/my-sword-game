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

    // 이미지가 없을 때 📦 아이콘을 보여주는 태그 생성
    const imgTag = it.img ? 
        `<img src="image/${it.img}" class="item-icon" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'item-icon\'>📦</div>';">` 
        : '<div class="item-icon">📦</div>';

    let subText = it.info || "";
    if (['weapon','armor','belt','gloves','shoes'].includes(it.type)) {
        subText = `<span style="color:#f1c40f;">능력치 배율: x${it.k.toFixed(2)}</span>`;
    }

    div.innerHTML = `
        <div class="item-icon-container" style="width:50px; height:50px; flex-shrink:0;">
            ${imgTag}
        </div>
        <div class="item-info">
            <strong>${it.name} ${it.en > 0 ? '+'+it.en : ''}</strong>${it.count > 1 ? ` (x${it.count})` : ""}<br>
            <small>${subText}</small>
        </div>
        <div class="item-actions">
            ${!['potion','scroll','ticket','etc'].includes(it.type) ? `<button class="item-btn" onclick="MainEngine.goToUpgrade(${idx})">강화</button>` : ""}
            <button class="item-btn" onclick="MainEngine.toggleEquip(${idx})">${isEquipped ? '해제' : '장착'}</button>
            <button class="item-btn" style="background:#c0392b;" onclick="MainEngine.confirmSell(${idx})">판매</button>
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
        const sellNo = document.getElementById('sell-no-skill').checked;
        const sellYes = document.getElementById('sell-with-skill').checked;
        const sellGems = document.getElementById('sell-gems').checked;

        const targets = data.inventory.filter(it => {
            const isEquipped = data.equipment[it.type] && data.equipment[it.type].uid === it.uid;
            if (isEquipped) return false;
            if (it.type === 'etc' && sellGems) return true;
            if (['weapon','armor','belt','gloves','shoes'].includes(it.type) && (it.en || 0) === 0) {
                const hasSkill = it.skills && it.skills.length > 0;
                return (hasSkill && sellYes) || (!hasSkill && sellNo);
            }
            return false;
        });

        if (targets.length === 0) return alert("판매할 대상이 없습니다.");
        let total = 0; targets.forEach(t => total += Math.floor((t.p || 0) * 0.5) * (t.count || 1));

        if(confirm(`${targets.length}개의 아이템을 판매하여 ${MainEngine.formatNumber(total)}G를 획득하시겠습니까?`)) {
            data.inventory = data.inventory.filter(i => !targets.includes(i));
            data.gold += total; MainEngine.closeModal(); MainEngine.updateUI();
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

/* --- 시스템 함수 --- */
function showPage(id) {
    if(typeof UpgradeSystem !== 'undefined') UpgradeSystem.stopAuto();
    if(id !== 'page-hunt-play' && MainEngine.isAutoHunting) MainEngine.toggleAutoHunt();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    if(id === 'page-info') MainEngine.renderInventory();
    MainEngine.updateUI();
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


