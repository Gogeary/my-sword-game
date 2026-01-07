/* ==========================================
   [Main_Engine.js]
   게임의 핵심 로직 (암호화 적용 및 강화권 지원 업데이트)
   ========================================== */

var currentUser = null, data = null, upIdx = -1, autoTimer = null;

// [보안] 암호화 키
const SECRET_KEY = "my_super_secret_game_key_v1.8";

const MainEngine = {
    // [암호화 헬퍼]
    encrypt: (dataObj) => {
        try {
            const str = JSON.stringify(dataObj);
            return CryptoJS.AES.encrypt(str, SECRET_KEY).toString();
        } catch (e) {
            console.error("암호화 실패", e);
            return null;
        }
    },
    decrypt: (encryptedStr) => {
        try {
            if (!encryptedStr) return {};
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
        
        // 자동 로그인 설정이 있을 경우
        if(auto) {
            try {
                const savedData = localStorage.getItem('game_users');
                
                // 데이터가 아예 없으면 무시
                if (!savedData) return;

                const users = MainEngine.decrypt(savedData);
                
                // 복호화 결과가 유효하고, 해당 유저 데이터가 존재하는지 확인
                if(users && typeof users === 'object' && users[auto]) { 
                    currentUser = auto; 
                    data = users[auto].data; 
                    MainEngine.enterGame(); 
                } else {
                    console.warn("자동 로그인 데이터가 손상되었습니다. 다시 로그인해주세요.");
                    localStorage.removeItem('game_auto_user'); // 잘못된 자동 로그인 정보 삭제
                }
            } catch (e) {
                console.error("초기화 중 오류 발생:", e);
                localStorage.removeItem('game_auto_user');
            }
        }
    },

    handleLogin: () => {
        const id = document.getElementById('login-id').value;
        const pw = document.getElementById('login-pw').value;
        if(!id || !pw) return alert("정보를 입력해주세요.");

        const savedData = localStorage.getItem('game_users');
        const users = MainEngine.decrypt(savedData);

        if(users[id]) {
            if(users[id].pw !== pw) return alert("비밀번호가 틀립니다.");
            data = users[id].data;
        } else {
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
        
        localStorage.setItem('game_users', MainEngine.encrypt(users));
        MainEngine.enterGame();
    },

    enterGame: () => {
        document.getElementById('login-container').style.display='none';
        document.getElementById('game-container').style.display='block';
        MainEngine.updateUI();
    },

    logout: () => {
        showPage('page-main');
        localStorage.removeItem('game_auto_user');
        location.reload();
    },

    saveGame: () => {
        if(currentUser && data) {
            const savedData = localStorage.getItem('game_users');
            const users = MainEngine.decrypt(savedData);
            users[currentUser].data = data;
            localStorage.setItem('game_users', MainEngine.encrypt(users));
        }
    },
    
    begging: () => {
        const amount = Math.floor(Math.random() * 500) + 1;
        data.gold += amount;
        alert(`지나가는 행인이 ${amount}G를 던져주었습니다! 감사합니다!`);
        MainEngine.updateUI();

        const btn = document.getElementById('btn-beg');
        if(btn) {
            btn.disabled = true; 
            btn.style.background = '#555'; 
            let timeLeft = 10;
            btn.innerText = `⏳ ${timeLeft}초 뒤 가능...`;
            const timer = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    btn.innerText = `⏳ ${timeLeft}초 뒤 가능...`;
                } else {
                    clearInterval(timer);
                    btn.disabled = false;
                    btn.style.background = '#8e44ad'; 
                    btn.innerText = '🤲 동냥하기 (쿨타임 10초)';
                }
            }, 1000);
        }
    },

    exportSaveFile: () => {
        const saveStr = localStorage.getItem('game_users');
        if(!saveStr) return alert("데이터 없음");
        const blob = new Blob([saveStr], {type: "text/plain;charset=utf-8"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `강화하기_v2.0_Encrypted_Save.txt`;
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
                if (!testParse || Object.keys(testParse).length === 0) {
                     JSON.parse(loadedStr); 
                }
                localStorage.setItem('game_users', loadedStr);
                alert("복구 완료!");
                location.reload();
            } catch(err) { 
                console.error(err);
                alert("유효하지 않은 세이브 파일입니다."); 
            }
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
        
        eqList.innerHTML = '';
        invList.innerHTML = '';
        
        if (data.inventory.length === 0) {
            invList.innerHTML = '<div style="color:#666; padding:20px;">가방이 비어있습니다.</div>';
            eqList.innerHTML = '<div style="color:#666; padding:10px;">장착된 장비가 없습니다.</div>';
            return;
        }

        let equippedCount = 0;

        data.inventory.forEach((it, idx) => {
            const isEquipped = (data.equipment[it.type] && data.equipment[it.type].id === it.id);
            const div = document.createElement('div'); 
            div.className = 'item-card';
            
            if (isEquipped) {
                div.style.border = '2px solid var(--mine)'; 
                div.style.background = 'rgba(46, 204, 113, 0.1)';
                equippedCount++;
            }

            const imgTag = it.img ? `<img src="image/${it.img}" class="item-icon" onerror="this.replaceWith(document.createElement('div')); this.className='item-icon'; this.innerText='⚔️';">` : '<div class="item-icon">📦</div>';
            
            // 소모품 여부 확인 (강화권, 방지권, 포션 등은 강화 불가)
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

            div.innerHTML = `
                ${imgTag}
                <div class="item-info">
                    <strong>${it.name} ${it.en > 0 ? '+'+it.en : ''}</strong><br>
                    ${isEquipped ? '<span style="color:var(--mine); font-weight:bold;">[장착중]</span>' : (it.p ? `<span style="color:#888; font-size:0.9em;">티어 ${Math.floor(it.p/1000)}</span>` : '')}
                </div>
                <div class="item-actions">
                    ${actionButtons}
                </div>`;
            
            if (isEquipped) {
                eqList.appendChild(div);
            } else {
                invList.appendChild(div);
            }
        });

        if (equippedCount === 0) {
            eqList.innerHTML = '<div style="color:#555; font-size:0.9em; padding:10px;">장착된 장비가 없습니다.</div>';
        }
    },
    toggleEquip: (idx) => {
        const it = data.inventory[idx];
        if(data.equipment[it.type] && data.equipment[it.type].id === it.id) data.equipment[it.type] = null;
        else data.equipment[it.type] = it;
        if(data.hp > MainEngine.getFinalStats().hp) data.hp = MainEngine.getFinalStats().hp;
        MainEngine.updateUI();
    },
    confirmSell: (idx) => {
        if(confirm("정말 판매하시겠습니까?")) {
            const it = data.inventory[idx];
            data.gold += Math.floor(it.p * 0.5);
            if(data.equipment[it.type] && data.equipment[it.type].id === it.id) data.equipment[it.type] = null;
            data.inventory.splice(idx, 1);
            if(upIdx===idx) MainEngine.resetUpgradeUI();
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
        const costPerHP = 25;
        const totalCost = missingHP * costPerHP;

        if (confirm(`체력을 회복하시겠습니까?\n(회복량: ${missingHP}, 비용: ${totalCost.toLocaleString()} G)`)) {
            if (data.gold < totalCost) return alert(`골드가 부족합니다.\n(필요: ${totalCost.toLocaleString()} G / 보유: ${Math.floor(data.gold).toLocaleString()} G)`);
            data.gold -= totalCost;
            data.hp = maxHP;
            MainEngine.updateUI();
            alert(`치료가 완료되었습니다. (비용: ${totalCost.toLocaleString()} G 소모)`);
        }
    },

    // [수정] 강화용 장비 선택 모달 (필터링 적용)
    openInventoryModal: () => {
        const modal = document.getElementById('inv-modal');
        const mList = document.getElementById('modal-item-list');
        
        if (!modal || !mList) return;

        modal.style.display = 'block';
        mList.innerHTML = ''; 

        // 강화 가능한 장비만 필터링 (강화권, 방지권 제외)
        const upgradables = data.inventory.map((item, index) => ({ ...item, realIdx: index }))
            .filter(item => ['weapon', 'armor', 'belt'].includes(item.type));

        if (upgradables.length === 0) {
            mList.innerHTML = '<div style="padding:20px; color:#888;">강화 가능한 장비가 없습니다.</div>';
            return;
        }

        upgradables.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'main-menu-btn';
            btn.style.padding = "10px";
            btn.style.fontSize = "0.9em";
            btn.style.textAlign = "left";
            
            const isEquipped = (data.equipment[item.type] && data.equipment[item.type].id === item.id);
            const status = isEquipped ? '<span style="color:var(--mine)">[장착중]</span> ' : '';

            btn.innerHTML = `${status}<strong>${item.name} (+${item.en})</strong>`;
            
            btn.onclick = () => {
                if (typeof UpgradeSystem !== 'undefined') {
                    UpgradeSystem.selectUpgrade(item.realIdx); 
                }
                MainEngine.closeModal();
            };
            
            mList.appendChild(btn);
        });
    },
    closeModal: () => document.getElementById('inv-modal').style.display='none',
    resetUpgradeUI: () => {
        document.getElementById('upgrade-target-display').innerText='선택해주세요';
        document.getElementById('btn-up-exec').disabled=true;
        document.getElementById('btn-up-sell').style.display='none';
        document.getElementById('up-chance').innerText='0';
        document.getElementById('up-break').innerText='0';
        upIdx = -1;
    },
    checkLevelUp: () => {
        let next = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);
        let lvUp = false;
        while(data.exp >= next) {
            data.exp -= next;
            data.level++;
            next = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);
            lvUp = true;
        }
        if(lvUp) {
            alert(`🎉 레벨업! Lv.${data.level} (체력 완전 회복)`);
            const stats = MainEngine.getFinalStats();
            data.hp = stats.hp; 
            MainEngine.updateUI();
        }
    }
};

const GamblingSystem = {
    init: () => {
        if(document.getElementById('gamble-gold-display')) {
            document.getElementById('gamble-gold-display').innerText = Math.floor(data.gold).toLocaleString();
        }
        document.getElementById('gamble-amount').value = ''; 
    },
    play: (choice) => {
        const input = document.getElementById('gamble-amount');
        const bet = parseInt(input.value);
        const log = document.getElementById('gamble-log');

        if (!bet || bet <= 0) return alert("베팅 금액을 올바르게 입력해주세요.");
        if (bet > data.gold) return alert("가진 돈보다 많이 걸 수 없습니다!");

        const num = Math.floor(Math.random() * 100) + 1;
        const resultType = (num % 2 !== 0) ? 'odd' : 'even';
        const resultText = (resultType === 'odd') ? '🔴 홀' : '🔵 짝';

        if (choice === resultType) {
            data.gold += bet;
            log.innerHTML = `<div style="color:#2ecc71; margin-bottom:5px;">🎉 <strong>승리!</strong> 결과: [${resultText}]<br>+${bet.toLocaleString()}G 획득!</div>` + log.innerHTML;
        } else {
            data.gold -= bet;
            log.innerHTML = `<div style="color:#e74c3c; margin-bottom:5px;">💀 <strong>패배...</strong> 결과: [${resultText}]<br>-${bet.toLocaleString()}G 증발...</div>` + log.innerHTML;
        }
        MainEngine.updateUI();
        document.getElementById('gamble-gold-display').innerText = Math.floor(data.gold).toLocaleString();
    }
};

function renderHuntingZones() {
    const list = document.getElementById('hunting-zone-list');
    if (!list) return;
    list.innerHTML = '';
    
    GameDatabase.HUNTING_ZONES.forEach(zone => {
        const btn = document.createElement('button');
        btn.className = 'main-menu-btn';
        btn.style.background = '#34495e';
        btn.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>🌲 ${zone.name}</span>
                <span style="font-size:0.8em; background:#2c3e50; padding:4px 8px; border-radius:4px;">Lv.${zone.minLv}~${zone.maxLv}</span>
            </div>
        `;
        btn.onclick = () => CombatSystem.enterZone(zone.id);
        list.appendChild(btn);
    });
}

function showPage(id) {
    if(autoTimer) { clearInterval(autoTimer); autoTimer=null; }
    if(typeof UpgradeSystem !== 'undefined' && UpgradeSystem.stopAuto) UpgradeSystem.stopAuto();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const t = document.getElementById(id); if(t) t.classList.add('active');
    
    if (id === 'page-hunt-select') {
        renderHuntingZones();
    }
    MainEngine.updateUI();
}

// 1. 마우스 우클릭 차단
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    alert("보안을 위해 우클릭이 제한됩니다.");
});

// 2. F12 및 개발자 도구 단축키 차단
document.addEventListener('keydown', function(e) {
    if (e.keyCode === 123) { e.preventDefault(); e.returnValue = false; }
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) { e.preventDefault(); e.returnValue = false; }
    if (e.ctrlKey && e.shiftKey && e.keyCode === 74) { e.preventDefault(); e.returnValue = false; }
    if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); e.returnValue = false; }
});

function addLog(m, c) { const l = document.getElementById('log-container'); if(l) l.innerHTML=`<div style="color:${c}; margin-bottom:4px;">> ${m}</div>`+l.innerHTML; }

window.onload = MainEngine.init;

