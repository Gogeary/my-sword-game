/* ==========================================
   [Combat_System.js] 
   몬스터 탐색, 스탯 생성 및 자동 전투 로직
   ========================================== */

const CombatSystem = {
    // 1. 몬스터 탐색 (내 레벨 +- 5 레벨 생성)
    scanHunt: () => {
        const grid = document.getElementById('hunt-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            // 내 레벨 기준 +-5 범위에서 랜덤 레벨 생성 (최소 1레벨)
            const mLv = Math.max(1, data.level + Math.floor(Math.random() * 11) - 5);
            const monster = CombatSystem.generateMonsterStats(mLv);

            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.innerHTML = `👾<span class="monster-lv">Lv.${mLv}</span>`;
            cell.onclick = () => CombatSystem.startBattle(monster);
            grid.appendChild(cell);
        }
    },

    // 2. 몬스터 스펙 생성 (Database의 기준표를 바탕으로 선형 보간 계산)
    generateMonsterStats: (lv) => {
        const stages = GameDatabase.MONSTER_STAGES;
        let low = stages[0];
        let high = stages[stages.length - 1];

        // 레벨에 맞는 구간 찾기
        for (let i = 0; i < stages.length - 1; i++) {
            if (lv >= stages[i].lv && lv <= stages[i + 1].lv) {
                low = stages[i];
                high = stages[i + 1];
                break;
            }
        }

        // 선형 보간(lerp) 비율 계산
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

    // 3. 자동 전투 실행 (0.1초 턴제)
    startBattle: (m) => {
        if (data.hp <= 0) return alert('치료소에서 회복이 필요합니다!');
        
        const log = document.getElementById('battle-log');
        if (log) log.innerHTML = `[시스템] Lv.${m.lv} 몬스터와 전투 시작!<br>`;
        
        const pStats = MainEngine.getFinalStats();
        let mHP = m.hp;

        // 기존 타이머가 있다면 제거 (중복 실행 방지)
        if (autoTimer) clearInterval(autoTimer);

        autoTimer = setInterval(() => {
            // 데미지 공식 적용 (요구사항 명세)
            const calcDmg = (atk, dfs) => (atk >= dfs) ? (atk * 2 - dfs) : (Math.pow(atk, 2) / dfs);
            
            // --- 유저 턴 ---
            const pDmg = Math.floor(calcDmg(pStats.atk, m.def));
            mHP -= pDmg;
            log.innerHTML = `유저는 공격했다. ${pDmg}의 데미지 (남은 적 체력 : ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;
            
            if (mHP <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                
                data.gold += m.gold;
                data.exp += m.exp;
                
                log.innerHTML = `<span style="color:var(--money)">★ 승리! 획득 골드 +${Math.floor(m.gold)}G, 획득 경험치 +${Math.floor(m.exp)}EXP</span><br>` + log.innerHTML;
                
                MainEngine.checkLevelUp(); // 레벨업 체크 로직 호출
                MainEngine.updateUI();
                return;
            }

            // --- 몬스터 턴 ---
            let mDmg = Math.floor(calcDmg(m.atk, pStats.def));
            data.hp -= mDmg;

            // 물약 자동 회복 (보유한 포션 수치만큼 데미지를 즉시 상쇄)
            if (data.potions > 0 && data.hp < pStats.hp) {
                const healAmt = Math.min(mDmg, data.potions);
                data.hp += healAmt;
                data.potions -= healAmt;
                // 포션 소지 개수 갱신 (전체 수치가 0이 되면 소지 카운트도 0)
                if (data.potions <= 0) data.potionCount = 0; 
            }

            log.innerHTML = `공격받았다. ${mDmg}의 데미지 (남은 체력 : ${Math.max(0, Math.floor(data.hp))})<br>` + log.innerHTML;

            if (data.hp <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                data.hp = 0;
                log.innerHTML = `<span style="color:var(--point)">[패배] 체력이 다했습니다. 마을로 송환됩니다.</span><br>` + log.innerHTML;
                MainEngine.updateUI();
            }
        }, GameDatabase.SYSTEM.COMBAT_SPEED);
    }
};
