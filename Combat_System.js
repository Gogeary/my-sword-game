const CombatSystem = {
    currentZone: null,   // 현재 선택한 사냥터 정보
    isEncounter: false,  // 몬스터 조우 상태 (탐색 잠금용)
    tempMonster: null,   // 조우한 몬스터 데이터 저장

    // 1. 사냥터 입장 (UI에서 호출)
    enterZone: (zoneId) => {
        const zone = GameDatabase.HUNTING_ZONES.find(z => z.id === zoneId);
        if (!zone) return alert("존재하지 않는 사냥터입니다.");

        CombatSystem.currentZone = zone;
        CombatSystem.resetBattleUI(); // 입장 시 UI 초기화
        
        // 페이지 이동 및 타이틀 설정
        showPage('page-hunt-play');
        document.getElementById('hunt-title').innerText = `⚔️ ${zone.name} (Lv.${zone.minLv}~${zone.maxLv})`;
        
        // 로그 초기화
        const log = document.getElementById('battle-log');
        if(log) log.innerHTML = "사냥터에 입장했습니다. 몬스터를 탐색하세요. (비용: 20,000G)";
    },

    // 2. 몬스터 탐색 (2만 골드 소모)
    scanHunt: () => {
        // [조건 5] 조우 상태에서는 탐색 불가
        if (CombatSystem.isEncounter) {
            return alert("이미 몬스터와 조우 중입니다! 싸우거나 도망가세요.");
        }

        // [조건 4] 비용 체크
        const cost = GameDatabase.SYSTEM.SCAN_COST;
        if (data.gold < cost) {
            return alert(`탐색 비용이 부족합니다. (${cost.toLocaleString()}G 필요)`);
        }

        // 비용 차감
        data.gold -= cost;
        if (window.MainEngine) MainEngine.updateUI();

        // 몬스터 생성 (해당 사냥터 레벨 범위 내)
        const z = CombatSystem.currentZone;
        const range = z.maxLv - z.minLv + 1;
        const randomLv = z.minLv + Math.floor(Math.random() * range);
        
        // 몬스터 데이터 가져오기 & 설정
        let monster = CombatSystem.getMonsterData(randomLv);
        monster = CombatSystem.setMonsterIdentity(monster); // 이름/이미지 설정
        
        CombatSystem.tempMonster = monster;
        CombatSystem.isEncounter = true; // 조우 상태 On

        // UI 그리기
        CombatSystem.renderEncounterUI(monster);
    },

    // 조우 화면 그리기 (전투/도망 버튼)
    renderEncounterUI: (m) => {
        const grid = document.getElementById('hunt-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        const imgPath = `image/${m.img}`;
        
        // [조건 3] 전투 or 도망 선택지
        grid.innerHTML = `
            <div style="width:100%; padding:20px; text-align:center; border:2px solid var(--hunt); border-radius:10px; background:rgba(0,0,0,0.2);">
                <img src="${imgPath}" 
                     style="width:100px; height:100px; object-fit:contain; margin-bottom:10px;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="font-size:3em; display:none; margin-bottom:10px;">👾</div>
                
                <h3 style="margin:5px 0;">${m.name} <span style="color:#e74c3c">Lv.${m.lv}</span></h3>
                <div style="color:#aaa; font-size:0.9em; margin-bottom:15px;">
                    HP: ${m.hp.toLocaleString()} | 공: ${m.atk} | 방: ${m.def}
                </div>
                
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="main-menu-btn" style="background:#c0392b; width:45%; margin:0;" onclick="CombatSystem.startBattle()">⚔️ 싸운다</button>
                    <button class="main-menu-btn" style="background:#2ecc71; width:45%; margin:0;" onclick="CombatSystem.runAway()">🏃 도망간다</button>
                </div>
                <div style="margin-top:10px; font-size:0.8em; color:#888;">도망 성공률: 80%</div>
            </div>
        `;

        const log = document.getElementById('battle-log');
        if(log) log.innerHTML = `야생의 <strong>${m.name}</strong>(을)를 발견했습니다! 어떻게 하시겠습니까?`;
    },

    // 3. 도망가기 (80% 성공)
    runAway: () => {
        if (!CombatSystem.isEncounter) return;

        const rand = Math.random() * 100;
        if (rand < 80) {
            // 도망 성공
            alert("무사히 도망쳤습니다!");
            CombatSystem.resetBattleUI(); // 초기화
        } else {
            // 도망 실패 -> 강제 전투
            alert("도망에 실패했습니다! 전투가 강제로 시작됩니다!");
            CombatSystem.startBattle();
        }
    },

    // 4. 전투 시작
    startBattle: () => {
        const m = CombatSystem.tempMonster;
        if (!m) return alert("몬스터 정보가 없습니다.");
        if (data.hp <= 1) return alert('체력이 부족합니다.');

        // UI를 전투 모드로 변경
        const grid = document.getElementById('hunt-grid');
        const imgPath = `image/${m.img}`;
        
        if(grid) grid.innerHTML = `
            <div style="padding:20px; text-align:center; border:2px solid #e74c3c; border-radius:10px; background:rgba(231, 76, 60, 0.1);">
                <img src="${imgPath}" 
                     style="width:100px; height:100px; object-fit:contain; animation: shake 0.5s infinite alternate; mix-blend-mode: multiply;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="font-size:3em; display:none;">⚔️</div>
                <h3 style="margin:10px 0; color:#e74c3c;">VS ${m.name}</h3>
                <div id="battle-status" style="font-size:0.9em; color:#ccc;">전투 진행 중...</div>
            </div>
        `;

        const log = document.getElementById('battle-log');
        const pStats = MainEngine.getFinalStats();
        let mHP = m.hp;

        if (autoTimer) clearInterval(autoTimer);

        autoTimer = setInterval(() => {
            const calcDmg = (atk, dfs) => (atk >= dfs) ? (atk * 2 - dfs) : (Math.pow(atk, 2) / dfs);
            
            // 유저 공격
            const pDmg = Math.floor(calcDmg(pStats.atk, m.def));
            mHP -= pDmg;
            log.innerHTML = `유저 공격: ${pDmg} (적 HP: ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;
            
            // [승리]
            if (mHP <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                data.gold += m.gold;
                data.exp += m.exp;
                if (window.MainEngine) MainEngine.updateUI();
                
                log.innerHTML = `<span style="color:var(--money)">★ 승리! +${Math.floor(m.gold)}G, +${Math.floor(m.exp)}EXP</span><br>` + log.innerHTML;
                
                CombatSystem.isEncounter = false; // 조우 해제
                CombatSystem.tempMonster = null;
                
                // 다시 탐색 버튼 표시
                if(grid) {
                    grid.innerHTML = `
                        <div style="text-align:center; padding:20px;">
                            <h3>승리했습니다!</h3>
                            <button class="main-menu-btn" style="background:var(--hunt);" onclick="CombatSystem.scanHunt()">🔍 다시 탐색 (20,000G)</button>
                            <button class="btn-nav" onclick="showPage('page-hunt-select')">🔙 사냥터 목록</button>
                        </div>
                    `;
                }
                
                if (window.MainEngine) { MainEngine.checkLevelUp(); MainEngine.updateUI(); }
                return;
            }

            // 몬스터 공격
            let mDmg = Math.floor(calcDmg(m.atk, pStats.def));
            data.hp -= mDmg;
            CombatSystem.tryAutoPotion(pStats);

            log.innerHTML = `피격: ${mDmg} (내 HP: ${Math.max(0, Math.floor(data.hp))})<br>` + log.innerHTML;
            if (window.MainEngine) MainEngine.updateUI();

            // [패배]
            if (data.hp <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                data.hp = 1;
                
                // [조건 1] 패배 시 초기화 및 마을 귀환
                alert("패배했습니다... 마을로 귀환합니다.");
                CombatSystem.resetBattleUI(); // 전투 상태 초기화
                CombatSystem.isEncounter = false;
                CombatSystem.tempMonster = null;
                
                if (window.MainEngine) { MainEngine.updateUI(); MainEngine.saveGame(); }
                
                showPage('page-main'); // 메인으로 강제 이동
            }
        }, GameDatabase.SYSTEM.COMBAT_SPEED);
    },

    // 전투 UI 및 상태 초기화 함수 (패배 시, 도망 성공 시, 입장 시 호출)
    resetBattleUI: () => {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        CombatSystem.isEncounter = false;
        CombatSystem.tempMonster = null;

        const grid = document.getElementById('hunt-grid');
        if (grid) {
            grid.innerHTML = `
                <div style="text-align:center; color:#888; padding:30px;">
                    <div style="font-size:3em; margin-bottom:10px;">📡</div>
                    <p>몬스터를 탐색해주세요.</p>
                    <p style="font-size:0.8em;">탐색 비용: 20,000 G</p>
                </div>
            `;
        }
        const log = document.getElementById('battle-log');
        if (log) log.innerHTML = "전투 대기 중...";
    },

    // 헬퍼 함수들 (기존 로직)
    getMonsterData: (lv) => {
        const table = GameDatabase.MONSTER_TABLE;
        if (!table || table.length === 0) return null;
        let idx = lv - 1;
        if (idx < 0) idx = 0;
        if (idx >= table.length) idx = table.length - 1;
        return { ...table[idx] };
    },
    setMonsterIdentity: (m) => {
        if(m.name && m.img) return m;
        const types = [{ name: '슬라임', img: 'slime.png' }];
        const type = types[0];
        m.name = type.name;
        m.img = type.img;
        return m;
    },
    tryAutoPotion: (pStats) => { /* 기존 로직 동일 (생략 가능하나 유지 권장) */ 
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

