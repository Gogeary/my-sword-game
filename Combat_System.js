/* Combat_System.js - 확장성 강화 버전 */

// [핵심] 장비 타입별 스킬 효과 정의 (여기만 수정하면 장비 확장 가능)
const SkillHandlers = {
    // 1. 공격 턴에 발동하는 효과 (리턴값: 데미지 배율)
    OFFENSIVE: {
        'weapon': (val, pStats) => { return { mul: val, msg: `(x${val})` }; }, 
        'gloves': (val, pStats) => { return { mul: 1.0, msg: `(공격력+${val} 미구현)` }; } // 나중에 장갑 추가 시 여기만 작성하면 됨
    },
    
    // 2. 공격 턴에 발동하지만, 버프/회복 성격인 효과
    RECOVERY: {
        'belt': (val, pStats, currentHP) => {
            const heal = Math.floor(pStats.hp * val);
            return { heal: heal, msg: `체력 회복 +${heal}` };
        },
        'ring': (val, pStats, currentHP) => { 
             return { heal: 0, msg: "마나 회복(미구현)" }; // 나중에 반지 추가 시 예시
        }
    },

    // 3. 방어 턴(적 공격 시)에 발동하는 효과 (리턴값: 데미지 감소 배율)
    DEFENSIVE: {
        'armor': (val) => { return { mul: val, msg: `피해 감소` }; },
        'shoes': (val) => { return { mul: 0, msg: `완전 회피` }; } // 나중에 신발 추가 시 예시
    }
};

const CombatSystem = {
    currentZone: null,
    isEncounter: false,
    tempMonster: null,

    // 1. 사냥터 입장
    enterZone: (zoneId) => {
        const zone = GameDatabase.HUNTING_ZONES.find(z => z.id === zoneId);
        if (!zone) return alert("존재하지 않는 사냥터입니다.");

        CombatSystem.currentZone = zone;
        CombatSystem.resetBattleUI();
        
        showPage('page-hunt-play');
        document.getElementById('hunt-title').innerText = `⚔️ ${zone.name} (Lv.${zone.minLv}~${zone.maxLv})`;
        
        const searchBtn = document.querySelector('#page-hunt-play .main-menu-btn');
        if(searchBtn) searchBtn.innerHTML = `📡 몬스터 탐색 (${zone.cost.toLocaleString()}G)`;

        const log = document.getElementById('battle-log');
        if(log) log.innerHTML = `사냥터에 입장했습니다. (탐색 비용: ${zone.cost.toLocaleString()}G)`;
    },

    // 2. 몬스터 탐색
    scanHunt: () => {
        if (CombatSystem.isEncounter) return alert("이미 몬스터와 조우 중입니다!");

        const cost = CombatSystem.currentZone.cost;
        if (data.gold < cost) {
            return alert(`탐색 비용이 부족합니다. (${cost.toLocaleString()}G 필요)`);
        }

        data.gold -= cost;
        if (window.MainEngine) MainEngine.updateUI();

        const z = CombatSystem.currentZone;
        const range = z.maxLv - z.minLv + 1;
        const randomLv = z.minLv + Math.floor(Math.random() * range);
        
        let monster = CombatSystem.getMonsterData(randomLv);
        monster = CombatSystem.setMonsterIdentity(monster);
        
        CombatSystem.tempMonster = monster;
        CombatSystem.isEncounter = true;

        CombatSystem.renderEncounterUI(monster);
    },

    // 3. 조우 UI 렌더링
    renderEncounterUI: (m) => {
        const grid = document.getElementById('hunt-grid');
        if (!grid) return;
        const imgPath = `image/${m.img}`;
        grid.innerHTML = `
            <div style="width:100%; padding:20px; text-align:center; border:2px solid var(--hunt); border-radius:10px; background:rgba(0,0,0,0.2);">
                <img src="${imgPath}" style="width:100px; height:100px; object-fit:contain; margin-bottom:10px;" onerror="this.style.display='none';">
                <h3 style="margin:5px 0;">${m.name} <span style="color:#e74c3c">Lv.${m.lv}</span></h3>
                <div style="color:#aaa; font-size:0.9em; margin-bottom:15px;">HP: ${m.hp.toLocaleString()}</div>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="main-menu-btn" style="background:#c0392b; width:45%; margin:0;" onclick="CombatSystem.startBattle()">⚔️ 싸운다</button>
                    <button class="main-menu-btn" style="background:#2ecc71; width:45%; margin:0;" onclick="CombatSystem.runAway()">🏃 도망간다</button>
                </div>
                <div style="margin-top:10px; font-size:0.8em; color:#888;">도망 성공률: 80%</div>
            </div>`;
        const log = document.getElementById('battle-log');
        if(log) log.innerHTML = `야생의 <strong>${m.name}</strong>(을)를 발견했습니다!`;
    },

    runAway: () => {
        if (!CombatSystem.isEncounter) return;
        if (Math.random() * 100 < 80) { alert("도망쳤습니다!"); CombatSystem.resetBattleUI(); }
        else { alert("도망 실패! 전투 시작!"); CombatSystem.startBattle(); }
    },

    // 4. 전투 시작 (확장성 + 드랍 로직 적용됨)
    startBattle: () => {
        const m = CombatSystem.tempMonster;
        if (!m) return alert("오류 발생");
        
        // UI 세팅
        const grid = document.getElementById('hunt-grid');
        const imgPath = `image/${m.img}`;
        if(grid) grid.innerHTML = `
            <div style="padding:20px; text-align:center; border:2px solid #e74c3c; border-radius:10px; background:rgba(231, 76, 60, 0.1);">
                <img src="${imgPath}" style="width:100px; height:100px; object-fit:contain; animation: shake 0.5s infinite alternate; mix-blend-mode: multiply;" onerror="this.style.display='none';">
                <h3 style="margin:10px 0; color:#e74c3c;">VS ${m.name}</h3>
                <div id="battle-status" style="font-size:0.9em; color:#ccc;">전투 시작!</div>
            </div>`;

        const log = document.getElementById('battle-log');
        let mHP = m.hp;
        let turn = 0;

        if (autoTimer) clearInterval(autoTimer);

        autoTimer = setInterval(() => {
            turn++;
            const pStats = MainEngine.getFinalStats();
            // [중요] 장착된 모든 장비를 배열로 가져옴 (타입 상관없이 순회 가능)
            const equippedItems = Object.values(data.equipment).filter(e => e !== null);

            // --- [유저 턴] ---
            let finalAtk = pStats.atk;
            let atkMsg = "";

            // 모든 장착 장비를 돌면서 '공격형' 또는 '회복형' 스킬 체크
            equippedItems.forEach(item => {
                const triggered = SkillSystem.check(item, turn);
                triggered.forEach(s => {
                    // 1. 공격형 핸들러가 있는지 확인 (Weapon 등)
                    if (SkillHandlers.OFFENSIVE[item.type]) {
                        const res = SkillHandlers.OFFENSIVE[item.type](s.val, pStats);
                        if (res.mul) finalAtk *= res.mul;
                        atkMsg += `<br><span style="color:#f1c40f">⚡ [${s.name}] 발동! ${res.msg}</span>`;
                    }
                    // 2. 회복형 핸들러가 있는지 확인 (Belt 등)
                    else if (SkillHandlers.RECOVERY[item.type]) {
                        const res = SkillHandlers.RECOVERY[item.type](s.val, pStats, data.hp);
                        if (res.heal) data.hp = Math.min(pStats.hp, data.hp + res.heal);
                        atkMsg += `<br><span style="color:#2ecc71">✨ [${s.name}] ${res.msg}</span>`;
                    }
                });
            });

            const calcDmg = (atk, dfs) => (atk >= dfs) ? (atk * 2 - dfs) : (Math.pow(atk, 2) / dfs);
            const pDmg = Math.floor(calcDmg(finalAtk, m.def));
            mHP -= pDmg;

            log.innerHTML = `[Turn ${turn}] 유저 공격: ${pDmg} ${atkMsg} (적 HP: ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;

            // [승리 및 드랍 로직]
            if (mHP <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                data.gold += m.gold;
                data.exp += m.exp;
                
                // --- 드랍 로직 시작 ---
                let dropMsg = "";
                // 드랍 확률 30%
                if (Math.random() * 100 < 30) {
                    // 조건: 몬스터 레벨(m.lv) 이하, 그리고 몬스터 레벨 -10 이상인 장비만 드랍
                    const validItems = GameDatabase.EQUIPMENT.filter(e => e.lv <= m.lv && e.lv >= m.lv - 10);
                    
                    if (validItems.length > 0) {
                        const baseItem = validItems[Math.floor(Math.random() * validItems.length)];
                        // 새 아이템 생성
                        let newItem = { ...baseItem, id: Date.now(), en: 0, skills: [] };
                        
                        // 스킬 부여 확률 30%
                        if (Math.random() * 100 < 30) {
                            // 스킬 개수: 1개(80%) vs 2개(20%)
                            const countRoll = Math.random() * 100;
                            const skillCount = (countRoll < 80) ? 1 : 2;
                            newItem = SkillSystem.attachSkill(newItem, skillCount);
                        }
                        
                        data.inventory.push(newItem);
                        dropMsg = `<br><span style="color:#e94560">🎁 [${newItem.name}] 획득!</span>`;
                    }
                }
                // ---------------------

                if (window.MainEngine) MainEngine.updateUI();

                log.innerHTML = `<span style="color:var(--money)">★ 승리! +${Math.floor(m.gold)}G, +${Math.floor(m.exp)}EXP</span>${dropMsg}<br>` + log.innerHTML;
                
                CombatSystem.isEncounter = false;
                CombatSystem.tempMonster = null;
                
                const cost = CombatSystem.currentZone.cost;
                if(grid) grid.innerHTML = `
                    <div style="text-align:center; padding:20px;">
                        <h3>승리했습니다!</h3>
                        <p style="font-size:0.9em; margin-bottom:10px;">${dropMsg ? dropMsg : "아이템을 발견하지 못했습니다."}</p>
                        <button class="main-menu-btn" style="background:var(--hunt);" onclick="CombatSystem.scanHunt()">🔍 다시 탐색 (${cost.toLocaleString()}G)</button>
                        <button class="btn-nav" onclick="showPage('page-hunt-select')">🔙 사냥터 목록</button>
                    </div>`;
                
                if (window.MainEngine) MainEngine.checkLevelUp();
                return;
            }

            // --- [몬스터 턴] ---
            let incDmg = Math.floor(calcDmg(m.atk, pStats.def));
            let defMsg = "";

            // 모든 장착 장비를 돌면서 '방어형' 스킬 체크
            equippedItems.forEach(item => {
                const triggered = SkillSystem.check(item, turn);
                triggered.forEach(s => {
                    // 3. 방어형 핸들러가 있는지 확인 (Armor 등)
                    if (SkillHandlers.DEFENSIVE[item.type]) {
                        const res = SkillHandlers.DEFENSIVE[item.type](s.val);
                        if (res.mul !== undefined) incDmg = Math.floor(incDmg * res.mul);
                        defMsg += `<br><span style="color:#3498db">🛡️ [${s.name}] 발동! ${res.msg}</span>`;
                    }
                });
            });

            data.hp -= incDmg;
            CombatSystem.tryAutoPotion(pStats);

            log.innerHTML = `피격: ${incDmg} ${defMsg} (내 HP: ${Math.max(0, Math.floor(data.hp))})<br>` + log.innerHTML;
            if (window.MainEngine) MainEngine.updateUI();

            // [패배]
            if (data.hp <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                data.hp = 1;
                alert("패배했습니다... 마을로 귀환합니다.");
                CombatSystem.resetBattleUI();
                if (window.MainEngine) { MainEngine.updateUI(); MainEngine.saveGame(); }
                showPage('page-main');
            }

        }, GameDatabase.SYSTEM.COMBAT_SPEED);
    },

    resetBattleUI: () => {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        CombatSystem.isEncounter = false;
        CombatSystem.tempMonster = null;

        const grid = document.getElementById('hunt-grid');
        const cost = CombatSystem.currentZone ? CombatSystem.currentZone.cost : 0;

        if (grid) {
            grid.innerHTML = `
                <div style="text-align:center; color:#888; padding:30px;">
                    <div style="font-size:3em; margin-bottom:10px;">📡</div>
                    <p>몬스터를 탐색해주세요.</p>
                    <p style="font-size:0.8em;">탐색 비용: ${cost.toLocaleString()} G</p>
                </div>
            `;
        }
        const log = document.getElementById('battle-log');
        if (log) log.innerHTML = "전투 대기 중...";
    },

    getMonsterData: (lv) => {
        const table = GameDatabase.MONSTER_TABLE;
        let idx = lv - 1; if(idx < 0) idx=0; if(idx >= table.length) idx=table.length-1;
        return { ...table[idx] };
    },

    setMonsterIdentity: (m) => {
        if (m.name && m.img) return m;

        const zoneId = CombatSystem.currentZone ? CombatSystem.currentZone.id : 0;
        let targetMonsters = [];

        if (zoneId === 0) {
            targetMonsters = [
                { name: '슬라임', img: 'slime.png' },
                { name: '앞마당 쥐', img: 'rat.png' } 
            ];
        } 
        else if (zoneId === 1) {
            targetMonsters = [
                { name: '화가난 등산객', img: 'hiker.png' },
                { name: '고라니', img: 'Elk.png' }
            ];
        }
        else {
            targetMonsters = [
                { name: '알 수 없는 적', img: 'unknown.png' }
            ];
        }

        const pick = targetMonsters[Math.floor(Math.random() * targetMonsters.length)];
        m.name = pick.name;
        m.img = pick.img;
        return m;
    },

    tryAutoPotion: (pStats) => {
        if (typeof data.potionBuffer === 'undefined') data.potionBuffer = 0;
        const missingHp = pStats.hp - data.hp;
        if (missingHp <= 0) return; 
        const potions = data.inventory.filter(i => i.type === 'potion').sort((a, b) => a.val - b.val);
        if (potions.length === 0) return;
        const totalPotionsValue = potions.reduce((acc, cur) => acc + cur.val, 0);
        const realRemainingPool = totalPotionsValue - data.potionBuffer;
        if (realRemainingPool <= 0) return;
        const healAmount = Math.min(missingHp, realRemainingPool);
        data.hp += healAmount;
        data.potionBuffer += healAmount;
        while (potions.length > 0) {
            const smallestPotion = potions[0];
            if (data.potionBuffer >= smallestPotion.val) {
                data.potionBuffer -= smallestPotion.val;
                const realIdx = data.inventory.findIndex(i => i.id === smallestPotion.id);
                if (realIdx !== -1) {
                    data.inventory.splice(realIdx, 1);
                    potions.shift();
                } else break;
            } else break;
        }
        if (window.MainEngine) MainEngine.updateUI();
    }
};
