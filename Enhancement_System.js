/* ==========================================
   [Enhancement_System.js] 
   강화 로직 및 확률 테이블 제어
   ========================================== */

const UpgradeSystem = {
    // 1. 단계별 확률 반환 (요청하신 v1.2 리뉴얼 사양)
    getRates: (currentEn) => {
        let success = 100;
        let destroy = 0;

        // 성공 확률: 0~9강까지 줄어들다 10강 40%, 11강부터 30% 고정
        if (currentEn < 10) {
            success = 100 - (currentEn * 6); // 선형 감소
            if (success < 40) success = 40;
        } else if (currentEn === 10) {
            success = 40;
        } else {
            success = 30;
        }

        // 파괴 확률: 11강부터 실패 시 5% 시작, 1강 늘어날 때마다 5%씩 증가
        if (currentEn >= 11) {
            destroy = 5 + (currentEn - 11) * 5;
        }

        return { success, destroy };
    },

    // 2. 강화 실행 함수
    try: () => {
        // 강화 대상이 선택되지 않았으면 중단
        if (upIdx === -1) return;

        const it = data.inventory[upIdx];
        const rates = UpgradeSystem.getRates(it.en);
        
        // 강화 비용 계산
        const cost = Math.floor(it.p * 0.5 * Math.pow(1.5, it.en));

        // 골드 체크
        if (data.gold < cost) {
            UpgradeSystem.stopAuto();
            return alert("골드가 부족하여 강화를 중단합니다.");
        }

        // 비용 차감 및 확률 계산
        data.gold -= cost;
        const rand = Math.random() * 100;

        if (rand < rates.success) {
            // [성공]
            it.en++;
            addLog(`[성공] ${it.name} +${it.en} 강화 성공!`, 'var(--mine)');
        } else {
            // [실패] 시 파괴 확률 체크
            const failRand = Math.random() * 100;
            if (failRand < rates.destroy) {
                // [파괴]
                addLog(`[파괴] 실패로 인해 '${it.name}' 소멸...`, 'var(--point)');
                data.inventory.splice(upIdx, 1); // 인벤토리에서 제거
                upIdx = -1; // 선택 해제
                MainEngine.resetUpgradeUI(); // UI 초기화 (MainEngine 경로 지정)
                UpgradeSystem.stopAuto();
            } else {
                // [단계 하락] (최소 0강)
                it.en = Math.max(0, it.en - 1);
                addLog(`[실패] 강화 실패 (단계 하락: +${it.en})`, '#aaa');
            }
        }

        // UI 갱신 (MainEngine 경로 지정)
        MainEngine.updateUI();
        
        // 강화 대상이 남아있다면 다시 정보 갱신 (비용, 확률 등)
        if (upIdx !== -1) UpgradeSystem.selectUpgrade(upIdx);
    },

    // 3. 강화 대상 선택 처리 (UI 갱신 전용)
    selectUpgrade: (idx) => {
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

        // 확률 표시 업데이트
        document.getElementById('up-chance').innerText = Math.floor(rates.success);
        document.getElementById('up-break').innerText = rates.destroy;
    },

    // 4. 자동 강화 제어
    startAuto: () => {
        if (autoTimer) {
            UpgradeSystem.stopAuto();
        } else {
            autoTimer = setInterval(UpgradeSystem.try, 100); // 0.1초 간격
            document.getElementById('auto-btn').innerText = '중단';
        }
    },

    stopAuto: () => {
        if (autoTimer) {
            clearInterval(autoTimer);
            autoTimer = null;
        }
        const autoBtn = document.getElementById('auto-btn');
        if (autoBtn) autoBtn.innerText = '자동 강화 시작';
    }
};
