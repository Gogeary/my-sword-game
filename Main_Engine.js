/* ==========================================
   [Main_Engine.js] 
   ========================================== */

// ▼▼▼ [매우 중요] 이 줄이 빠져서 에러가 난 거야! 복사해서 맨 위에 붙여넣어 줘! ▼▼▼
var currentUser = null, data = null, upIdx = -1, autoTimer = null;
const SECRET_KEY = "my_super_secret_game_key_v1.8";


const MainEngine = {
    // --- [중요] 모든 변수와 함수는 이 중괄호 { } 안에 있어야 합니다 ---
    invCurrentTab: 'equip', // 기본값을 '장비' 탭으로 설정
    isAutoHunting: false,   // [추가!] 자동 사냥 상태를 기억하는 변수

    // 자동 사냥 켜기/끄기 함수도 여기에 있으면 좋아
    toggleAutoHunt: () => {
        MainEngine.isAutoHunting = !MainEngine.isAutoHunting;
        const btn = document.getElementById('btn-auto-hunt');
        
        if (MainEngine.isAutoHunting) {
            if (btn) {
                btn.innerText = "🛑 자동 사냥 중지";
                btn.style.background = "#c0392b";
            }
            // 즉시 첫 탐색 시작 (전투 중이 아닐 때만)
            if (!CombatSystem.isEncounter) CombatSystem.scanHunt();
        } else {
            if (btn) {
                btn.innerText = "⚔️ 무한 자동 사냥 시작";
                btn.style.background = "#2ecc71";
            }
        }
    },
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
        
        const countBadge = (it.count && it.count > 1) ? ` <span style="color:#f1c40f; font-weight:bold;">x${it.count}</span>` : '';

        div.innerHTML = `
            ${imgTag}
            <div class="item-info">
                <strong>${it.name} ${it.en > 0 ? '+'+it.en : ''}${countBadge}</strong><br>
                <span style="color:#aaa; font-size:0.85em;">${subText}</span>
            </div>
            <div class="item-actions">${actionButtons}</div>`;
        
        return div;
    },
    toggleEquip: (idx) => {
        const it = data.inventory[idx];
        if(data.equipment[it.type] && data.equipment[it.type].id === it.id) data.equipment[it.type] = null;
        else data.equipment[it.type] = it;
        MainEngine.updateUI();
    },

    confirmSell: (idx) => {
        const it = data.inventory[idx];

        // [수정] 1. 장착 중인지 먼저 확인 (안전장치)
        // 장비류(weapon, armor, belt)일 때만 검사
        if (['weapon', 'armor', 'belt'].includes(it.type)) {
            const equippedItem = data.equipment[it.type];
            // 현재 장착된 아이템의 ID와 팔려는 아이템의 ID가 같으면 판매 차단
            if (equippedItem && equippedItem.id === it.id) {
                alert("🚫 장착 중인 아이템은 판매할 수 없습니다!\n먼저 장비를 해제해 주세요.");
                return; // 여기서 함수를 끝내서 판매 창이 안 뜨게 함
            }
        }

        // 2. 판매 로직 (장착 중이 아닐 때만 실행됨)
        const count = it.count || 1;
        const sellPrice = Math.floor(it.p * 0.5) * count;

        if(confirm(`${it.name} ${count > 1 ? `(${count}개)` : ''}을(를) 판매하시겠습니까?\n총 판매가: ${sellPrice.toLocaleString()} G`)) {
            data.gold += sellPrice;
            
            // 가방에서 삭제
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
   
    // [수정] 모달 열기 함수 (mode 파라미터 추가)
    // mode: 'normal'(기본), 'upgrade'(강화장비), 'support'(보조아이템), 'sell'(판매)
    openInventoryModal: (mode = 'normal') => {
        const modal = document.getElementById('modal-inventory');
        const list = document.getElementById('modal-item-list');
        list.innerHTML = '';
        
        // 인벤토리 순회
        data.inventory.forEach((item, idx) => {
            // [필터링 로직]
            let show = true;
            if (mode === 'upgrade') {
                // 강화 대상: 장비만 표시 (ticket, scroll, potion 제외)
                if (['weapon','armor','belt','gloves','shoes'].indexOf(item.type) === -1) show = false;
            } 
            else if (mode === 'support') {
                // 보조 아이템: 주문서(scroll), 강화권(ticket)만 표시
                if (item.type !== 'scroll' && item.type !== 'ticket') show = false;
            }

            if (show) {
                const div = document.createElement('div');
                div.className = 'inven-item';
                div.style.border = `2px solid ${GameDatabase.getItemRarityColor(item)}`;
                
                // 아이템 정보 표시
                let infoText = `<b>${item.name}</b>`;
                if (item.type !== 'potion' && item.type !== 'scroll' && item.type !== 'ticket') {
                    infoText += ` <span style="color:#f1c40f">(+${item.en})</span>`;
                }
                if (item.count > 1) infoText += ` x${item.count}`;
                
                div.innerHTML = `
                    <img src="image/${item.img}" style="width:30px; height:30px; object-fit:contain;">
                    <div style="flex:1;">${infoText}</div>
                `;

                // [클릭 이벤트 분기]
                div.onclick = () => {
                    if (mode === 'upgrade') {
                        UpgradeSystem.selectUpgrade(idx);
                        MainEngine.closeModal();
                    } 
                    else if (mode === 'support') {
                        UpgradeSystem.selectSupport(idx); // 보조 아이템 선택 함수 호출
                        MainEngine.closeModal();
                    }
                    // ... 기존 판매/장착 로직 등은 mode === 'normal' 일 때 처리
                };
                list.appendChild(div);
            }
        });

        modal.style.display = 'flex';
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
    // 1. [삭제] alert(`🎉 레벨업! Lv.${data.lv}`); 
    // alert는 지우고 아래 코드로 대체합니다.

    // 2. [추가] 전투 로그에 강조 메시지 출력
    const log = document.getElementById('battle-log');
    if (log) {
        // 눈에 확 띄는 스타일(금색, 굵게, 테두리) 적용
        const levelUpMsg = `
            <div style="
                background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(255, 215, 0, 0.3) 50%, rgba(0,0,0,0) 100%);
                color: #ffd700; 
                font-weight: bold; 
                font-size: 1.2em; 
                text-align: center; 
                padding: 10px 0; 
                margin: 10px 0;
                border-top: 1px solid #ffd700;
                border-bottom: 1px solid #ffd700;
                text-shadow: 0 0 5px #ff0000;">
                🎉 LEVEL UP! — Lv.${data.lv} 달성! 🎉
            </div>
        `;
        log.innerHTML = levelUpMsg + log.innerHTML;
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

        // 판매 대상 필터링
        const targets = data.inventory.filter(it => {
            const isEquip = ['weapon', 'armor', 'belt'].includes(it.type);
            const isZeroEnchant = (it.en || 0) === 0;
            const isEquipped = (data.equipment[it.type] && data.equipment[it.type].id === it.id);

            // 장착 중이거나 강화된 아이템은 필터링에서 즉시 제외
            if (!isEquip || !isZeroEnchant || isEquipped) return false;

            // [수정 포인트] attachSkill에서 사용하는 'skills' 배열을 체크
            const hasSkill = Array.isArray(it.skills) && it.skills.length > 0;

            if (!hasSkill && sellNoSkill) return true;  // 스킬 없는 장비 판매 체크됨
            if (hasSkill && sellWithSkill) return true; // 스킬 있는 장비 판매 체크됨
            return false;
        });

        if (targets.length === 0) {
            alert("판매할 대상이 없습니다.\n(장착 중이거나 강화된 아이템은 제외됩니다)");
            return;
        }

        if (confirm(`${targets.length}개의 장비를 일괄 판매하시겠습니까?`)) {
            let totalGold = 0;
            // targets에 담긴 아이템들을 인벤토리에서 하나씩 제거
            targets.forEach(target => {
                totalGold += Math.floor(target.p * 0.5);
                
                const idx = data.inventory.findIndex(item => item.id === target.id);
                if (idx !== -1) data.inventory.splice(idx, 1);
            });

            data.gold += totalGold;
            alert(`${targets.length}개의 장비를 판매하여 ${totalGold.toLocaleString()} G를 획득했습니다!`);
            
            closeModal('modal-batch-sell');
            MainEngine.updateUI();
        }
    },
   
   // [신규 기능] 아이템 획득 시 겹치기 처리 (MainEngine 안에 추가해줘!)
    addItem: (newItem) => {
        // 1. 겹칠 수 있는 아이템인지 확인 (etc, potion, scroll 등)
        const stackableTypes = ['etc', 'potion', 'scroll', 'ticket'];
        
        if (stackableTypes.includes(newItem.type)) {
            // 가방에 같은 아이템(ID 기준)이 있는지 찾기
            const existingItem = data.inventory.find(item => item.id === newItem.id);
            
            if (existingItem) {
                // 있으면 개수만 증가! (count가 없으면 1로 초기화 후 증가)
                if (!existingItem.count) existingItem.count = 1;
                existingItem.count += 1;
                // 알림 메시지용 리턴
                return true; 
            } else {
                // 없으면 새로 추가 (개수 1개로 설정)
                newItem.count = 1;
                data.inventory.push(newItem);
                return true;
            }
        } else {
            // 장비(weapon, armor 등)는 겹치지 않고 그냥 추가
            data.inventory.push(newItem);
            return true;
        }
    },


   
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
    // 1. [기존] 자동 강화가 켜져 있으면 끄기 (안전장치)
    if(typeof UpgradeSystem !== 'undefined') UpgradeSystem.stopAuto();

    // ─────────────────────────────────────────────────────────────
    // ★ [추가] 화면을 이동할 때, 사냥 화면이 아니면 자동 사냥 강제 종료
    // ─────────────────────────────────────────────────────────────
    if (id !== 'page-hunt-play') {
        // MainEngine이 있고, 현재 자동 사냥 중이라면?
        if (typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting) {
            MainEngine.toggleAutoHunt(); // 사냥 멈춤 (타이머 해제)
            
            // (선택사항) 로그에 빨간 글씨로 알림
            const log = document.getElementById('battle-log');
            if(log) log.innerHTML = `<span style="color:#e74c3c">🛑 다른 화면으로 이동하여 자동 사냥이 종료되었습니다.</span><br>` + log.innerHTML;
        }
    }

    // 2. [기존] 페이지 전환 (active 클래스 조작)
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const t = document.getElementById(id); 
    if(t) t.classList.add('active');

    // 3. [기존] 특정 페이지 진입 시 갱신 로직
    if (id === 'page-info') {
        MainEngine.renderInventory();
    }
    
    if (id === 'page-hunt-select') {
        // renderHuntingZones 함수가 있으면 실행
        if(typeof renderHuntingZones === 'function') renderHuntingZones();
    }
    
    MainEngine.updateUI();
}
// MainEngine 객체 밖, 파일 맨 하단에 위치해야 함
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
}
window.onload = MainEngine.init;



