/* ==========================================
   [Enhancement_System.js] 
   강화 로직, 비용 계산, 확률 제어, UI 연동
   ========================================== */

const UpgradeSystem = {
    // 1. 강화 확률 공식 (v1.2 사양)
    getRates: (currentEn) => {
        let success = 100;
        let destroy = 0;

        // 성공 확률: 0~9강 선형 감소, 10강 40%, 11강 이후 30% 고정
        if (currentEn < 10) {
            success = Math.max(40, 100 - (currentEn * 6));
        } else if (currentEn === 10) {
            success = 40;
        } else {
            success = 30;
        }

        // 파괴 확률: 11강부터 5% 시작, 1강당 5%씩 증가
        if (currentEn >= 11) {
            destroy = 5 + (currentEn - 11) * 5;
        }

        return { success, destroy };
    },

    // 2. 강화 비용 계산 (기하급수적 증가)
    getCost: (it) => {
        // 기본가 * 0.5 * (1.8의 강화수치 제곱)
        // 1.8배씩 복리로 늘어나 고강화 시 비용이 매우 비싸짐
        return Math.floor(it.p * 0.5 * Math.pow(1.8, it.en));
    },

    // 3. 강화 실행 로직
    try: () => {
        // 데이터 안전성 체크 (먹통 방지)
        if (typeof data === 'undefined' || !data || upIdx === -1) return;
        if (!data.inventory[upIdx]) {
            // 인벤토리에 아이템이 없으면(이미 팔림 등) UI 리셋
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

        // 비용 차감
        data.gold -= cost;
        const rand = Math.random() * 100;

        // --- 결과 판정 ---
        if (rand < rates.success) {
            // [성공]
            it.en++;
            addLog(`[성공] ${it.name} +${it.en} 강화 성공!`, 'var(--mine)');
        } else {
            // [실패] -> 파괴 체크
            const failRand = Math.random() * 100;
            if (failRand < rates.destroy) {
                // [파괴]
                addLog(`[파괴] 강화 실패로 '${it.name}' 소멸...`, 'var(--point)');
                
                // 장착 중이었다면 장착 해제 처리
                if (data.equipment[it.type] && data.equipment[it.type].id === it.id) {
                    data.equipment[it.type] = null;
                }

                data.inventory.splice(upIdx, 1); // 인벤토리 삭제
                upIdx = -1; // 선택 해제
                
                if (typeof MainEngine !== 'undefined') MainEngine.resetUpgradeUI();
                UpgradeSystem.stopAuto();
            } else {
                // [하락]
                it.en = Math.max(0, it.en - 1);
                addLog(`[실패] 강화 실패 (단계 하락: +${it.en})`, '#aaa');
            }
        }

        // UI 업데이트
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
        
        // 아이템이 파괴되지 않았다면, 강화창 UI(확률, 비용) 갱신
        if (upIdx !== -1) UpgradeSystem.selectUpgrade(upIdx);
    },

    // 4. 아이템 선택 및 UI 표시
    selectUpgrade: (idx) => {
        if (typeof data === 'undefined' || !data.inventory[idx]) return;

        upIdx = idx; // 전역 변수 갱신
        const it = data.inventory[idx];
        const rates = UpgradeSystem.getRates(it.en);
        const cost = UpgradeSystem.getCost(it);

        // DOM 요소 연결
        const display = document.getElementById('upgrade-target-display');
        const btn = document.getElementById('btn-up-exec');
        const sellBtn = document.getElementById('btn-up-sell');
        const chanceEl = document.getElementById('up-chance');
        const breakEl = document.getElementById('up-break');

        // UI 갱신
        if (display) display.innerHTML = `<strong>${it.name} +${it.en}</strong>`;
        
        if (btn) {
            btn.innerText = `강화하기 (${cost.toLocaleString()}G)`;
            btn.disabled = false;
            // [버튼 크기 버그 수정] 강제로 스타일 주입
            btn.style.width = "100%";
            btn.style.height = "55px";
            btn.style.display = "block"; 
        }

        if (sellBtn) sellBtn.style.display = 'block';
        if (chanceEl) chanceEl.innerText = Math.floor(rates.success);
        if (breakEl) breakEl.innerText = rates.destroy;
    },

    // 5. 자동 강화 (0.1초 속도)
    startAuto: () => {
        if (typeof autoTimer !== 'undefined' && autoTimer) {
            UpgradeSystem.stopAuto();
        } else {
            // 전역 변수 autoTimer 사용
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
        const btn = document.getElementById('auto-btn');
        if (btn) btn.innerText = '자동 강화 시작';
    }
};
