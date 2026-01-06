/* ==========================================
   [Enhancement_System.js] 
   강화 로직 및 확률 테이블 제어
   ========================================== */

const UpgradeSystem = {
    // 1. 단계별 확률 반환 (v1.2 리뉴얼 사양)
    getRates: (currentEn) => {
        let success = 100;
        let destroy = 0;

        if (currentEn < 10) {
            success = 100 - (currentEn * 6);
            if (success < 40) success = 40;
        } else if (currentEn === 10) {
            success = 40;
        } else {
            success = 30;
        }

        if (currentEn >= 11) {
            destroy = 5 + (currentEn - 11) * 5;
        }

        return { success, destroy };
    },

    // 2. 강화 실행 함수
    try: () => {
        // 전역 변수 upIdx와 data가 존재하는지 먼저 체크
        if (typeof upIdx === 'undefined' || upIdx === -1) return;
        if (typeof data === 'undefined' || !data.inventory[upIdx]) return;

        const it = data.inventory[upIdx];
        const rates = UpgradeSystem.getRates(it.en);
        
        // 강화 비용 계산
        const cost = Math.floor(it.p * 0.5 * Math.pow(1.5, it.en));

        if (data.gold < cost) {
            UpgradeSystem.stopAuto();
            return alert("골드가 부족하여 강화를 중단합니다.");
        }

        data.gold -= cost;
        const rand = Math.random() * 100;

        if (rand < rates.success) {
            it.en++;
            // addLog가 전역인지 MainEngine 소속인지 체크하여 호출
            const msg = `[성공] ${it.name} +${it.en} 강화 성공!`;
            if (typeof addLog === 'function') addLog(msg, 'var(--mine)');
            else if (window.addLog) window.addLog(msg, 'var(--mine)');
        } else {
            const failRand = Math.random() * 100;
            if (failRand < rates.destroy) {
                const msg = `[파괴] 실패로 인해 '${it.name}' 소멸...`;
                if (typeof addLog === 'function') addLog(msg, 'var(--point)');
                
                data.inventory.splice(upIdx, 1);
                upIdx = -1;
                
                // UI 초기화 함수 호출 방식 보정
                if (window.MainEngine && MainEngine.resetUpgradeUI) MainEngine.resetUpgradeUI();
                else if (typeof resetUpgradeUI === 'function') resetUpgradeUI();
                
                UpgradeSystem.stopAuto();
            } else {
                it.en = Math.max(0, it.en - 1);
                const msg = `[실패] 강화 실패 (단계 하락: +${it.en})`;
                if (typeof addLog === 'function') addLog(msg, '#aaa');
            }
        }

        // UI 갱신 함수 호출 방식 보정
        if (window.MainEngine && MainEngine.updateUI) MainEngine.updateUI();
        else if (typeof updateUI === 'function') updateUI();
        
        if (upIdx !== -1) UpgradeSystem.selectUpgrade(upIdx);
    },

    // 3. 강화 대상 선택 처리
    selectUpgrade: (idx) => {
        if (typeof data === 'undefined' || !data.inventory[idx]) return;
        
        upIdx = idx;
        const it = data.inventory[idx];
        const rates = UpgradeSystem.getRates(it.en);
        const cost = Math.floor(it.p * 0.5 * Math.pow(1.5, it.en));

        const display = document.getElementById('upgrade-target-display');
        const btn = document.getElementById('btn-up-exec');
        const sellBtn = document.getElementById('btn-up-sell');

        if (display) display.innerHTML = `<strong>${it.name} +${it.en}</strong>`;
        if (btn) {
            btn.innerText = `강화하기 (${cost.toLocaleString()}G)`;
            btn.disabled = false;
        }
        if (sellBtn) sellBtn.style.display = 'block';

        const chanceEl = document.getElementById('up-chance');
        const breakEl = document.getElementById('up-break');
        if (chanceEl) chanceEl.innerText = Math.floor(rates.success);
        if (breakEl) breakEl.innerText = rates.destroy;
    },

    // 4. 자동 강화 제어
    startAuto: () => {
        if (typeof autoTimer !== 'undefined' && autoTimer) {
            UpgradeSystem.stopAuto();
        } else {
            // 전역 변수 autoTimer에 할당
            autoTimer = setInterval(UpgradeSystem.try, 100);
            const btn = document.getElementById('auto-btn');
            if (btn) btn.innerText = '중단';
        }
    },

    stopAuto: () => {
        if (typeof autoTimer !== 'undefined' && autoTimer) {
            clearInterval(autoTimer);
            autoTimer = null;
        }
        const autoBtn = document.getElementById('auto-btn');
        if (autoBtn) autoBtn.innerText = '자동 강화 시작';
    }
};
