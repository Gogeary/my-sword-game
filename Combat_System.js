/* Combat_System.js - 중복 선언 제거 및 무한 사냥/물약 제한 적용 완료 */

// 주의: 맨 위에 const SkillHandlers = ... 코드가 없어야 합니다! (Skill_System.js 것을 사용)

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
        const titleEl = document.getElementById('hunt-title');
        if(titleEl) titleEl.innerText = `⚔️ ${zone.name} (Lv.${zone.minLv}~${zone.maxLv})`;
        
        const searchBtn = document.querySelector('#page-hunt-play .main-menu-btn');
        if(searchBtn) searchBtn.innerHTML = `📡 몬스터 탐색 (${zone.cost.toLocaleString()}G)`;

        const log = document.getElementById('battle-log');
        if(log) log.innerHTML = `사냥터에 입장했습니다. (탐색 비용: ${zone.cost.toLocaleString()}G)`;
    },

    // 2. 몬스터 탐색
    scanHunt: () => {
        if (CombatSystem.isEncounter) return alert("이미 몬스터와 조우 중입니다!");

        const z = CombatSystem.currentZone; 
        const cost = z.cost;

        // [비용 체크]
        if (data.gold < cost) {
            if (MainEngine.isAutoHunting) {
                MainEngine.toggleAutoHunt();
                alert("골드가 부족하여 자동 사냥이 중단되었습니다.");
            } else {
                alert(`탐색 비용이 부족합니다. (${cost.toLocaleString()}G 필요)`);
            }
            return;
        }

        data.gold -= cost;
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();

        // 1. 몬스터 생성
        const range = z.maxLv - z.minLv + 1;
        const randomLv = z.minLv + Math.floor(Math.random() * range);
        let monster = CombatSystem.getMonsterData(randomLv);
        monster = CombatSystem.setMonsterIdentity(monster); 

        // 2. 보스 변환 체크
        const isBoss = Math.random() * 100 < GameDatabase.BOSS_DATA.CHANCE;
        const bossInfo = GameDatabase.BOSS_DATA.STAGES[z.id]; 

        if (isBoss && bossInfo) {
            monster.name = bossInfo.name;
            monster.img = bossInfo.img; 
            monster.hp = Math.floor(monster.hp * bossInfo.hpMult);
            monster.maxHp = monster.hp;
            monster.atk = Math.floor(monster.atk * bossInfo.atkMult);
            monster.gold = Math.floor(monster.gold * bossInfo.goldMult);
            monster.exp = Math.floor(monster.exp * bossInfo.expMult);
            monster.isBoss = true; 
        }
        
        CombatSystem.tempMonster = monster;
        CombatSystem.isEncounter = true;

        // [자동 사냥] 조우 화면 스킵하고 바로 전투 시작
        if (typeof MainEngine !== 'undefined' && MainEngine.isAutoHunting) {
            CombatSystem.startBattle();
        } else {
            CombatSystem.renderEncounterUI(monster);
        }
    },

    // 3. 조우 UI 렌더링
    renderEncounterUI: (m) => {
        const grid = document.getElementById('hunt-grid');
        if (!grid) return;
        
        const imgPath = `image/${m.img}`;
        const nameColor = m.isBoss ? '#f1c40f' : '#ffffff'; 
        const borderColor = m.isBoss ? 'border:3px solid #f1c40f;' : 'border:2px solid var(--hunt);';
        const bossTag = m.isBoss ? '<span style="font-size:0.8em; display:block; color:#f1c40f;">[STAGE BOSS]</span>' : '';
        const imgSize = m.isBoss ? "250px" : "200px"; 

        grid.innerHTML = `
            <div style="width:100%; padding:20px; text-align:center; ${borderColor} border-radius:10px; background:rgba(0,0,0,0.2);">
                <img src="${imgPath}" 
                     style="width:${imgSize}; height:${imgSize}; object-fit:contain; margin-bottom:10px; 
                     ${m.isBoss ? 'filter: drop-shadow(0 0 15px #f1c40f);' : ''}" 
                     onerror="this.style.display='none';">
                
                ${bossTag}
                <h3 style="margin:5px 0; color:${nameColor};">${m.name} <span style="color:#e74c3c">Lv.${m.lv}</span></h3>
                <div style="color:#aaa; font-size:0.9em; margin-bottom:15px;">HP: ${m.hp.toLocaleString()}</div>
                
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="main-menu-btn" style="background:#c0392b; width:45%; margin:0;" onclick="CombatSystem.startBattle()">⚔️ 싸운다</button>
                    <button class="main-menu-btn" style="background:#2ecc71; width:45%; margin:0;" onclick="CombatSystem.runAway()">🏃 도망간다</button>
                </div>
                <div style="margin-top:10px; font-size:0.8em; color:#888;">도망 성공률: 80%</div>
            </div>`;
            
        const log = document.getElementById('battle-log');
        if(log) {
            const bossMsg = m.isBoss ? `<strong style="color:#f1c40f">스테이지 보스 [${m.name}]</strong>` : `야생의 <strong>${m.name}</strong>`;
            log.innerHTML = `${bossMsg}(을)를 발견했습니다!`;
        }
    },

    runAway: () => {
        if (!CombatSystem.isEncounter) return;
        if (Math.random() * 100 < 80) { alert("도망쳤습니다!"); CombatSystem.resetBattleUI(); }
        else { alert("도망 실패! 전투 시작!"); CombatSystem.startBattle(); }
    },

    // 4. 전투 시작
    startBattle: () => {
        const m = CombatSystem.tempMonster;
        if (!m) return alert("오류 발생");
        
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
            const equippedItems = Object.values(data.equipment).filter(e => e !== null);

            // --- [1. 유저 공격 턴] ---
            let finalAtk = pStats.atk;
            let atkMsg = "";

            equippedItems.forEach(item => {
                const triggered = SkillSystem.check(item, turn);
                triggered.forEach(s => {
                    // [수정] Skill_System.js에 있는 전역 SkillHandlers 변수를 사용
                    if (typeof SkillHandlers !== 'undefined' && SkillHandlers.OFFENSIVE && SkillHandlers.OFFENSIVE[s.id]) {
                        const res = SkillHandlers.OFFENSIVE[s.id](s.val, pStats);
                        if (res.mul) finalAtk *= res.mul;
                        atkMsg += `<br><span style="color:#f1c40f">⚡ [${s.name}] 발동! ${res.msg}</span>`;
                    }
                    else if (typeof SkillHandlers !== 'undefined' && SkillHandlers.RECOVERY && SkillHandlers.RECOVERY[s.id]) {
                        const res = SkillHandlers.RECOVERY[s.id](s.val, pStats, data.hp);
                        if (res.heal) data.hp = Math.min(pStats.hp, data.hp + res.heal);
                        atkMsg += `<br><span style="color:#2ecc71">✨ [${s.name}] ${res.msg}</span>`;
                    }
                });
            });

            const calcDmg = (atk, dfs) => (atk >= dfs) ? (atk * 2 - dfs) : (Math.pow(atk, 2) / dfs);
            const pDmg = Math.floor(calcDmg(finalAtk, m.def));
            mHP -= pDmg;

            log.innerHTML = `[Turn ${turn}] 유저 공격: ${pDmg} ${atkMsg} (적 HP: ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;

            // --- [2. 유저 승리 판정] ---
if (mHP <= 0) {
    clearInterval(autoTimer);
    autoTimer = null;
    data.gold += m.gold;
    data.exp += m.exp;
    
    let dropMsg = "";

    // [장비 드랍] (10%)
    const targetTier = Math.ceil(m.lv / 5);
    if (Math.random() * 100 < 10) { 
        const validItems = GameDatabase.EQUIPMENT.filter(e => (e.tier || 0) === targetTier);
        if (validItems.length > 0) {
            const baseItem = validItems[Math.floor(Math.random() * validItems.length)];
            
            // ★ 수정: 원본 복사 후 초기화 (uid는 addItem에서 자동 생성됨)
            let newItem = { ...baseItem, en: 0, skills: [] }; 
            
            const countRoll = Math.random() * 100;
            let skillCount = (countRoll < 70) ? 1 : (countRoll < 90) ? 2 : 3;

            if (typeof SkillSystem !== 'undefined') {
                newItem = SkillSystem.attachSkill(newItem, skillCount);
            }

            // ★ 핵심: data.inventory.push 대신 반드시 MainEngine.addItem 사용!
            if (typeof MainEngine !== 'undefined') {
                MainEngine.addItem(newItem); 
            }
            
            dropMsg += `<br><span style="color:#e94560">🎁 [T${targetTier}] ${newItem.name} 획득!</span>`;
        }
    }

    // [보석 드랍] (5%)
    if (Math.random() * 100 < 5) {
        const tierKey = `TIER_${targetTier}`;
        const gemList = (GameDatabase.GEM_DROPS && GameDatabase.GEM_DROPS[tierKey]) ? GameDatabase.GEM_DROPS[tierKey] : null;

        if (gemList && gemList.length > 0) {
            const isRare = (Math.random() * 100) >= 70; 
            const gemIndex = (isRare && gemList.length > 1) ? 1 : 0;
            const dropGem = gemList[gemIndex];

            if (dropGem) {
                // ★ 보석도 MainEngine.addItem을 사용하여 중첩 로직을 태웁니다.
                if (typeof MainEngine !== 'undefined') {
                    MainEngine.addItem({ ...dropGem, count: 1 });
                }
                
                const color = (gemIndex === 1) ? '#9b59b6' : '#2ecc71';
                dropMsg += `<br><span style="color:${color}; font-weight:bold;">💎 ${dropGem.name} 획득!</span>`;
            }
        }
    }

                if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
                log.innerHTML = `<span style="color:var(--money)">★ 승리! +${Math.floor(m.gold)}G, +${Math.floor(m.exp)}EXP</span>${dropMsg}<br>` + log.innerHTML;
                
                CombatSystem.isEncounter = false;
                CombatSystem.tempMonster = null;
                
                // [무한 자동 사냥 (체력 있으면 계속)]
                if (MainEngine.isAutoHunting) {
                    if (data.hp > 0) { 
                        setTimeout(() => {
                            if (MainEngine.isAutoHunting) CombatSystem.scanHunt();
                        }, 1000); 
                    } else {
                        MainEngine.toggleAutoHunt();
                    }
                } else {
                    const cost = CombatSystem.currentZone.cost;
                    if(grid) grid.innerHTML = `
                        <div style="text-align:center; padding:20px;">
                            <h3>승리했습니다!</h3>
                            <p style="font-size:0.9em; margin-bottom:10px;">${dropMsg ? dropMsg : "아이템을 발견하지 못했습니다."}</p>
                            <button class="main-menu-btn" style="background:var(--hunt);" onclick="CombatSystem.scanHunt()">🔍 다시 탐색 (${cost.toLocaleString()}G)</button>
                            <button class="btn-nav" onclick="showPage('page-hunt-select')">🔙 사냥터 목록</button>
                        </div>`;
                }

                if (typeof MainEngine !== 'undefined') MainEngine.checkLevelUp();
                return; 
            }

            // --- [3. 몬스터 공격 턴] ---
            let incDmg = Math.floor(calcDmg(m.atk, pStats.def));
            let defMsg = "";

            equippedItems.forEach(item => {
                const triggered = SkillSystem.check(item, turn);
                triggered.forEach(s => {
                    if (typeof SkillHandlers !== 'undefined' && SkillHandlers.DEFENSIVE && SkillHandlers.DEFENSIVE[s.id]) {
                        const res = SkillHandlers.DEFENSIVE[s.id](s.val);
                        if (res.mul !== undefined) incDmg = Math.floor(incDmg * res.mul);
                        defMsg += `<br><span style="color:#3498db">🛡️ [${s.name}] 발동! ${res.msg}</span>`;
                    }
                });
            });
            
            data.hp -= incDmg;

            const potionResult = CombatSystem.tryAutoPotion(pStats);
            let potionMsg = "";
            if (potionResult.healed > 0) {
                potionMsg = `<br><span style="color:var(--mine)">🧪 자동 회복: +${Math.floor(potionResult.healed)} (소모: ${potionResult.usedCount}개)</span>`;
            }

            log.innerHTML = `피격: ${incDmg} ${defMsg} (내 HP: ${Math.max(0, Math.floor(data.hp))})${potionMsg}<br>` + log.innerHTML;
            
            if (typeof MainEngine !== 'undefined') MainEngine.updateUI();

            // --- [4. 유저 패배 판정 (죽으면 여기서 자동사냥 멈춤)] ---
            if (data.hp <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                
                // 죽었으니까 자동 사냥 중지
                if (MainEngine.isAutoHunting) MainEngine.toggleAutoHunt();
                
                data.hp = 1; // 마을로 돌아가면 체력 1
                alert("패배했습니다... (자동 사냥 종료)");
                
                CombatSystem.resetBattleUI();
                if (typeof MainEngine !== 'undefined') { MainEngine.updateUI(); MainEngine.saveGame(); }
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
        if (zoneId === 0) targetMonsters = [{ name: '슬라임', img: 'slime.png' }, { name: '앞마당 쥐', img: 'rat.png' }];
        else if (zoneId === 1) targetMonsters = [{ name: '화가난 등산객', img: 'hiker.png' }, { name: '고라니', img: 'Elk.png' }];
        else if (zoneId === 2) targetMonsters = [{ name: '곰', img: 'bear.png' }, { name: '호랑이', img: 'tiger.png' }];
        else targetMonsters = [{ name: '알 수 없는 적', img: 'unknown.png' }];
        
        const pick = targetMonsters[Math.floor(Math.random() * targetMonsters.length)];
        m.name = pick.name; m.img = pick.img;
        return m;
    },

    // ─────────────────────────────────────────────────────────────
    // [물약 사용 로직] 10% 제한 적용
    // ─────────────────────────────────────────────────────────────
   /* Combat_System.js 내 수정 부분 */

tryAutoPotion: function(pStats) {
    // 1. 초기 설정 및 전역 데이터 확인
    if (typeof data.potionBuffer === 'undefined') data.potionBuffer = 0;
    const missingHp = pStats.hp - data.hp;

    // 2. 체력이 가득 찼거나 회복할 필요가 없으면 종료
    if (missingHp <= 0) return { healed: 0, usedCount: 0 };

    // 3. 인벤토리에서 물약 아이템 필터링 및 오름차순 정렬 (작은 것부터 소모)
    const potions = data.inventory
        .map(invItem => {
            const dbInfo = GameDatabase.CONSUMABLES.potions.find(p => p.id === invItem.id);
            return dbInfo ? { ...invItem, ...dbInfo } : null;
        })
        .filter(i => i !== null && i.type === 'potion')
        .sort((a, b) => a.val - b.val);

    if (potions.length === 0) return { healed: 0, usedCount: 0 };

    // 4. 남은 물약 총량 계산
    const totalPotionsValue = potions.reduce((acc, cur) => acc + (cur.val * (cur.count || 1)), 0);
    const realRemainingPool = totalPotionsValue - data.potionBuffer;

    if (realRemainingPool <= 0) return { healed: 0, usedCount: 0 };

    // 5. 턴당 최대 회복량 제한 적용 (전체 체력의 10%)
    const limit = Math.floor(pStats.hp * 0.1);
    const healAmount = Math.min(missingHp, realRemainingPool, limit);

    data.hp += healAmount;
    data.potionBuffer += healAmount;

    let usedCount = 0;
    
    // 6. 인벤토리 실제 차감 로직
    while (potions.length > 0) {
        const smallestPotion = potions[0];
        
        if (data.potionBuffer >= smallestPotion.val) {
            data.potionBuffer -= smallestPotion.val;
            usedCount++;

            const inventoryIdx = data.inventory.findIndex(i => i.id === smallestPotion.id);
            if (inventoryIdx !== -1) {
                const invItem = data.inventory[inventoryIdx];
                if (invItem.count > 1) {
                    invItem.count--;
                } else {
                    data.inventory.splice(inventoryIdx, 1);
                    potions.shift(); 
                }
            }
        } else {
            break; 
        }
    }

    // ★ 실시간 UI 반영: 물약이 소모(usedCount > 0)되거나 체력이 변했을 때 즉시 호출
    if (typeof MainEngine !== 'undefined' && MainEngine.updateUI) {
        MainEngine.updateUI();
    }
    
    return { healed: healAmount, usedCount: usedCount };
}
};




