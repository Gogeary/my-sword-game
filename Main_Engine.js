/* ==========================================
   [Main_Engine.js] 
   로그인 오류 방지 및 암호화 안정화 버전
   ========================================== */

var currentUser = null, data = null, upIdx = -1, autoTimer = null;
const SECRET_KEY = "my_super_secret_game_key_v1.8";

const MainEngine = {
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

    handleLogin: () => {
        const id = document.getElementById('login-id').value;
        const pw = document.getElementById('login-pw').value;
        if(!id || !pw) return alert("정보를 입력해주세요.");

        const savedData = localStorage.getItem('game_users');
        // [중요] 데이터가 없을 경우를 대비해 빈 객체 || {} 추가
        let users = MainEngine.decrypt(savedData) || {};

        if(users[id]) {
            if(users[id].pw !== pw) return alert("비밀번호가 틀립니다.");
            data = users[id].data;
        } else {
            // 신규 가입 데이터 초기화
            data = { 
                level:1, exp:0, gold:100000, hp:100, 
                inventory:[], equipment:{weapon:null, armor:null, belt:null}, 
                potions:0, potionCount:0, 
                potionBuffer: 0, 
                mineGrid: [], scrolls: {} 
            };
            users[id] = { pw, data };
        }
        
        currentUser = id;
        if(typeof data.potionBuffer === 'undefined') data.potionBuffer = 0;
        if(document.getElementById('auto-login').checked) localStorage.setItem('game_auto_user', id);
        
        // 암호화하여 저장
        localStorage.setItem('game_users', MainEngine.encrypt(users));
        MainEngine.enterGame();
    },

    enterGame: () => {
        const loginCont = document.getElementById('login-container');
        const gameCont = document.getElementById('game-container');
        if(loginCont) loginCont.style.display='none';
        if(gameCont) gameCont.style.display='block';
        MainEngine.updateUI();
    },

    logout: () => {
        localStorage.removeItem('game_auto_user');
        location.reload();
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
    
    begging: () => {
        const amount = Math.floor(Math.random() * 500) + 1;
        data.gold += amount;
        alert(`지나가는 행인이 ${amount}G를 던져주었습니다!`);
        MainEngine.updateUI();
        const btn = document.getElementById('btn-beg');
        if(btn) {
            btn.disabled = true; btn.style.background = '#555'; 
            let timeLeft = 10;
            const timer = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) btn.innerText = `⏳ ${timeLeft}초 뒤 가능...`;
                else { clearInterval(timer); btn.disabled = false; btn.style.background = '#8e44ad'; btn.innerText = '🤲 동냥하기 (쿨타임 10초)'; }
            }, 1000);
        }
    },

    exportSaveFile: () => {
        const saveStr = localStorage.getItem('game_users');
        if(!saveStr) return alert("데이터 없음");
        const blob = new Blob([saveStr], {type: "text/plain;charset=utf-8"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `강화하기_v2.2_Save.txt`;
        link.click();
    },

    importSaveFile: (input) => {
        const file = input.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedStr = e.target.result;
                const testParse = MainEngine.decrypt(loadedStr);
                if (testParse && typeof testParse === 'object') {
                    localStorage.setItem('game_users', loadedStr);
                    alert("복구 완료!");
                    location.reload();
                } else { throw new Error(); }
            } catch(err) { alert("유효하지 않은 파일입니다."); }
        };
        reader.readAsText(file);
    },

    updateUI: () => {
        if(!data) return;
        const nextExp = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);
        if(data.exp >= nextExp) { MainEngine.checkLevelUp(); return; }

        const stats = MainEngine.getFinalStats();
        const potions = data.inventory.filter(i => i.type === 'potion');
        const rawTotal = potions.reduce((sum, p) => sum + (p.val || 0), 0);
        const currentBuffer = data.potionBuffer || 0;
        const realTotal = Math.max(0, rawTotal - currentBuffer);

        document.getElementById('gold').innerText = Math.floor(data.gold).toLocaleString();
        document.getElementById('potion-val').innerText = realTotal.toLocaleString();
        document.getElementById('potion-cnt').innerText = potions.length;
        document.getElementById('hp-val').innerText = Math.max(0, Math.floor(data.hp)).toLocaleString();
        document.getElementById('hp-max').innerText = Math.floor(stats.hp).toLocaleString();
        document.getElementById('hp-fill').style.width = ((data.hp / stats.hp * 100) || 0) + '%';
        
        const expPer = ((data.exp / nextExp * 100) || 0).toFixed(1);
        document.getElementById('exp-fill').style.width = Math.min(100, expPer) + '%';
        document.getElementById('user-lv').innerText = data.level;
        document.getElementById('exp-text').innerText = `${Math.floor(data.exp).toLocaleString()} / ${Math.floor(nextExp).toLocaleString()} (${expPer}%)`;
        
        const infoAtk = document.getElementById('info-atk');
        if(infoAtk) {
            infoAtk.innerText = Math.floor(stats.atk).toLocaleString();
            document.getElementById('info-def').innerText = Math.floor(stats.def).toLocaleString();
            document.getElementById('info-hp').innerText = Math.floor(stats.hp).toLocaleString();
        }
        MainEngine.renderInventory();
        MainEngine.saveGame();
    },

    getFinalStats: () => {
        if(typeof GameDatabase === 'undefined') return { atk:10, def:2, hp:100 };
        let bAtk = GameDatabase.USER_STATS.CALC_ATK(data.level);
        let bDef = GameDatabase.USER_STATS.CALC_DEF(data.level);
        let bHP = GameDatabase.USER_STATS.CALC_HP(data.level);
        let fAtk = bAtk, fDef = bDef, fHP = bHP;
        const eq = data.equipment;
        if(eq.weapon) fAtk = GameDatabase.ENHANCE_FORMULA.weapon(bAtk, eq.weapon.k, eq.weapon.en);
        if(eq.armor)  fDef = GameDatabase.ENHANCE_FORMULA.armor(bDef, eq.armor.k, eq.armor.en);
        if(eq.belt)   fHP  = GameDatabase.ENHANCE_FORMULA.belt(bHP, eq.belt.k, eq.belt.en);
        return { atk: fAtk, def: fDef, hp: fHP };
    },
    
    renderInventory: () => {
        const eqList = document.getElementById('equipped-list');
        const invList = document.getElementById('inventory-list');
        if(!eqList || !invList) return;
        eqList.innerHTML = ''; invList.innerHTML = '';
        if (data.inventory.length === 0) {
            invList.innerHTML = '<div style="color:#666; padding:20px;">가방이 비어있습니다.</div>';
            eqList.innerHTML = '<div style="color:#666; padding:10px;">장착된 장비가 없습니다.</div>';
            return;
        }
        let equippedCount = 0;
        data.inventory.forEach((it, idx) => {
            const isEquipped = (data.equipment[it.type] && data.equipment[it.type].id === it.id);
            const div = document.createElement('div'); div.className = 'item-card';
            if (isEquipped) { div.style.border = '2px solid var(--mine)'; div.style.background = 'rgba(46, 204, 113, 0.1)'; equippedCount++; }
            const imgTag = it.img ? `<img src="image/${it.img}" class="item-icon" onerror="this.replaceWith(document.createElement('div')); this.className='item-icon'; this.innerText='⚔️';">` : '<div class="item-icon">📦</div>';
            const isConsumable = (it.type === 'ticket' || it.type === 'scroll' || it.type === 'potion');
            let actionButtons = '';
            if (isConsumable) { actionButtons = `<button class="item-btn" style="background:#c0392b; color:#fff;" onclick="MainEngine.confirmSell(${idx})">판매</button>`; }
            else { actionButtons = `<button class="item-btn" style="background:var(--money); color:#000;" onclick="MainEngine.goToUpgrade(${idx})">강화</button><button class="item-btn" style="background:${isEquipped ? '#e74c3c' : 'var(--hunt)'}; color:#fff;" onclick="MainEngine.toggleEquip(${idx})">${isEquipped ? '해제' : '장착'}</button>${!isEquipped ? `<button class="item-btn" style="background:#c0392b; color:#fff;" onclick="MainEngine.confirmSell(${idx})">판매</button>` : ''}`; }
            div.innerHTML = `${imgTag}<div class="item-info"><strong>${it.name} ${it.en > 0 ? '+'+it.en : ''}</strong><br>${isEquipped ? '<span style="color:var(--mine); font-weight:bold;">[장착중]</span>' : (it.p ? `<span style="color:#888; font-size:0.9em;">티어 ${Math.floor(it.p/1000)}</span>` : '')}</div><div class="item-actions">${actionButtons}</div>`;
            if (isEquipped) eqList.appendChild(div); else invList.appendChild(div);
        });
        if (equippedCount === 0) eqList.innerHTML = '<div style="color:#555; font-size:0.9em; padding:10px;">장착된 장비가 없습니다.</div>';
    },

    toggleEquip: (idx) => {
        const it = data.inventory[idx];
        if(data.equipment[it.type] && data.equipment[it.type].id === it.id) data.equipment[it.type] = null;
        else data.equipment[it.type] = it;
        MainEngine.updateUI();
    },

    confirmSell: (idx) => {
        if(confirm("정말 판매하시겠습니까?")) {
            const it = data.inventory[idx];
            data.gold += Math.floor(it.p * 0.5);
            if(data.equipment[it.type] && data.equipment[it.type].id === it.id) data.equipment[it.type] = null;
            data.inventory.splice(idx, 1);
            MainEngine.updateUI();
        }
    },

    goToUpgrade: (idx) => { showPage('page-upgrade'); if(typeof UpgradeSystem !== 'undefined') UpgradeSystem.selectUpgrade(idx); },
    sellFromUpgrade: () => { if(upIdx !== -1) MainEngine.confirmSell(upIdx); },

   fullHeal: () => {
        const stats = MainEngine.getFinalStats();
        const maxHP = Math.floor(stats.hp);
        const currentHP = Math.floor(data.hp);
        const missingHP = maxHP - currentHP;

        if (missingHP <= 0) return alert("이미 체력이 가득 차 있습니다.");
        
        const costPerHP = 25; // HP 1당 25골드
        const totalCost = missingHP * costPerHP;

        if (confirm(`체력을 회복하시겠습니까?\n(회복량: ${missingHP}, 비용: ${totalCost.toLocaleString()} G)`)) {
            if (data.gold < totalCost) return alert(`골드가 부족합니다.\n(필요: ${totalCost.toLocaleString()} G / 보유: ${Math.floor(data.gold).toLocaleString()} G)`);
            
            data.gold -= totalCost;
            data.hp = maxHP;
            MainEngine.updateUI();
            alert(`치료가 완료되었습니다. (비용: ${totalCost.toLocaleString()} G 소모)`);
        }
    },
   
    openInventoryModal: () => {
        const modal = document.getElementById('inv-modal');
        const mList = document.getElementById('modal-item-list');
        if (!modal || !mList) return;
        modal.style.display = 'block'; mList.innerHTML = '';
        const upgradables = data.inventory.map((item, index) => ({ ...item, realIdx: index }))
            .filter(item => ['weapon', 'armor', 'belt'].includes(item.type));
        if (upgradables.length === 0) { mList.innerHTML = '<div style="padding:20px; color:#888;">강화 가능한 장비가 없습니다.</div>'; return; }
        upgradables.forEach(item => {
            const btn = document.createElement('button'); btn.className = 'main-menu-btn'; btn.style.padding = "10px"; btn.style.fontSize = "0.9em";
            const isEquipped = (data.equipment[item.type] && data.equipment[item.type].id === item.id);
            btn.innerHTML = `${isEquipped ? '[장착중] ' : ''}${item.name} (+${item.en})`;
            btn.onclick = () => { UpgradeSystem.selectUpgrade(item.realIdx); MainEngine.closeModal(); };
            mList.appendChild(btn);
        });
    },

    closeModal: () => document.getElementById('inv-modal').style.display='none',

    checkLevelUp: () => {
        let next = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);
        while(data.exp >= next) {
            data.exp -= next;
            data.level++;
            next = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);
        }
        alert(`🎉 레벨업! Lv.${data.level}`);
        data.hp = MainEngine.getFinalStats().hp;
        MainEngine.updateUI();
    }
};

// ... 이하 GamblingSystem, renderHuntingZones, showPage 등은 기존과 동일 ...
const GamblingSystem = {
    init: () => {
        const gDisp = document.getElementById('gamble-gold-display');
        if(gDisp) gDisp.innerText = Math.floor(data.gold).toLocaleString();
    },
    play: (choice) => {
        const input = document.getElementById('gamble-amount');
        const bet = parseInt(input.value);
        if (!bet || bet <= 0 || bet > data.gold) return alert("베팅 금액 오류!");
        const res = (Math.floor(Math.random() * 100) + 1) % 2 !== 0 ? 'odd' : 'even';
        if (choice === res) { data.gold += bet; alert("승리!"); }
        else { data.gold -= bet; alert("패배..."); }
        MainEngine.updateUI();
        GamblingSystem.init();
    }
};

function renderHuntingZones() {
    const list = document.getElementById('hunting-zone-list');
    if (!list) return; list.innerHTML = '';
    GameDatabase.HUNTING_ZONES.forEach(zone => {
        const btn = document.createElement('button'); btn.className = 'main-menu-btn';
        btn.innerHTML = `🌲 ${zone.name} (Lv.${zone.minLv}~${zone.maxLv})`;
        btn.onclick = () => CombatSystem.enterZone(zone.id); list.appendChild(btn);
    });
}

function showPage(id) {
    if(typeof UpgradeSystem !== 'undefined') UpgradeSystem.stopAuto();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const t = document.getElementById(id); if(t) t.classList.add('active');
    if (id === 'page-hunt-select') renderHuntingZones();
    MainEngine.updateUI();
}

window.onload = MainEngine.init;


