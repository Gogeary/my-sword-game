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
    const stats = GameDatabase.USER_STATS;
    const formulas = GameDatabase.ENHANCE_FORMULA; // 강화 공식 참조
    const lv = data.level || 1;
    
    let final = {
        atk: stats.CALC_ATK(lv),
        def: stats.CALC_DEF(lv),
        hp: stats.CALC_HP(lv)
    };

    Object.keys(data.equipment).forEach(slot => {
        const item = data.equipment[slot];
        if (item) {
            const k = item.k || 1;
            const en = item.en || 0;

            if (slot === 'weapon') {
                // 무기: base * k * (1 + 0.2 * en^1.1)
                final.atk = Math.floor(formulas.weapon(stats.CALC_ATK(lv), k, en));
            } 
            else if (slot === 'armor') {
                // 방어구: base * k * (1 + 0.5 * en)
                final.def = Math.floor(formulas.armor(stats.CALC_DEF(lv), k, en));
            } 
            else if (slot === 'belt') {
                // 벨트: base * k * (1 + 0.1 * en^1.25)
                final.hp = Math.floor(formulas.belt(stats.CALC_HP(lv), k, en));
            } 
            else if (slot === 'gloves') {
                // 장갑: k * (1 + en * 0.02) 배율 적용
                final.atk = Math.floor(final.atk * formulas.gloves(k, en));
            } 
            else if (slot === 'shoes') {
                // 신발: (장갑과 유사한 로직으로 가정하거나 별도 공식이 없다면 k 반영)
                final.def = Math.floor(final.def * k * (1 + en * 0.02));
            }
        }
    });

    return final;
},
   // 1. 이 함수가 MainEngine 안에 있는지 확인
    exportSaveFile: () => {
        const saveStr = localStorage.getItem('game_users');
        if(!saveStr) return alert("데이터 없음");
        const blob = new Blob([saveStr], {type: "text/plain;charset=utf-8"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `강화하기_Save.txt`;
        link.click();
    },

    // 2. 이 함수도 MainEngine 안에 있는지 확인
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
        // 장착 중인 경우 초록색 테두리 강조
        if (isEquipped) div.style.border = '2px solid #2ecc71';

        // 이미지 로드 실패 시 📦 아이콘으로 대체
        const imgTag = it.img ? 
            `<img src="image/${it.img}" class="item-icon" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'item-icon\'>📦</div>';">` 
            : '<div class="item-icon">📦</div>';

        const type = (it.type || "").toLowerCase();
        const isGear = ['weapon', 'armor', 'belt', 'gloves', 'shoes'].includes(type);
        const isConsumable = ['potion', 'scroll', 'ticket'].includes(type);
        const isGem = (type === 'etc' || type === 'gem'); 
        const formulas = GameDatabase.ENHANCE_FORMULA;

        let subText = it.info || "";

        // [핵심] 장비일 경우 DB의 ENHANCE_FORMULA를 적용하여 최종 배율 계산
        if (isGear) {
            const k = Number(it.k) || 1;
            const en = Number(it.en) || 0;
            let finalMult = k;

            try {
                if (type === 'weapon') {
                    // 무기 공식: k * (1 + 0.2 * en^1.1)
                    finalMult = k * (1 + 0.2 * Math.pow(en, 1.1));
                } else if (type === 'armor') {
                    // 방어구 공식: k * (1 + 0.5 * en)
                    finalMult = k * (1 + 0.5 * en);
                } else if (type === 'belt') {
                    // 벨트 공식: k * (1 + 0.1 * en^1.25)
                    finalMult = k * (1 + 0.1 * Math.pow(en, 1.25));
                } else if (type === 'gloves' || type === 'shoes') {
                    // 장갑/신발 공식: k * (1 + en * 0.02)
                    // (신발 전용 공식이 없을 경우 장갑 공식을 준용)
                    finalMult = formulas.gloves ? formulas.gloves(k, en) : k * (1 + en * 0.02);
                }
            } catch (e) {
                console.error("배율 연산 중 오류 발생:", e);
                finalMult = k;
            }

            // 노란색 배율 텍스트 업데이트
            subText = `<span style="color:#f1c40f;">능력치 배율: x${finalMult.toFixed(2)}</span>`;
            if (en > 0) {
                subText += ` <small style="color:#888;">(강화 반영됨)</small>`;
            }
        }

        // [버튼 로직]
        let actionButtons = '';
        if (isGem || isConsumable) {
            actionButtons = `<button class="item-btn" style="background:#c0392b; color:white;" onclick="MainEngine.confirmSell(${idx})">판매</button>`;
        } else if (isGear) {
            actionButtons = `
                <button class="item-btn" onclick="MainEngine.goToUpgrade(${idx})">강화</button>
                <button class="item-btn" onclick="MainEngine.toggleEquip(${idx})">${isEquipped ? '해제' : '장착'}</button>
                ${!isEquipped ? `<button class="item-btn" style="background:#c0392b; color:white;" onclick="MainEngine.confirmSell(${idx})">판매</button>` : ''}
            `;
        } else {
            actionButtons = `<button class="item-btn" style="background:#c0392b; color:white;" onclick="MainEngine.confirmSell(${idx})">판매</button>`;
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

    // 'it.id'가 아니라 'it.uid'를 비교해야 합니다!
    const isEquipped = data.equipment[it.type] && data.equipment[it.type].uid === it.uid;

    if (isEquipped) {
        data.equipment[it.type] = null; // 해제
    } else {
        data.equipment[it.type] = it;   // 장착 (이 객체 하나만!)
    }
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
        const sellNoSkill = document.getElementById('sell-no-skill')?.checked || false;
        const sellWithSkill = document.getElementById('sell-with-skill')?.checked || false;
        const sellGems = document.getElementById('sell-gems')?.checked || false;

        // [핵심] 필터링 순서를 보석 우선으로 변경
        const targets = data.inventory.filter(it => {
    const type = (it.type || "").toLowerCase().trim();

    // 1. 보석류는 장착 개념이 없으므로 바로 패스
    if (type === 'etc' || type === 'gem') {
        return sellGems;
    }

    // 2. 장비류 필터링
    const gearTypes = ['weapon', 'armor', 'belt', 'gloves', 'shoes'];
    if (gearTypes.includes(type)) {
        // [수정 핵심] it.id가 아니라 it.uid를 비교!
        // 장착 슬롯에 있는 아이템의 '주민번호(uid)'와 현재 검사 중인 아이템의 '주민번호'가 같을 때만 장착된 것으로 간주
        const isEquipped = data.equipment[type] && data.equipment[type].uid === it.uid;
        
        if (isEquipped) return false; // 장착 중이면 판매 대상에서 제외

        // 3. 0강 아이템만 판매 대상에 포함
        if ((it.en || 0) === 0) {
            const hasSkill = Array.isArray(it.skills) && it.skills.length > 0;
            if (!hasSkill && sellNoSkill) return true;
            if (hasSkill && sellWithSkill) return true;
        }
    }
    return false;
});

        if (targets.length === 0) {
            alert("판매할 대상이 없습니다.\n'보석(재료) 전체 판매'에 체크했는지 확인해 주세요!");
            return;
        }

        let totalGold = 0;
        targets.forEach(t => {
            const count = t.count || 1;
            totalGold += Math.floor((t.p || 0) * 0.5) * count; 
        });

        if (confirm(`총 ${targets.length}종의 아이템을 판매하시겠습니까?\n예상 수익: ${MainEngine.formatNumber(totalGold)} G`)) {
            // 인벤토리에서 대상 아이템들 완전 제거 (보석은 count 상관없이 통째로 삭제)
            data.inventory = data.inventory.filter(item => !targets.includes(item));
            data.gold += totalGold;

            alert(`판매 완료! ${MainEngine.formatNumber(totalGold)} G를 획득했습니다.`);
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






















