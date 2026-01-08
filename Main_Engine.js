/* ==========================================
   [Main_Engine.js] 최종 온라인 통합 관리 시스템
   ========================================== */

// 1. Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyDwGNiPszzc_Og_75QunUveUXX60m_oq2Q",
  authDomain: "orbisrpg123.firebaseapp.com",
  projectId: "orbisrpg123",
  storageBucket: "orbisrpg123.firebasestorage.app",
  messagingSenderId: "132359346538",
  appId: "1:132359346538:web:0cc860de9863e7d251ed13",
  measurementId: "G-X2Z69E79VT"
};

// 2. Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();    
const rtdb = firebase.database();

// 전역 변수 설정
var currentUser = null, data = null, upIdx = -1, autoTimer = null;
const SECRET_KEY = "my_super_secret_game_key_v1";

const MainEngine = {
    invCurrentTab: 'equip', 
    isAutoHunting: false,

    // [수정됨] 누락되었던 초기화 함수 추가
    init: () => {
        console.log("Orbis RPG Online System Initialized");
        // 게임 시작 시 필요한 로직이 있다면 여기에 추가
    },

    // --- [온라인 로그인 & 가입 (1회용 초대코드)] ---
    handleLogin: async () => {
        const id = document.getElementById('login-id').value;
        const pw = document.getElementById('login-pw').value;
        const code = document.getElementById('invite-code').value; 

        if(!id || !pw) return alert("아이디와 비밀번호를 입력해주세요.");

        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        if(userDoc.exists) {
            const userData = userDoc.data();
            if(userData.pw !== pw) return alert("비밀번호가 틀립니다.");
            data = userData.gameData;
            currentUser = id;
            MainEngine.enterGame();
        } else {
            if(!code) return alert("신규 가입을 위해 초대코드가 필요합니다.");
            const codeRef = db.collection('inviteCodes').doc(code);
            const codeDoc = await codeRef.get();

            if(codeDoc.exists && !codeDoc.data().used) {
                await codeRef.update({ used: true, usedBy: id });
                data = { 
                    level:1, exp:0, gold:100000, hp:100, 
                    inventory:[], 
                    equipment:{weapon:null, armor:null, belt:null, gloves:null, shoes:null}, 
                    potionBuffer: 0, mineGrid: []
                };
                await userRef.set({ pw: pw, gameData: data });
                currentUser = id;
                alert("🎉 가입 성공! 온라인 서버에 등록되었습니다.");
                MainEngine.enterGame();
            } else {
                alert("❌ 유효하지 않거나 이미 사용된 초대코드입니다.");
            }
        }
    },

    saveGame: async () => {
        if(currentUser && data) {
            try {
                await db.collection('users').doc(currentUser).update({
                    gameData: data,
                    lastSeen: new Date()
                });
                console.log("☁️ 서버 저장 완료");
            } catch (e) { console.error("데이터 저장 실패:", e); }
        }
    },

    enterGame: () => {
        document.getElementById('login-container').style.display='none';
        document.getElementById('game-container').style.display='block';
        ChatSystem.init();
        MainEngine.updateUI();
        setInterval(MainEngine.saveGame, 30000); 
    },

    // --- [게임 유틸리티] ---
    formatNumber: (num) => {
        num = Math.floor(num);
        if (num < 10000) return num.toLocaleString();
        if (num >= 1e12) return Math.floor(num/1e12) + "조 " + Math.floor((num%1e12)/1e8) + "억";
        if (num >= 1e8) return Math.floor(num/1e8) + "억 " + Math.floor((num%1e8)/10000) + "만";
        return Math.floor(num/10000) + "만 " + (num%10000 > 0 ? num%10000 : "");
    },

    getFinalStats: () => {
        const stats = GameDatabase.USER_STATS;
        const formulas = GameDatabase.ENHANCE_FORMULA;
        const lv = data.level || 1;
        let final = { atk: stats.CALC_ATK(lv), def: stats.CALC_DEF(lv), hp: stats.CALC_HP(lv) };

        Object.keys(data.equipment).forEach(slot => {
            const item = data.equipment[slot];
            if (item) {
                const k = item.k || 1; const en = item.en || 0;
                if (slot === 'weapon') final.atk = Math.floor(formulas.weapon(stats.CALC_ATK(lv), k, en));
                else if (slot === 'armor') final.def = Math.floor(formulas.armor(stats.CALC_DEF(lv), k, en));
                else if (slot === 'belt') final.hp = Math.floor(formulas.belt(stats.CALC_HP(lv), k, en));
                else if (slot === 'gloves') final.atk = Math.floor(final.atk * formulas.gloves(k, en));
                else if (slot === 'shoes') final.def = Math.floor(final.def * k * (1 + en * 0.02));
            }
        });
        return final;
    },

    updateUI: () => {
        if(!data) return;
        const nextExp = GameDatabase.USER_STATS.GET_NEXT_EXP(data.level);
        if(data.exp >= nextExp) { MainEngine.checkLevelUp(); return; }
        const stats = MainEngine.getFinalStats();
        
        document.getElementById('info-atk').innerHTML = `<span style='color:#ff5252; font-weight:bold;'>${MainEngine.formatNumber(stats.atk)}</span>`;
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
        
        MainEngine.renderInventory();
        MainEngine.saveGame();
    },

    renderInventory: () => {
        const invList = document.getElementById('inventory-list');
        const eqList = document.getElementById('equipped-list');
        if (!invList || !eqList) return;
        invList.innerHTML = ''; eqList.innerHTML = '';
        data.inventory.forEach((it, idx) => {
            const isEquipped = data.equipment[it.type] && data.equipment[it.type].uid === it.uid;
            let category = (['weapon','armor','belt','gloves','shoes'].includes(it.type)) ? 'equip' : (['potion','ticket','scroll'].includes(it.type)) ? 'consume' : 'etc';
            const html = MainEngine.createItemHTML(it, idx, isEquipped);
            if (isEquipped) eqList.appendChild(html);
            else if (MainEngine.invCurrentTab === category) invList.appendChild(html);
        });
    },

    createItemHTML: (it, idx, isEquipped) => {
        const div = document.createElement('div');
        div.className = 'item-card';
        if (isEquipped) div.style.border = '2px solid #2ecc71';
        const imgTag = it.img ? `<img src="image/${it.img}" class="item-icon" onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📦</text></svg>';">` : '📦';
        div.innerHTML = `${imgTag}<div class="item-info"><strong>${it.name} ${it.en > 0 ? '+'+it.en : ''}</strong>${it.count > 1 ? ` (x${it.count})` : ""}<br><small>${it.info || ""}</small></div>
            <div class="item-actions"><button class="item-btn" onclick="MainEngine.goToUpgrade(${idx})">강화</button>
            <button class="item-btn" onclick="MainEngine.toggleEquip(${idx})">${isEquipped ? '해제' : '장착'}</button>
            <button class="item-btn" style="background:#c0392b; color:white;" onclick="MainEngine.confirmSell(${idx})">판매</button></div>`;
        return div;
    },

    toggleEquip: (idx) => {
        const it = data.inventory[idx];
        if (data.equipment[it.type] && data.equipment[it.type].uid === it.uid) data.equipment[it.type] = null;
        else data.equipment[it.type] = it;
        MainEngine.updateUI();
    },

    addItem: (newItem) => {
        const stackable = ['etc', 'potion', 'scroll', 'ticket'];
        if (stackable.includes(newItem.type)) {
            const existing = data.inventory.find(i => i.type === newItem.type && i.id === newItem.id);
            if (existing) existing.count = (existing.count || 1) + (newItem.count || 1);
            else data.inventory.push({ ...newItem, count: newItem.count || 1 });
        } else {
            data.inventory.push({ ...newItem, en: newItem.en || 0, uid: Date.now() + Math.random() });
        }
        MainEngine.updateUI();
    },

    executeBatchSell: () => {
        const sellNoSkill = document.getElementById('sell-no-skill')?.checked;
        const sellGems = document.getElementById('sell-gems')?.checked;
        const targets = data.inventory.filter(it => {
            const isEquipped = data.equipment[it.type] && data.equipment[it.type].uid === it.uid;
            if (isEquipped) return false;
            if ((it.type === 'etc' || it.type === 'gem') && sellGems) return true;
            if (['weapon','armor','belt','gloves','shoes'].includes(it.type) && (it.en||0) === 0 && sellNoSkill) return true;
            return false;
        });
        if (targets.length === 0) return alert("판매 대상 없음");
        let gold = 0; targets.forEach(t => gold += Math.floor((t.p || 0) * 0.5) * (t.count || 1));
        if (confirm(`${targets.length}개 판매하여 ${MainEngine.formatNumber(gold)}G를 얻으시겠습니까?`)) {
            data.inventory = data.inventory.filter(item => !targets.includes(item));
            data.gold += gold; MainEngine.updateUI();
        }
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
    closeModal: () => { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); },
    openInventoryModal: (mode) => { 
        // 기존 인벤토리 모달 로직 (UpgradeSystem 등에서 사용)
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
                const imgHtml = item.img ? `<img src="image/${item.img}" style="width:30px; height:30px; object-fit:contain; margin-right:8px;" onerror="this.onerror=null; this.replaceWith(document.createTextNode('📦 '));">` : '📦 ';
                div.innerHTML = `${imgHtml}<div style="flex:1;"><b>${item.name}</b> (+${item.en || 0})</div>`;
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

// --- [전역 보조 함수] ---
function showPage(id) {
    if(typeof UpgradeSystem !== 'undefined') UpgradeSystem.stopAuto();
    if (id !== 'page-hunt-play' && MainEngine.isAutoHunting) MainEngine.toggleAutoHunt();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'page-hunt-select') renderHuntingZones();
    if (id === 'page-info') MainEngine.renderInventory();
    MainEngine.updateUI();
}

function renderHuntingZones() {
    const list = document.getElementById('hunting-zone-list');
    if (!list) return; list.innerHTML = '';
    GameDatabase.HUNTING_ZONES.forEach(zone => {
        const btn = document.createElement('button'); btn.className = 'main-menu-btn';
        btn.innerHTML = `🌲 ${zone.name} (Lv.${zone.minLv}~${zone.maxLv})`;
        btn.onclick = () => CombatSystem.enterZone(zone.id); list.appendChild(btn);
    });
}

const ChatSystem = {
    init: () => {
        const chatLog = document.getElementById('chat-log');
        if(!chatLog) return;
        rtdb.ref('chats').limitToLast(30).on('child_added', (snapshot) => {
            const chat = snapshot.val();
            const div = document.createElement('div');
            div.innerHTML = `<span style="color:#f1c40f; font-weight:bold;">[${chat.user}]</span>: ${chat.msg}`;
            chatLog.appendChild(div);
            chatLog.scrollTop = chatLog.scrollHeight;
        });
    },
    send: () => {
        const input = document.getElementById('chat-input');
        if(!input || !input.value.trim() || !currentUser) return;
        rtdb.ref('chats').push({ user: currentUser, msg: input.value, time: Date.now() });
        input.value = '';
    }
};

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
