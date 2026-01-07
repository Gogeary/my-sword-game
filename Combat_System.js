/* Combat_System.js 수정본 */

const CombatSystem = {
    currentZone: null,
    isEncounter: false,
    tempMonster: null,

    // 1. 사냥터 입장 (UI 텍스트 갱신 추가)
    enterZone: (zoneId) => {
        const zone = GameDatabase.HUNTING_ZONES.find(z => z.id === zoneId);
        if (!zone) return alert("존재하지 않는 사냥터입니다.");

        CombatSystem.currentZone = zone;
        CombatSystem.resetBattleUI(); // 입장 시 UI 초기화
        
        showPage('page-hunt-play');
        document.getElementById('hunt-title').innerText = `⚔️ ${zone.name} (Lv.${zone.minLv}~${zone.maxLv})`;
        
        // [수정] 탐색 버튼 텍스트를 현재 사냥터 비용으로 변경
        const searchBtn = document.querySelector('#page-hunt-play .main-menu-btn');
        if(searchBtn) searchBtn.innerHTML = `📡 몬스터 탐색 (${zone.cost.toLocaleString()}G)`;

        // [수정] 로그에 비용 표시
        const log = document.getElementById('battle-log');
        if(log) log.innerHTML = `사냥터에 입장했습니다. (탐색 비용: ${zone.cost.toLocaleString()}G)`;
    },

    // 2. 몬스터 탐색 (비용 적용)
    scanHunt: () => {
        if (CombatSystem.isEncounter) return alert("이미 몬스터와 조우 중입니다!");

        // [수정] 현재 사냥터의 비용(cost)을 가져옴
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

    // ... (renderEncounterUI, runAway는 기존과 동일, 생략 가능) ...
    renderEncounterUI: (m) => { /* 기존 코드 유지 */
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
    
    runAway: () => { /* 기존 코드 유지 */
        if (!CombatSystem.isEncounter) return;
        if (Math.random() * 100 < 80) { alert("도망쳤습니다!"); CombatSystem.resetBattleUI(); }
        else { alert("도망 실패! 전투 시작!"); CombatSystem.startBattle(); }
    },

   // 4. 전투 시작 (턴제 스킬 + 아이템 드랍 추가)
    startBattle: () => {
        const m = CombatSystem.tempMonster;
        if (!m) return alert("오류 발생");
        
        // UI 초기화
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
        let turn = 0; // 턴 카운트

        if (autoTimer) clearInterval(autoTimer);

        autoTimer = setInterval(() => {
            turn++; // 턴 증가
            const pStats = MainEngine.getFinalStats();
            const eq = data.equipment;

            // --- [유저 턴] ---
            let finalAtk = pStats.atk;
            let atkMsg = "";

            // 무기 스킬 체크
            if (eq.weapon) {
                const s = SkillSystem.check(eq.weapon, turn);
                if (s) {
                    finalAtk *= s.val;
                    atkMsg = `<br><span style="color:#f1c40f">⚡ [${eq.weapon.name}] 발동! (x${s.val})</span>`;
                }
            }
            // 벨트 스킬 체크
            if (eq.belt) {
                const s = SkillSystem.check(eq.belt, turn);
                if (s && s.id === 'heal') {
                    const heal = Math.floor(pStats.hp * s.val);
                    data.hp = Math.min(pStats.hp, data.hp + heal);
                    atkMsg += `<br><span style="color:#2ecc71">✨ [${eq.belt.name}] 체력 회복 +${heal}</span>`;
                }
            }

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
                
                // --- [여기 추가됨] 아이템 드랍 시스템 ---
                let dropMsg = "";
                // 1. 드랍 확률 (예: 30%)
                if (Math.random() * 100 < 30) {
                    // 2. 몬스터 레벨 이하의 아이템 중 랜덤 선택
                    const dropList = GameDatabase.EQUIPMENT.filter(e => e.lv <= m.lv);
                    if (dropList.length > 0) {
                        const baseItem = dropList[Math.floor(Math.random() * dropList.length)];
                        
                        // 3. 새 아이템 생성 및 스킬 부여 시도
                        let newItem = { ...baseItem, id: Date.now(), en: 0 };
                        newItem = SkillSystem.attachSkill(newItem); // 확률적으로 스킬 붙음
                        
                        // 4. 인벤토리 지급
                        data.inventory.push(newItem);
                        dropMsg = `<br><span style="color:#e94560">🎁 [${newItem.name}] 획득!</span>`;
                    }
                }
                // ------------------------------------

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

            // 갑옷 스킬 체크
            if (eq.armor) {
                const s = SkillSystem.check(eq.armor, turn);
                if (s) {
                    incDmg = Math.floor(incDmg * s.val);
                    defMsg = `<br><span style="color:#3498db">🛡️ [${eq.armor.name}] 발동! 피해 감소</span>`;
                }
            }

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
    
    // [수정] UI 리셋 시 비용 표시
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
    
    // ... (getMonsterData, setMonsterIdentity, tryAutoPotion 등은 기존 유지) ...
    getMonsterData: (lv) => { /* 기존 코드 유지 */ 
        const table = GameDatabase.MONSTER_TABLE;
        let idx = lv - 1; if(idx < 0) idx=0; if(idx >= table.length) idx=table.length-1;
        return { ...table[idx] };
    },
    // [여기만 덮어쓰세요] 몬스터 종류 결정 로직
    setMonsterIdentity: (m) => {
        // 1. DB에 이미 이름/이미지가 있다면 유지
        if (m.name && m.img) return m;

        // 2. 현재 사냥터 ID 확인
        const zoneId = CombatSystem.currentZone ? CombatSystem.currentZone.id : 0;
        
        let targetMonsters = [];

        // 3. 사냥터별 몬스터 명단 작성
        if (zoneId === 0) {
            // [집 앞마당] (id: 0) -> 슬라임, 쥐
            targetMonsters = [
                { name: '슬라임', img: 'slime.png' },
                { name: '앞마당 쥐', img: 'rat.png' } 
            ];
        } 
        else if (zoneId === 1) {
            // [뒷산] (id: 1) -> 산적, 늑대 (예시)
            targetMonsters = [
                { name: '화가난 등산객', img: 'hiker.png' },
                { name: '고라니', img: 'Elk.png' }
            ];
        }
        else {
            // [나머지 구역] (임시)
            targetMonsters = [
                { name: '알 수 없는 적', img: 'unknown.png' }
            ];
        }

        // 4. 명단에서 랜덤 1마리 뽑기
        const pick = targetMonsters[Math.floor(Math.random() * targetMonsters.length)];

        // 5. 몬스터 정보 적용
        m.name = pick.name;
        m.img = pick.img;

        return m;
    },
    tryAutoPotion: (pStats) => { /* 기존 코드 유지 */
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




