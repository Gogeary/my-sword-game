/* ==========================================
   [Enhancement_System.js] 
   강화 로직, 비용 계산, 확률 제어, UI 연동
   ========================================== */

const UpgradeSystem = {
    // 1. 성공/파괴 확률 (v1.2 사양 유지)
    getRates: (en) => {
        let success = 100;
        let destroy = 0;

        // 성공 확률
        if (en < 10) {
            success = Math.max(40, 100 - (en * 6));
        } else if (en === 10) {
            success = 40;
        } else {
            success = 30;
        }

        // 파괴 확률 (11강부터 발생)
        if (en >= 11) {
            destroy = 5 + (en - 11) * 5;
        }

        return { success, destroy };
    },

    // 2. [비용 계산 수정] 
    // - 5강까지(0~4) 고정 비용
    // - 6강 도전(5)부터 1.2배씩 증가
    // - 11강(11)부터 1.8배씩 증가
    getCost: (it) => {
        const baseCost = Math.floor(it.p * 0.3); // 기본가: 아이템 가격의 30%

        if (it.en < 5) {
            // [0~4강] 비용 고정
            return baseCost;
        } 
        else if (it.en < 11) {
            // [5~10강] 6강 도전부터 1.2배씩 증가
            // en=5일 때 1.2^1, en=6일 때 1.2^2 ...
            return Math.floor(baseCost * Math.pow(1.2, it.en - 4));
        } 
        else {
            // [11강 이상] 1.8배씩 증가 (비용 급증 구간)
            // 10강까지의 1.2배 증가분(1.2^6)을 기본으로 깔고, 1.8배씩 추가
            const costAt10 = baseCost * Math.pow(1.2, 6);
            return Math.floor(costAt10 * Math.pow(1.8, it.en - 10));
        }
    },

    // 3. 강화 실행
    try: () => {
        // 데이터 및 예외 처리
        if (typeof data === 'undefined' || !data || upIdx === -1) return;
        if (!data.inventory[upIdx]) {
            if (typeof MainEngine !== 'undefined') MainEngine.resetUpgradeUI();
            return;
        }

        const it = data.inventory[upIdx];
        const rates = UpgradeSystem.getRates(it.en);
        const cost = UpgradeSystem.getCost(it);

        // 비용 부족 체크
        if (data.gold < cost) {
            UpgradeSystem.stopAuto();
            return alert("강화 비용이 부족합니다.");
        }

        // 비용 차감 및 확률 계산
        data.gold -= cost;
        const rand = Math.random() * 100;

        if (rand < rates.success) {
            // [성공]
            it.en++;
            addLog(`[성공] ${it.name} +${it.en} 강화 성공!`, 'var(--mine)');
        } else {
            const failRand = Math.random() * 100;
            if (failRand < rates.destroy) {
                // [파괴]
                addLog(`[파괴] 강화 실패로 '${it.name}' 소멸...`, 'var(--point)');
                
                // 장착 해제
                if (data.equipment[it.type] && data.equipment[it.type].id === it.id) {
                    data.equipment[it.type] = null;
                }

                data.inventory.splice(upIdx, 1);
                upIdx = -1;
                
                if (typeof MainEngine !== 'undefined') MainEngine.resetUpgradeUI();
                UpgradeSystem.stopAuto();
            } else {
                // [실패] 단계 하락
                const prev = it.en;
                it.en = Math.max(0, it.en - 1);
                addLog(`[실패] 강화 실패 (단계 하락: +${prev} ➔ +${it.en})`, '#aaa');
            }
        }

        // UI 갱신
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
        if (upIdx !== -1) UpgradeSystem.selectUpgrade(upIdx);
    },

    // 4. UI 표시 및 갱신
    selectUpgrade: (idx) => {
        if (!data || !data.inventory[idx]) return;

        upIdx = idx;
        const it = data.inventory[idx];
        const rates = UpgradeSystem.getRates(it.en);
        const cost = UpgradeSystem.getCost(it);

        const d = document.getElementById('upgrade-target-display');
        const b = document.getElementById('btn-up-exec');
        const s = document.getElementById('btn-up-sell');

        if (d) d.innerHTML = `<strong>${it.name} +${it.en}</strong>`;
        if (b) {
            b.innerText = `강화하기 (${cost.toLocaleString()}G)`;
            b.disabled = false;
            // 버튼 스타일 고정
            b.style.width = "100%";
            b.style.height = "55px";
            b.style.display = "block";
        }
        if (s) s.style.display = 'block';

        document.getElementById('up-chance').innerText = Math.floor(rates.success);
        document.getElementById('up-break').innerText = rates.destroy;
    },

    // 5. 자동 강화
    startAuto: () => {
        if (autoTimer) UpgradeSystem.stopAuto();
        else {
            autoTimer = setInterval(UpgradeSystem.try, 100);
            document.getElementById('auto-btn').innerText = '중단';
        }
    },

    stopAuto: () => {
        if (autoTimer) {
            clearInterval(autoTimer);
            autoTimer = null;
        }
        document.getElementById('auto-btn').innerText = '자동 강화 시작';
    }
};
