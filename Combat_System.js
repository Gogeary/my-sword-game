/* ==========================================
   [Combat_System.js] 
   몬스터 탐색 및 자동 전투 시스템
   (Database.js의 MONSTER_TABLE을 참조)
   ========================================== */

const CombatSystem = {
    // 1. 몬스터 탐색
    scanHunt: () => {
        const grid = document.getElementById('hunt-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            // 유저 레벨 기준 -5 ~ +5 범위 (단, 1~30레벨 제한)
            let randomLv = data.level + Math.floor(Math.random() * 11) - 5;
            const mLv = Math.min(30, Math.max(1, randomLv));
            
            const monster = CombatSystem.getMonsterData(mLv);

            const cell = document.createElement('div');
            cell.className = 'cell';
            
            // 레벨별 색상 구분
            let color = mLv > data.level ? '#e74c3c' : (mLv < data.level ? '#2ecc71' : '#f1c40f');
            
            cell.innerHTML = `👾<span class="monster-lv" style="color:${color}">Lv.${mLv}</span>`;
            cell.onclick = () => CombatSystem.startBattle(monster);
            grid.appendChild(cell);
        }
    },

    // 2. 몬스터 데이터 가져오기 (Database.js 참조)
    getMonsterData: (lv) => {
        // 데이터베이스에 생성된 테이블이 있는지 확인
        const table = GameDatabase.MONSTER_TABLE;
        if (!table || table.length === 0) return null;

        // 인덱스 범위 체크 (1레벨 = 인덱스 0)
        let idx = lv - 1;
        if (idx < 0) idx = 0;
        if (idx >= table.length) idx = table.length - 1;

        // 객체 복사해서 반환 (원본 수정 방지)
        return { ...table[idx] };
    },

    // 3. 자동 전투 실행
    startBattle: (m) => {
        if (!m) return alert("몬스터 데이터 오류");
        
        // 체력이 1 이하이면 전투 불가
        if (data.hp <= 1) return alert('체력이 너무 낮습니다! 치료소에서 회복하세요.');
        
        const log = document.getElementById('battle-log');
        if (log) log.innerHTML = `[시스템] Lv.${m.lv} 몬스터와 전투 시작!<br>`;
        
        const pStats = MainEngine.getFinalStats();
        let mHP = m.hp;

        // 기존 타이머 제거
        if (autoTimer) clearInterval(autoTimer);

        // 전투 루프 시작
        autoTimer = setInterval(() => {
            const calcDmg = (atk, dfs) => (atk >= dfs) ? (atk * 2 - dfs) : (Math.pow(atk, 2) / dfs);
            
            // [내 공격]
            const pDmg = Math.floor(calcDmg(pStats.atk, m.def));
            mHP -= pDmg;
            log.innerHTML = `유저 공격: ${pDmg} 데미지 (적 HP: ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;
            
            // [승리 판정]
            if (mHP <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                
                data.gold += m.gold;
                data.exp += m.exp;
                
                log.innerHTML = `<span style="color:var(--money)">★ 승리! +${Math.floor(m.gold)}G, +${Math.floor(m.exp)}EXP</span><br>` + log.innerHTML;
                
                // 레벨업 체크 및 UI 갱신은 MainEngine에서 처리
                if (window.MainEngine) {
                    MainEngine.checkLevelUp();
                    MainEngine.updateUI();
                }
                return;
            }

            // [몬스터 공격]
            let mDmg = Math.floor(calcDmg(m.atk, pStats.def));
            data.hp -= mDmg;

            // [물약 자동 사용]
            if (data.potions > 0 && data.hp < pStats.hp) {
                const healAmt = Math.min(mDmg, data.potions); // 피해량만큼 회복 시도
                data.hp += healAmt;
                data.potions -= healAmt;
            }

            log.innerHTML = `공격받음: ${mDmg} 데미지 (내 HP: ${Math.max(0, Math.floor(data.hp))})<br>` + log.innerHTML;

            // [패배 판정]
            if (data.hp <= 0) {
                clearInterval(autoTimer);
                autoTimer = null;
                
                data.hp = 1; // 최소 체력 보정
                alert("패배하여 마을로 귀환합니다.");
                
                if (window.MainEngine) {
                    MainEngine.updateUI();
                    MainEngine.saveGame();
                }
                
                // 화면 이동
                showPage('page-main');
                if (log) log.innerHTML = "전투 대기 중...";
            }
        }, GameDatabase.SYSTEM.COMBAT_SPEED);
    }
};
