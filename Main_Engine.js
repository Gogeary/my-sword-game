/* ==========================================
   [Main_Engine.js] 
   로그인 오류 방지 및 암호화 안정화 버전
   ========================================== */

var currentUser = null, data = null, upIdx = -1, autoTimer = null;
const SECRET_KEY = "my_super_secret_game_key_v1.8";

const MainEngine = {
    // --- [중요] 모든 변수와 함수는 이 중괄호 { } 안에 있어야 합니다 ---
    invCurrentTab: 'equip', // 기본값을 '장비' 탭으로 설정

    setInvTab: (tab) => {
        MainEngine.invCurrentTab = tab;
        MainEngine.renderInventory();
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
    const invList = document.getElementById('inventory-list');
    const eqList = document.getElementById('equipped-list');
    if (!invList || !eqList) return;

    invList.innerHTML = '';
    eqList.innerHTML = '';

    console.log("--- 인벤토리 렌더링 시작 ---");
    console.log("현재 가방 아이템 수:", data.inventory.length);
    console.log("현재 선택된 탭:", MainEngine.invCurrentTab);

    if (!data.inventory || data.inventory.length === 0) {
        invList.innerHTML = '<div style="color:#888; padding:20px;">가방이 비어있습니다.</div>';
        return;
    }

    data.inventory.forEach((it, idx) => {
        const isEquipped = (data.equipment[it.type] && data.equipment[it.type].id === it.id);
        
        // 카테고리 판정
        let category = 'etc'; 
        const type = it.type ? it.type.toLowerCase() : ''; // 소문자로 통일해서 비교

        if (['weapon', 'armor', 'belt'].includes(type)) category = 'equip';
        else if (['potion', 'ticket', 'scroll'].includes(type)) category = 'consume';

        // 1. 장착 중인 아이템은 탭 상관없이 무조건 상단
        if (isEquipped) {
            eqList.appendChild(MainEngine.createItemHTML(it, idx, true));
        } 
        // 2. 장착 안 된 아이템은 현재 탭과 일치할 때만 하단
        else if (MainEngine.invCurrentTab === category) {
            invList.appendChild(MainEngine.createItemHTML(it, idx, false));
        } else {
            // 여기에 걸리면 탭이 맞지 않아서 안 보이는 것입니다.
            console.log(`아이템 '${it.name}'은(는) 탭이 맞지 않아 숨겨짐 (카테고리: ${category})`);
        }
    });
},

    // [추가] 아이템 카드 HTML 생성을 담당하는 보조 함수
    createItemHTML: (it, idx, isEquipped) => {
        const div = document.createElement('div'); 
        div.className = 'item-card';
        
        if (isEquipped) { 
            div.style.border = '2px solid var(--mine)'; 
            div.style.background = 'rgba(46, 204, 113, 0.1)'; 
        }

        const imgTag = it.img ? `<img src="image/${it.img}" class="item-icon" onerror="this.replaceWith(document.createElement('div')); this.className='item-icon'; this.innerText='⚔️';">` : '<div class="item-icon">📦</div>';
        const isConsumable = (it.type === 'ticket' || it.type === 'scroll' || it.type === 'potion');
        
        let actionButtons = '';
        if (isConsumable) { 
            actionButtons = `<button class="item-btn" style="background:#c0392b; color:#fff;" onclick="MainEngine.confirmSell(${idx})">판매</button>`; 
        } else { 
            actionButtons = `
                <button class="item-btn" style="background:var(--money); color:#000;" onclick="MainEngine.goToUpgrade(${idx})">강화</button>
                <button class="item-btn" style="background:${isEquipped ? '#e74c3c' : 'var(--hunt)'}; color:#fff;" onclick="MainEngine.toggleEquip(${idx})">${isEquipped ? '해제' : '장착'}</button>
                ${!isEquipped ? `<button class="item-btn" style="background:#c0392b; color:#fff;" onclick="MainEngine.confirmSell(${idx})">판매</button>` : ''}
            `; 
        }

        // --- 아이템 정보 문구 결정 로직 ---
        let subText = "";

        if (it.info) {
            // 1. 커스텀 문구 (Database.js에 info: "내용"이 있는 경우)
            subText = it.info;
        } 
        else if (it.type === 'potion') {
            // 2. 포션 회복량
            subText = `회복량: ${it.val.toLocaleString()}`;
        }
        else if (it.type === 'ticket') {
            // 3. 강화권 수치
            subText = `확정 강화 +${it.val}`;
        }
        else if (it.p) {
            // 4. 기본 티어 표시 (가격을 기반으로 자동 계산)
            subText = `티어 ${Math.floor(it.p/1000)}`;
        }

        div.innerHTML = `
            ${imgTag}
            <div class="item-info">
                <strong>${it.name} ${it.en > 0 ? '+'+it.en : ''}</strong><br>
                <span style="color:#aaa; font-size:0.85em;">${subText}</span>
            </div>
            <div class="item-actions">${actionButtons}</div>`;
        
        return div; // 이 리턴 값이 반드시 있어야 리스트에 추가됩니다!
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
    let leveledUp = false;
    let next = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);

    while (data.exp >= next) {
        data.exp -= next;
        data.level++;
        leveledUp = true;
        next = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);
    }

    if (leveledUp) {
        alert(`🎉 레벨업! Lv.${data.level}`);
        data.hp = MainEngine.getFinalStats().hp;
        MainEngine.updateUI();
    }
},
   // 1. 일괄 판매 모달 열기
    openBatchSell: () => {
        const modal = document.getElementById('modal-batch-sell');
        if (modal) modal.style.display = 'block';
    },

    // 2. 실제 일괄 판매 실행
    executeBatchSell: () => {
        const sellNoSkill = document.getElementById('sell-no-skill').checked;
        const sellWithSkill = document.getElementById('sell-with-skill').checked;

        // 판매 대상 필터링: 0강화 장비 중 선택된 조건에 맞는 아이템들
        const targets = data.inventory.filter(it => {
            // 장비(weapon, armor, belt)이고 강화 수치가 0인 것만 대상
            const isEquip = ['weapon', 'armor', 'belt'].includes(it.type);
            const isZeroEnchant = (it.en || 0) === 0;
            const isEquipped = (data.equipment[it.type] && data.equipment[it.type].id === it.id);

            if (!isEquip || !isZeroEnchant || isEquipped) return false;

            const hasSkill = (it.skill && it.skill.id);
            if (!hasSkill && sellNoSkill) return true;  // 스킬 없는 장비 판매
            if (hasSkill && sellWithSkill) return true; // 스킬 있는 장비 판매
            return false;
        });

        if (targets.length === 0) {
            alert("판매할 대상이 없습니다.\n(장착 중이거나 강화된 아이템은 제외됩니다)");
            return;
        }

        if (confirm(`${targets.length}개의 장비를 일괄 판매하시겠습니까?`)) {
            let totalGold = 0;
            targets.forEach(target => {
                totalGold += Math.floor(target.p * 0.5); // 판매가는 원가의 50%
                
                // 인벤토리에서 해당 아이템 삭제
                const idx = data.inventory.findIndex(item => item.id === target.id);
                if (idx !== -1) data.inventory.splice(idx, 1);
            });

            data.gold += totalGold;
            alert(`${targets.length}개의 장비를 판매하여 ${totalGold.toLocaleString()} G를 획득했습니다!`);
            
            // UI 업데이트 및 모달 닫기
            closeModal('modal-batch-sell');
            MainEngine.updateUI();
        }
    },

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
    const t = document.getElementById(id); 
    if(t) t.classList.add('active');

    // [추가] 내 정보 페이지를 열 때 인벤토리와 UI를 새로 고침
    if (id === 'page-info') {
        MainEngine.renderInventory();
    }
    
    if (id === 'page-hunt-select') renderHuntingZones();
    
    MainEngine.updateUI();
}

window.onload = MainEngine.init;













