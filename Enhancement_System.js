/* ==========================================
   [Enhancement_System.js] 
   강화 로직, 비용 계산, 확률 제어, UI 연동 (최종 수정본)
   ========================================== */

const UpgradeSystem = {
    // 1. 단계별 성공/파괴 확률 반환 (v1.2 사양)
    getRates: (currentEn) => {
        let success = 100;
        let destroy = 0;

        // [성공 확률] 
        // 0~9강: 단계당 6%씩 감소 (최소 40%)
        // 10강: 40% 고정
        // 11강 이상: 30% 고정
        if (currentEn < 10) {
            success = Math.max(40, 100 - (currentEn * 6));
        } else if (currentEn === 10) {
            success = 40;
        } else {
            success = 30;
        }

        // [파괴 확률]
        // 10강까지 0%
        // 11강부터 5%로 시작하여 단계당 5%씩 증가
        if (currentEn >= 11) {
            destroy = 5 + (currentEn - 11) * 5;
        }

        return { success, destroy };
    },

    // 2. 강화 비용 계산 공식 (복리 증가)
    getCost: (it) => {
        // 공식: 아이템가격 * (1.6 ^ 현재강화수치)
        // 예: 1000원 아이템 -> 0강: 1000원, 1강: 1600원, 2강: 2560원 ...
        return Math.floor(it.p * Math.pow(1.6, it.en));
    },

    // 3. 강화 실행 로직 (핵심)
    try: () => {
        // [안전 장치] 데이터가 없거나 선택된 아이템이 없으면 실행 중단
        if (typeof data === 'undefined' || !data || upIdx === -1) return;
        
        // 아이템이 인벤토리에서 사라졌는지 체크 (판매 등)
        if (!data.inventory[upIdx]) {
            if (typeof MainEngine !== 'undefined') MainEngine.resetUpgradeUI();
            return;
        }

        const it = data.inventory[upIdx];
        const rates = UpgradeSystem.getRates(it.en);
        const cost = UpgradeSystem.getCost(it);

        // [비용 체크]
        if (data.gold < cost) {
            UpgradeSystem.stopAuto(); // 자동 강화 중이라면 중지
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
            // [실패] -> 파괴 확률 체크
            const failRand = Math.random() * 100;
            
            if (failRand < rates.destroy) {
                // [파괴]
                addLog(`[파괴] 강화 실패로 '${it.name}' 소멸...`, 'var(--point)');
                
                // 중요: 장착 중인 아이템이었다면 장착 해제 처리
                if (data.equipment[it.type] && data.equipment[it.type].id === it.id) {
                    data.equipment[it.type] = null;
                }

                // 인벤토리에서 삭제
                data.inventory.splice(upIdx, 1);
                upIdx = -1; // 선택 인덱스 초기화
                
                // UI 리셋
                if (typeof MainEngine !== 'undefined') MainEngine.resetUpgradeUI();
                UpgradeSystem.stopAuto(); // 자동 강화 중지
            } else {
                // [단계 하락] (최소 0강까지만)
                const prevEn = it.en;
                it.en = Math.max(0, it.en - 1);
                addLog(`[실패] 강화 실패 (단계 하락: +${prevEn} ➔ +${it.en})`, '#aaa');
            }
        }

        // [UI 업데이트]
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
        
        // 아이템이 파괴되지 않고 남아있다면, 강화창 정보(비용, 확률) 갱신
        if (upIdx !== -1) UpgradeSystem.selectUpgrade(upIdx);
    },

    // 4. 아이템 선택 및 UI 표시 (버튼 크기 수정 포함)
    selectUpgrade: (idx) => {
        // 데이터 유효성 체크
        if (typeof data === 'undefined' || !data.inventory[idx]) return;

        upIdx = idx; // 전역 변수 upIdx 갱신
        const it = data.inventory[idx];
        const rates = UpgradeSystem.getRates(it.en);
        const cost = UpgradeSystem.getCost(it);

        // DOM 요소 가져오기
        const display = document.getElementById('upgrade-target-display');
        const btn = document.getElementById('btn-up-exec');
        const sellBtn = document.getElementById('btn-up-sell');
        const chanceEl = document.getElementById('up-chance');
        const breakEl = document.getElementById('up-break');

        // [UI 갱신]
        if (display) display.innerHTML = `<strong>${it.name} +${it.en}</strong>`;
        
        if (btn) {
            btn.innerText = `강화하기 (${cost.toLocaleString()}G)`;
            btn.disabled = false;
            
            // [CSS 강제 적용] 버튼 크기가 줄어들지 않도록 고정
            btn.style.width = "100%";
            btn.style.height = "55px";
            btn.style.display = "block"; 
        }

        // 판매 버튼 보이기
        if (sellBtn) sellBtn.style.display = 'block';

        // 확률 텍스트 갱신
        if (chanceEl) chanceEl.innerText = Math.floor(rates.success);
        if (breakEl) breakEl.innerText = rates.destroy;
    },

    // 5. 자동 강화 제어
    startAuto: () => {
        if (typeof autoTimer !== 'undefined' && autoTimer) {
            UpgradeSystem.stopAuto();
        } else {
            // 전역 변수 autoTimer에 인터벌 할당 (속도: 0.1초)
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
