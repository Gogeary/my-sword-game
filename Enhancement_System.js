/* ==========================================
   [강화 시스템] 확률 계산 및 강화 실행
   ========================================== */
const UpgradeSystem = {
    // 단계별 확률 반환 (v1.2 리뉴얼 사양)
    getRates: (currentEn) => {
        let success = currentEn < 10 ? Math.max(40, 100 - (currentEn * 6)) : 30;
        if (currentEn === 10) success = 40;
        let destroy = currentEn >= 11 ? 5 + (currentEn - 11) * 5 : 0;
        return { success, destroy };
    },

    // 강화 시도
    try: () => {
        if (upIdx === -1) return;
        const it = data.inventory[upIdx];
        const rates = UpgradeSystem.getRates(it.en);
        const cost = Math.floor(it.p * 0.5 * Math.pow(1.5, it.en));

        if (data.gold < cost) {
            UpgradeSystem.stopAuto();
            return alert("골드가 부족하여 강화를 중단합니다.");
        }

        data.gold -= cost;
        const rand = Math.random() * 100;

        if (rand < rates.success) {
            it.en++;
            addLog(`[성공] ${it.name} +${it.en} 강화 성공!`, 'var(--mine)');
        } else {
            const failRand = Math.random() * 100;
            if (failRand < rates.destroy) {
                addLog(`[파괴] 실패로 인해 '${it.name}' 소멸...`, 'var(--point)');
                data.inventory.splice(upIdx, 1);
                upIdx = -1;
                resetUpgradeUI();
                UpgradeSystem.stopAuto();
            } else {
                it.en = Math.max(0, it.en - 1);
                addLog(`[실패] 강화 실패 (단계 하락: +${it.en})`, '#aaa');
            }
        }
        updateUI();
        if (upIdx !== -1) selectUpgrade(upIdx);
    },

    // 자동 강화 제어
    startAuto: () => {
        if (autoTimer) {
            UpgradeSystem.stopAuto();
        } else {
            autoTimer = setInterval(UpgradeSystem.try, 100);
            document.getElementById('auto-btn').innerText = '중단';
        }
    },
    stopAuto: () => {
        clearInterval(autoTimer);
        autoTimer = null;
        document.getElementById('auto-btn').innerText = '자동 강화';
    }
};