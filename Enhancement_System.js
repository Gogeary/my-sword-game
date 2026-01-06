/* ==========================================
   [Enhancement_System.js] 
   강화 로직, 비용 계산, 확률 제어, UI 연동
   ========================================== */

const UpgradeSystem = {
    // 1. 성공/파괴 확률
    getRates: (en) => {
        let success = 100;
        let destroy = 0;

        // 성공 확률
        if (en < 10) {
            success = Math.max(40, 100 - (en * 6));
        } else if (en === 10) {
            success = 40;
        } else {
            success = 30; // 11강~19강 도전 성공률
        }

        // 파괴 확률 (11강 도전부터 발생)
        if (en >= 11) {
            destroy = 5 + (en - 11) * 5;
        }

        return { success, destroy };
    },

    // 2. 비용 계산
    getCost: (it) => {
        const baseCost = Math.floor(it.p * 0.3);

        if (it.en < 5) {
            return baseCost;
        } 
        else if (it.en < 11) {
            return Math.floor(baseCost * Math.pow(1.2, it.en - 4));
        } 
        else {
            // 11강 이상 비용 계산
            const costAt10 = baseCost * Math.pow(1.2, 6);
            return Math.floor(costAt10 * Math.pow(1.8, it.en - 10));
        }
    },

    // 3. 강화 실행
    try: () => {
        if (typeof data === 'undefined' || !data || upIdx === -1) return;
        if (!data.inventory[upIdx]) {
            if (typeof MainEngine !== 'undefined') MainEngine.resetUpgradeUI();
            return;
        }

        const it = data.inventory[upIdx];

        // [수정 1] 최대 강화 수치 (+20) 제한 (절대 제한)
        if (it.en >= 20) {
            UpgradeSystem.stopAuto();
            return alert("최대 강화 수치(+20)에 도달했습니다!");
        }

        // [수정 2] 자동 강화 제한 (+10)
        // 자동 강화(autoTimer가 켜져있음) 중이고, 현재 10강 이상이면 멈춤
        if (autoTimer !== null && it.en >= 10) {
            UpgradeSystem.stopAuto();
            return alert("자동 강화는 10강까지만 가능합니다. (11강부터는 수동 진행)");
        }

        const rates = UpgradeSystem.getRates(it.en);
        const cost = UpgradeSystem.getCost(it);

        if (data.gold < cost) {
            UpgradeSystem.stopAuto();
            return alert("강화 비용이 부족합니다.");
        }

        data.gold -= cost;
        const rand = Math.random() * 100;

        if (rand < rates.success) {
            // [성공]
            it.en++;
            addLog(`[성공] ${it.name} +${it.en} 강화 성공!`, 'var(--mine)');
            
            // 10강 달성 시 자동 멈춤 (사용자 편의)
            if (autoTimer !== null && it.en === 10) {
                UpgradeSystem.stopAuto();
                alert(`${it.name} +10강 달성! 자동 강화를 종료합니다.`);
            }
            // 20강 달성 시 축하
            else if (it.en >= 20) {
                UpgradeSystem.stopAuto();
                alert(`축하합니다! 전설의 경지! ${it.name} +20강 달성!`);
            }

        } else {
            const failRand = Math.random() * 100;
            if (failRand < rates.destroy) {
                // [파괴]
                addLog(`[파괴] 강화 실패로 '${it.name}' 소멸...`, 'var(--point)');
                
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
            // [수정 3] 버튼 비활성화 기준을 10강에서 20강으로 변경
            if (it.en >= 20) {
                b.innerText = `최대 강화 달성 (+20)`;
                b.disabled = true;
            } else {
                b.innerText = `강화하기 (${cost.toLocaleString()}G)`;
                b.disabled = false;
            }
            
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
            // 시작 전 체크: 이미 10강 이상이면 자동 시작 불가
            if (upIdx !== -1 && data.inventory[upIdx] && data.inventory[upIdx].en >= 10) {
                return alert("10강 이상인 아이템은 자동 강화를 사용할 수 없습니다.");
            }

            autoTimer = setInterval(UpgradeSystem.try, 100);
            document.getElementById('auto-btn').innerText = '중단';
        }
    },

    stopAuto: () => {
        if (autoTimer) {
            clearInterval(autoTimer);
            autoTimer = null;
        }
        const btn = document.getElementById('auto-btn');
        if(btn) btn.innerText = '자동 강화 시작';
    }
};
