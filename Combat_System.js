/* ==========================================
   [전투 시스템] 몬스터 생성 및 자동 전투
   ========================================== */
const CombatSystem = {
    // 자동 전투 실행 (0.1초 턴제)
    startBattle: (m) => {
        if (data.hp <= 0) return alert('회복이 필요합니다!');
        
        const log = document.getElementById('battle-log');
        log.innerHTML = `Lv.${m.lv} 몬스터와 전투 시작!<br>`;
        
        const pStats = getFinalStats();
        let mHP = m.hp;

        const battleLoop = setInterval(() => {
            // 데미지 공식 적용
            const calcDmg = (atk, dfs) => (atk >= dfs) ? (atk * 2 - dfs) : (Math.pow(atk, 2) / dfs);
            
            // 1. 유저의 공격
            const pDmg = Math.floor(calcDmg(pStats.atk, m.def));
            mHP -= pDmg;
            log.innerHTML = `유저는 공격했다. ${pDmg} 데미지 (남은 적: ${Math.max(0, Math.floor(mHP))})<br>` + log.innerHTML;
            
            if (mHP <= 0) {
                clearInterval(battleLoop);
                data.gold += m.gold;
                data.exp += m.exp;
                log.innerHTML = `<span style="color:var(--money)">전투 승리! +${Math.floor(m.gold)}G, +${Math.floor(m.exp)}EXP</span><br>` + log.innerHTML;
                checkLevelUp();
                updateUI();
                saveGame();
                return;
            }

            // 2. 몬스터의 공격
            let mDmg = Math.floor(calcDmg(m.atk, pStats.def));
            data.hp -= mDmg;

            // 물약 자동 회복 (피격 데미지 상쇄)
            if (data.potions > 0 && data.hp < pStats.hp) {
                const heal = Math.min(mDmg, data.potions);
                data.hp += heal;
                data.potions -= heal;
            }

            log.innerHTML = `공격받았다. ${mDmg} 데미지 (남은 체력: ${Math.max(0, Math.floor(data.hp))})<br>` + log.innerHTML;

            if (data.hp <= 0) {
                clearInterval(battleLoop);
                data.hp = 0;
                log.innerHTML = `<span style="color:red">전투 패배... 마을로 귀환합니다.</span><br>` + log.innerHTML;
                updateUI();
                saveGame();
            }
        }, 100);
    }
};