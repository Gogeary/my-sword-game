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

        // 파괴 확률 (11강부터 로직이 있지만, 10강 제한으로 인해 실제로는 발동 안 함)
        if (en >= 11) {
            destroy = 5 + (en - 11) * 5;
        }

        return { success, destroy };
    },

    // 2. 비용 계산
    getCost: (it) => {
        const baseCost = Math.floor(it.p * 0.3); // 기본가: 아이템 가격의 30%

        if (it.en < 5) {
            // [0~4강] 비용 고정
            return baseCost;
        } 
        else if (it.en < 11) {
            // [5~10강] 6강 도전부터 1.2배씩 증가
            return Math.floor(baseCost * Math.pow(1.2, it.en - 4));
        } 
        else {
            // [11강 이상] (10강 제한으로 인해 실제로는 계산될 일 없음)
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

        // [수정] 최대 강화 수치(+10) 제한 로직 추가
        if (it.en >= 10) {
            UpgradeSystem.stopAuto(); // 자동 강화 중이라면 중지
            return alert("최대 강화 수치(+10)에 도달했습니다!");
        }

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
            
            // 성공 후 바로 10강이 되었다면 축하 메시지 및 자동 종료
            if (it.en >= 10) {
                UpgradeSystem.stopAuto();
                alert(`축하합니다! ${it.name} +10강 달성!`);
            }

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
            // 이미 10강이면 버튼 비활성화 또는 텍스트 변경
            if (it.en >= 10) {
                b.innerText = `최대 강화 달성 (+10)`;
                b.disabled = true;
            } else {
                b.innerText = `강화하기 (${cost.toLocaleString()}G)`;
                b.disabled = false;
            }
            
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
