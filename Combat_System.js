/* ==========================================
   [Combat_System.js] 
   포션 총량 공유 & 누적 사용 시스템 적용
   ========================================== */

const CombatSystem = {
    // 1. 몬스터 탐색 (기존 유지)
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

    // 2. [핵심] 누적 버퍼를 이용한 스마트 물약 사용
    tryAutoPotion: (pStats) => {
        // 데이터 초기화 (없으면 생성)
        if (typeof data.potionBuffer === 'undefined') data.potionBuffer = 0;

        const missingHp = pStats.hp - data.hp;
        if (missingHp <= 0) return; // 회복할 필요 없음

        // 1. 보유 물약 계산 (작은 순서대로 정렬)
        // 물약이 없으면 회복 불가
        const potions = data.inventory.filter(i => i.type === 'potion').sort((a, b) => a.val - b.val);
        if (potions.length === 0) return;

        // 2. 전체 회복 가능 총량 계산
        const totalPotionsValue = potions.reduce((acc, cur) => acc + cur.val, 0);
        // 실질적 남은 회복량 = (물약 총합) - (이미 사용했지만 아이템 차감 안 된 누적치)
        const realRemainingPool = totalPotionsValue - data.potionBuffer;

        if (realRemainingPool <= 0) return; // 물약은 있지만 버퍼가 꽉 차서 더 못씀

        // 3. 회복 실행
        // 이번에 회복할 양 (잃은 체력 vs 남은 물약 총량 중 작은 것)
        const healAmount = Math.min(missingHp, realRemainingPool);
        
        data.hp += healAmount;
        data.potionBuffer += healAmount; // 누적 사용량 증가

        // 4. 아이템 차감 로직 (Buffer가 물약 용량을 초과했는지 체크)
        // 가장 작은 물약부터 확인하면서 버퍼를 깎아나감
        while (potions.length > 0) {
            const smallestPotion = potions[0]; // 가장 작은 물약 (예: 100)

            // 누적 사용량이 이 물약값보다 크거나 같다면? -> 아이템 소모
            if (data.potionBuffer >= smallestPotion.val) {
                data.potionBuffer -= smallestPotion.val; // 버퍼 차감
                
                // 인벤토리에서 해당 아이템 삭제 (ID 기준)
                const realIdx = data.inventory.findIndex(i => i.id === smallestPotion.id);
                if (realIdx !== -1) {
                    data.inventory.splice(realIdx, 1);
                    // 배열에서도 제거하여 다음 루프 반영
                    potions.shift(); 
                    
                    // 로그 출력
                    const log = document.getElementById('battle-log');
                    if (log) log.innerHTML = `<span style="color:#e67e22">🧪 ${smallestPotion.name} 소모됨 (누적 사용 완료)</span><br>` + log.innerHTML;
                } else {
                    break; // 예외 처리
                }
            } else {
                // 누적량이 제일 작은 물약보다 작으면 차감 중지 (다음 턴에 계속 누적)
                break; 
            }
        }

        if (window.MainEngine) MainEngine.updateUI();
    },

    // 3. 전투 실행
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
            
            // [유저 공격]
            const pDmg = Math.floor(calcDmg(pStats.atk, m.def));
            mHP -= pDmg;
            log.innerHTML = `유저 공격: ${pDmg} (적 HP: ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;
            
            if (mHP <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                data.gold += m.gold;
                data.exp += m.exp;
                log.innerHTML = `<span style="color:var(--money)">★ 승리! +${Math.floor(m.gold)}G, +${Math.floor(m.exp)}EXP</span><br>` + log.innerHTML;
                if (window.MainEngine) { MainEngine.checkLevelUp(); MainEngine.updateUI(); }
                return;
            }

            // [몬스터 공격]
            let mDmg = Math.floor(calcDmg(m.atk, pStats.def));
            data.hp -= mDmg;
            
            // [즉시 회복 시도] 맞자마자 물약 총량에서 끌어다 씀
            CombatSystem.tryAutoPotion(pStats);

            log.innerHTML = `피격: ${mDmg} (내 HP: ${Math.max(0, Math.floor(data.hp))})<br>` + log.innerHTML;

            // [사망 판정] 물약으로도 커버 안되어서 0 이하가 되면 사망
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
