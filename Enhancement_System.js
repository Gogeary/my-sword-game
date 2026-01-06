/* Enhancement_System.js */
const UpgradeSystem = {
    // 1. 단계별 성공/파괴 확률 반환 (v1.2 리뉴얼 사양)
    getRates: (en) => {
        let success = 100;
        let destroy = 0;

        // 성공 확률: 10강 40%, 11강부터 30% 고정
        if (en < 10) {
            success = Math.max(40, 100 - (en * 6)); 
        } else if (en === 10) {
            success = 40;
        } else {
            success = 30;
        }

        // 파괴 확률: 11강부터 5%씩 증가
        if (en >= 11) {
            destroy = 5 + (en - 11) * 5;
        }

        return { success, destroy };
    },

    // 2. 강화 비용 계산 공식 (강화 수치에 따라 비례하여 급증)
    getCost: (it) => {
        // 공식: 기본가 * 0.5 * (1.8 ^ 현재강화단계)
        // 1.8배씩 복리로 증가하므로 고강일수록 매우 비싸집니다.
        return Math.floor(it.p * 0.5 * Math.pow(1.8, it.en));
    },

    // 3. 강화 실행
    try: () => {
        if (typeof upIdx === 'undefined' || upIdx === -1) return;
        const it = data.inventory[upIdx];
        const rates = UpgradeSystem.getRates(it.en);
        const cost = UpgradeSystem.getCost(it);

        // 골드 체크
        if (data.gold < cost) {
            UpgradeSystem.stopAuto();
            return alert("강화 비용이 부족합니다!");
        }

        data.gold -= cost;
        const rand = Math.random() * 100;

        if (rand < rates.success) {
            // 성공
            it.en++;
            addLog(`[성공] ${it.name} +${it.en} 강화 성공!`, 'var(--mine)');
        } else {
            // 실패 시 파괴 체크
            const failRand = Math.random() * 100;
            if (failRand < rates.destroy) {
                // 파괴
                addLog(`[파괴] 실패로 인해 '${it.name}' 소멸...`, 'var(--point)');
                data.inventory.splice(upIdx, 1);
                upIdx = -1;
                if (window.MainEngine) MainEngine.resetUpgradeUI();
                UpgradeSystem.stopAuto();
            } else {
                // 단계 하락 (최소 0강)
                it.en = Math.max(0, it.en - 1);
                addLog(`[실패] 강화 실패 (단계 하락: +${it.en})`, '#aaa');
            }
        }

        // UI 갱신 및 재선택
        if (window.MainEngine) MainEngine.updateUI();
        if (upIdx !== -1) UpgradeSystem.selectUpgrade(upIdx);
    },

    // 4. 강화 대상 선택 시 UI 업데이트
    selectUpgrade: (idx) => {
        upIdx = idx;
        const it = data.inventory[idx];
        const rates = UpgradeSystem.getRates(it.en);
        const cost = UpgradeSystem.getCost(it);

        const display = document.getElementById('upgrade-target-display');
        const btn = document.getElementById('btn-up-exec');
        const sellBtn = document.getElementById('btn-up-sell');

        if (display) display.innerHTML = `<strong>${it.name} +${it.en}</strong>`;
        if (btn) {
            btn.innerText = `강화하기 (${cost.toLocaleString()}G)`;
            btn.disabled = false;
            btn.style.width = "100%"; // UI 깨짐 방지
        }
        if (sellBtn) sellBtn.style.display = 'block';

        document.getElementById('up-chance').innerText = Math.floor(rates.success);
        document.getElementById('up-break').innerText = rates.destroy;
    },

    // 5. 자동 강화 제어
    startAuto: () => {
        if (autoTimer) {
            UpgradeSystem.stopAuto();
        } else {
            autoTimer = setInterval(UpgradeSystem.try, 100);
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
