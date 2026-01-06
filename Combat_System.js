/* ==========================================
   [Combat_System.js] 
   전투 및 물약 시스템 (실시간 UI 갱신 적용)
   ========================================== */

const CombatSystem = {
    // 1. 몬스터 탐색
    scanHunt: () => {
        const grid = document.getElementById('hunt-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            let randomLv = data.level + Math.floor(Math.random() * 11) - 5;
            const mLv = Math.min(30, Math.max(1, randomLv));
            const monster = CombatSystem.getMonsterData(mLv);

            const cell = document.createElement('div');
            cell.className = 'cell';
            let color = mLv > data.level ? '#e74c3c' : (mLv < data.level ? '#2ecc71' : '#f1c40f');
            
            cell.innerHTML = `👾<span class="monster-lv" style="color:${color}">Lv.${mLv}</span>`;
            cell.onclick = () => CombatSystem.startBattle(monster);
            grid.appendChild(cell);
        }
    },

    getMonsterData: (lv) => {
        const table = GameDatabase.MONSTER_TABLE;
        if (!table || table.length === 0) return null;
        let idx = lv - 1;
        if (idx < 0) idx = 0;
        if (idx >= table.length) idx = table.length - 1;
        return { ...table[idx] };
    },

    // 2. 스마트 물약 사용 (총량 공유 & 누적 사용)
    tryAutoPotion: (pStats) => {
        if (typeof data.potionBuffer === 'undefined') data.potionBuffer = 0;

        const missingHp = pStats.hp - data.hp;
        if (missingHp <= 0) return; 

        // 인벤토리 물약 검색 (작은 순 정렬)
        const potions = data.inventory.filter(i => i.type === 'potion').sort((a, b) => a.val - b.val);
        if (potions.length === 0) return;

        // 실제 남은 회복량 계산
        const totalPotionsValue = potions.reduce((acc, cur) => acc + cur.val, 0);
        const realRemainingPool = totalPotionsValue - data.potionBuffer;

        if (realRemainingPool <= 0) return;

        // 회복 실행
        const healAmount = Math.min(missingHp, realRemainingPool);
        data.hp += healAmount;
        data.potionBuffer += healAmount; // 누적 사용량 증가 (여기서 총량이 줄어듦)

        // 아이템 소모 판단 (누적량이 아이템 용량을 넘었는지)
        while (potions.length > 0) {
            const smallestPotion = potions[0];
            
            if (data.potionBuffer >= smallestPotion.val) {
                // 아이템 하나 소모
                data.potionBuffer -= smallestPotion.val;
                const realIdx = data.inventory.findIndex(i => i.id === smallestPotion.id);
                if (realIdx !== -1) {
                    data.inventory.splice(realIdx, 1);
                    potions.shift();
                    
                    const log = document.getElementById('battle-log');
                    if (log) log.innerHTML = `<span style="color:#e67e22">🧪 ${smallestPotion.name} 1개 완전 소모!</span><br>` + log.innerHTML;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        // [수정] 물약 사용 로직이 끝날 때마다 UI 갱신 (총량 감소 반영)
        if (window.MainEngine) MainEngine.updateUI();
    },

    // 3. 전투 실행 루프
    startBattle: (m) => {
        if (!m) return alert("오류");
        if (data.hp <= 1) return alert('체력이 부족합니다. 치료소나 물약을 사용하세요.');
        
        const log = document.getElementById('battle-log');
        if (log) log.innerHTML = `[시스템] Lv.${m.lv} 몬스터와 전투 시작!<br>`;
        
        const pStats = MainEngine.getFinalStats();
        let mHP = m.hp;

        if (autoTimer) clearInterval(autoTimer);

        autoTimer = setInterval(() => {
            const calcDmg = (atk, dfs) => (atk >= dfs) ? (atk * 2 - dfs) : (Math.pow(atk, 2) / dfs);
            
            // [유저 턴]
            const pDmg = Math.floor(calcDmg(pStats.atk, m.def));
            mHP -= pDmg;
            log.innerHTML = `유저 공격: ${pDmg} (적 HP: ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;
            
            // [승리 체크]
            if (mHP <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                data.gold += m.gold;
                data.exp += m.exp;
                log.innerHTML = `<span style="color:var(--money)">★ 승리! +${Math.floor(m.gold)}G, +${Math.floor(m.exp)}EXP</span><br>` + log.innerHTML;
                if (window.MainEngine) { MainEngine.checkLevelUp(); MainEngine.updateUI(); }
                return;
            }

            // [몬스터 턴]
            let mDmg = Math.floor(calcDmg(m.atk, pStats.def));
            data.hp -= mDmg;
            
            // [물약 사용 시도]
            CombatSystem.tryAutoPotion(pStats);

            log.innerHTML = `피격: ${mDmg} (내 HP: ${Math.max(0, Math.floor(data.hp))})<br>` + log.innerHTML;

            // [중요] 매 턴마다 UI 강제 갱신 (HP바, 포션총량 실시간 반영)
            if (window.MainEngine) MainEngine.updateUI();

            // [패배 체크]
            if (data.hp <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                data.hp = 1;
                alert("패배했습니다. 마을로 귀환합니다.");
                if (window.MainEngine) { MainEngine.updateUI(); MainEngine.saveGame(); }
                showPage('page-main');
                if (log) log.innerHTML = "전투 대기 중...";
            }
        }, GameDatabase.SYSTEM.COMBAT_SPEED);
    }
};
