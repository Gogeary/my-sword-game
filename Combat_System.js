/* ==========================================
   [Combat_System.js] 
   몬스터 탐색 및 자동 전투 (사망 시 귀환 로직 포함)
   ========================================== */

const CombatSystem = {
    // 1. 몬스터 탐색
    scanHunt: () => {
        const grid = document.getElementById('hunt-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const mLv = Math.max(1, data.level + Math.floor(Math.random() * 11) - 5);
            const monster = CombatSystem.generateMonsterStats(mLv);

            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.innerHTML = `👾<span class="monster-lv">Lv.${mLv}</span>`;
            cell.onclick = () => CombatSystem.startBattle(monster);
            grid.appendChild(cell);
        }
    },

    // 2. 몬스터 스탯 생성
    generateMonsterStats: (lv) => {
        const stages = GameDatabase.MONSTER_STAGES;
        let low = stages[0];
        let high = stages[stages.length - 1];

        for (let i = 0; i < stages.length - 1; i++) {
            if (lv >= stages[i].lv && lv <= stages[i + 1].lv) {
                low = stages[i];
                high = stages[i + 1];
                break;
            }
        }

        const ratio = (lv - low.lv) / (high.lv - low.lv || 1);
        const lerp = (a, b) => a + (b - a) * ratio;

        return {
            lv: lv,
            hp: lerp(low.hp, high.hp),
            atk: lerp(low.atk, high.atk),
            def: lerp(low.def, high.def),
            gold: lerp(low.gold, high.gold),
            exp: lerp(low.exp, high.exp)
        };
    },

    // 3. 자동 전투 실행
    startBattle: (m) => {
        // 체력이 1 이하이면 전투 불가 (치료 필요)
        if (data.hp <= 1) return alert('체력이 너무 낮습니다! 치료소에서 회복하세요.');
        
        const log = document.getElementById('battle-log');
        if (log) log.innerHTML = `[시스템] Lv.${m.lv} 몬스터와 전투 시작!<br>`;
        
        const pStats = MainEngine.getFinalStats();
        let mHP = m.hp;

        if (autoTimer) clearInterval(autoTimer);

        autoTimer = setInterval(() => {
            const calcDmg = (atk, dfs) => (atk >= dfs) ? (atk * 2 - dfs) : (Math.pow(atk, 2) / dfs);
            
            // --- 유저 공격 ---
            const pDmg = Math.floor(calcDmg(pStats.atk, m.def));
            mHP -= pDmg;
            log.innerHTML = `유저 공격: ${pDmg} 데미지 (적 HP: ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;
            
            if (mHP <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                data.gold += m.gold;
                data.exp += m.exp;
                log.innerHTML = `<span style="color:var(--money)">★ 전투 승리! +${Math.floor(m.gold)}G, +${Math.floor(m.exp)}EXP</span><br>` + log.innerHTML;
                MainEngine.checkLevelUp();
                MainEngine.updateUI();
                return;
            }

            // --- 몬스터 공격 ---
            let mDmg = Math.floor(calcDmg(m.atk, pStats.def));
            data.hp -= mDmg;

            // 물약 자동 회복
            if (data.potions > 0 && data.hp < pStats.hp) {
                const healAmt = Math.min(mDmg, data.potions);
                data.hp += healAmt;
                data.potions -= healAmt;
            }

            log.innerHTML = `공격받음: ${mDmg} 데미지 (내 HP: ${Math.max(0, Math.floor(data.hp))})<br>` + log.innerHTML;

            // --- 사망 처리 로직 (수정됨) ---
            if (data.hp <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                
                // 1. 체력을 1로 고정
                data.hp = 1;
                
                alert("전투 패배... 마을로 강제 귀환합니다.");
                
                // 2. UI 갱신 및 세이브
                MainEngine.updateUI();
                MainEngine.saveGame();
                
                // 3. 메인 화면으로 자동 이동
                showPage('page-main');
                
                // 4. 사냥터 로그 초기화 (다음 전투를 위해)
                if (log) log.innerHTML = "전투 대기 중...";
            }
        }, GameDatabase.SYSTEM.COMBAT_SPEED);
    }
};
