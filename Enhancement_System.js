/* ==========================================
   [Upgrade_System.js] 
   강화 시스템 (수정됨: 주문서 & 강화권 레벨 제한 적용)
   ========================================== */

const UpgradeSystem = {
    targetIdx: -1,         
    selectedScroll: -1,    
    selectedTicket: -1, 
    isAuto: false,
    autoTimer: null,
    
    // 비용 계산
    calcCost: (item) => {
        if (!item) return 0;
        let baseCost = Math.floor(item.p * 0.1);
        if (item.en < 5) return baseCost + (item.en * 1000);
        let cost = baseCost + (5 * 1000);
        for (let i = 5; i < item.en; i++) {
            if (i < 10) cost *= 1.2;
            else cost *= 1.8;
        }
        return Math.floor(cost);
    },

    // [1] 장비 선택
    selectUpgrade: (idx) => {const UpgradeSystem = {
    targetIdx: -1,         
    selectedScroll: -1,    
    selectedTicket: -1, 
    isAuto: false,
    autoTimer: null,
    
    // 비용 계산
    calcCost: (item) => {
        if (!item) return 0;
        let baseCost = Math.floor(item.p * 0.1);
        if (item.en < 5) return baseCost + (item.en * 1000);
        let cost = baseCost + (5 * 1000);
        for (let i = 5; i < item.en; i++) {
            if (i < 10) cost *= 1.2;
            else cost *= 1.8;
        }
        return Math.floor(cost);
    },

    // [1] 장비 선택
    selectUpgrade: (idx) => {
        if (typeof idx === 'undefined' || idx === null || idx < 0) return;
        UpgradeSystem.targetIdx = idx;
        UpgradeSystem.selectedScroll = -1; 
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();
    },

    // [2] 보조 아이템 선택
    selectSupport: (idx) => {
        const item = data.inventory[idx];
        if (!item) return;

        if (item.type === 'scroll') {
            UpgradeSystem.selectedScroll = idx;
            UpgradeSystem.selectedTicket = -1;
        } else if (item.type === 'ticket') {
            UpgradeSystem.selectedTicket = idx;
            UpgradeSystem.selectedScroll = -1;
        }
        UpgradeSystem.renderUI();
    },

    // [3] 보조 아이템 해제
    clearSupport: () => {
        UpgradeSystem.selectedScroll = -1;
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();
    },

    // UI 렌더링
    renderUI: () => {
        const display = document.getElementById('upgrade-target-display');
        const supportDisplay = document.getElementById('support-selected-display');
        const btnExec = document.getElementById('btn-up-exec');
        const btnSell = document.getElementById('btn-up-sell');
        const costDisplay = document.getElementById('up-cost-display');
        
        if (UpgradeSystem.targetIdx === -1 || !data.inventory[UpgradeSystem.targetIdx]) {
            if(display) display.innerHTML = '<span style="color:#888">강화할 장비를 선택해주세요.</span>';
            if(supportDisplay) supportDisplay.innerText = "선택된 보조 아이템 없음";
            if(btnExec) { btnExec.disabled = true; btnExec.innerText = "강화하기"; }
            if(btnSell) btnSell.style.display = 'none';
            if(costDisplay) costDisplay.innerText = "0 G";
            document.getElementById('up-chance').innerText = '0';
            document.getElementById('up-break').innerText = '0';
            return;
        }

        const item = data.inventory[UpgradeSystem.targetIdx];
        const cost = UpgradeSystem.calcCost(item);
        if(costDisplay) costDisplay.innerText = `${MainEngine.formatNumber(cost)} G`;

        let supportHtml = `<span style="color:#888">선택된 보조 아이템 없음</span>`;
        let scroll = UpgradeSystem.selectedScroll !== -1 ? data.inventory[UpgradeSystem.selectedScroll] : null;
        let ticket = UpgradeSystem.selectedTicket !== -1 ? data.inventory[UpgradeSystem.selectedTicket] : null;

        if (scroll) {
            let isUsable = true;
            let warning = "";
            if (scroll.maxLimit && item.en > scroll.maxLimit) { isUsable = false; warning = ` (+${scroll.maxLimit}강 이하만)`; }
            else if (scroll.limitLv && item.lv > scroll.limitLv) { isUsable = false; warning = ` (Lv.${scroll.limitLv} 이하만)`; }
            supportHtml = `<span style="color:${isUsable ? '#3498db' : '#e74c3c'}; font-weight:bold;">🛡️ ${scroll.name}${warning}</span>`;
        } else if (ticket) {
            let isUsable = true;
            let warning = "";
            if (ticket.val <= item.en) { isUsable = false; warning = " (수치 낮음)"; }
            else if (ticket.limitLv && item.lv > ticket.limitLv) { isUsable = false; warning = ` (Lv.${ticket.limitLv} 이하만)`; }
            supportHtml = `<span style="color:${isUsable ? '#f1c40f' : '#e74c3c'}; font-weight:bold;">🎫 ${ticket.name}${warning}</span>`;
        }
        
        if(supportDisplay) supportDisplay.innerHTML = supportHtml;

        if (ticket) {
            if(display) display.innerHTML = `<div style="font-size:1.2em; font-weight:bold; color:#f1c40f">${item.name} (+${item.en})</div><div style="color:#2ecc71;">▲ 강화권 적용 대기</div>`;
            document.getElementById('up-chance').innerText = '100';
            document.getElementById('up-break').innerText = '0';
            if(btnExec) {
                const isOk = (ticket.val > item.en) && (!ticket.limitLv || item.lv <= ticket.limitLv);
                btnExec.disabled = !isOk;
                btnExec.innerText = isOk ? "강화권 사용" : "사용 불가";
            }
        } else {
            const rates = UpgradeSystem.getRates(item.en);
            let destroyRate = (scroll && (!scroll.maxLimit || item.en <= scroll.maxLimit) && (!scroll.limitLv || item.lv <= scroll.limitLv)) ? 0 : rates.destroy;
            
            if(display) display.innerHTML = `<div style="font-size:1.2em; font-weight:bold;">${item.name} (+${item.en})</div>${destroyRate === 0 && scroll ? '<div style="color:#3498db">🛡️ 파괴 방지 적용중</div>' : ''}`;
            document.getElementById('up-chance').innerText = rates.success;
            document.getElementById('up-break').innerText = destroyRate;
            if(btnExec) { btnExec.disabled = item.en >= 20; btnExec.innerText = item.en >= 20 ? "최대 강화" : "강화하기"; }
        }
        if(btnSell) btnSell.style.display = 'inline-block';
    },

    getRates: (en) => {
        let success = en < 10 ? Math.max(40, 100 - (en * 5)) : (en === 10 ? 40 : 30);
        let destroy = en >= 11 ? 5 + (en - 11) * 5 : 0;
        return { success, destroy };
    },

    try: () => {
        if (UpgradeSystem.targetIdx === -1) return;
        const item = data.inventory[UpgradeSystem.targetIdx];
        const log = document.getElementById('log-container');
        
        if (item.en >= 20) { UpgradeSystem.stopAuto(); return alert("최대 강화입니다."); }

        // [A] 강화권 사용
        if (UpgradeSystem.selectedTicket !== -1) {
            const ticket = data.inventory[UpgradeSystem.selectedTicket];
            item.en = ticket.val;
            data.inventory.splice(UpgradeSystem.selectedTicket, 1);
            UpgradeSystem.targetIdx = data.inventory.indexOf(item);
            UpgradeSystem.selectedTicket = -1;
            if(log) log.innerHTML = `<div style="color:#f1c40f">🎫 강화권 사용 성공! (+${item.en})</div>` + log.innerHTML;
        } 
        // [B] 일반 강화
        else {
            const cost = UpgradeSystem.calcCost(item);
            if (data.gold < cost) { UpgradeSystem.stopAuto(); return alert("골드가 부족합니다."); }
            
            data.gold -= cost;
            const rates = UpgradeSystem.getRates(item.en);
            const scroll = UpgradeSystem.selectedScroll !== -1 ? data.inventory[UpgradeSystem.selectedScroll] : null;
            const isProtected = scroll && (!scroll.maxLimit || item.en <= scroll.maxLimit) && (!scroll.limitLv || item.lv <= scroll.limitLv);

            if (Math.random() * 100 < rates.success) {
                item.en++;
                if(log) log.innerHTML = `<div style="color:#2ecc71">성공! (+${item.en})</div>` + log.innerHTML;
            } else {
                if (Math.random() * 100 < rates.destroy) {
                    if (isProtected) {
                        data.inventory.splice(UpgradeSystem.selectedScroll, 1);
                        UpgradeSystem.selectedScroll = -1;
                        UpgradeSystem.targetIdx = data.inventory.indexOf(item);
                        if(log) log.innerHTML = `<div style="color:#3498db">🛡️ 파괴 방지권 소모!</div>` + log.innerHTML;
                        UpgradeSystem.stopAuto();
                    } else {
                        data.inventory.splice(UpgradeSystem.targetIdx, 1);
                        if (data.equipment[item.type] === item) data.equipment[item.type] = null;
                        UpgradeSystem.targetIdx = -1;
                        UpgradeSystem.stopAuto();
                        if(log) log.innerHTML = `<div style="color:#e74c3c">💀 장비 파괴됨...</div>` + log.innerHTML;
                    }
                } else {
                    if(log) log.innerHTML = `<div style="color:#e67e22">강화 실패 (등급 유지)</div>` + log.innerHTML;
                }
            }
        }
        UpgradeSystem.renderUI();
        MainEngine.updateUI();
    },

    startAuto: () => {
        if (UpgradeSystem.targetIdx === -1) return alert("대상을 선택하세요.");
        if (UpgradeSystem.isAuto) { UpgradeSystem.stopAuto(); return; }
        UpgradeSystem.isAuto = true;
        document.getElementById('auto-btn').innerText = "⏹ 중지";
        UpgradeSystem.autoTimer = setInterval(UpgradeSystem.try, 150);
    },

    stopAuto: () => {
        UpgradeSystem.isAuto = false;
        clearInterval(UpgradeSystem.autoTimer);
        const btn = document.getElementById('auto-btn');
        if (btn) btn.innerText = "자동 강화 시작";
    }
};
        if (typeof idx === 'undefined' || idx === null || idx < 0) return;
        UpgradeSystem.targetIdx = idx;
        UpgradeSystem.selectedScroll = -1; // 장비 바뀌면 보조템 해제
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();
    },

    // [2] 보조 아이템 선택
    selectSupport: (idx) => {
        const item = data.inventory[idx];
        if (!item) return;

        // 타입에 따라 분류
        if (item.type === 'scroll') {
            UpgradeSystem.selectedScroll = idx;
            UpgradeSystem.selectedTicket = -1; // 티켓 해제
        } else if (item.type === 'ticket') {
            UpgradeSystem.selectedTicket = idx;
            UpgradeSystem.selectedScroll = -1; // 스크롤 해제
        }
        UpgradeSystem.renderUI();
    },

    // [3] 보조 아이템 해제
    clearSupport: () => {
        UpgradeSystem.selectedScroll = -1;
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();
    },

    // UI 렌더링
    renderUI: () => {
        const display = document.getElementById('upgrade-target-display');
        const supportDisplay = document.getElementById('support-selected-display');
        const btnExec = document.getElementById('btn-up-exec');
        const btnSell = document.getElementById('btn-up-sell');
        const costDisplay = document.getElementById('up-cost-display');
        
        // 1. 장비 표시 영역 처리
        if (UpgradeSystem.targetIdx === -1 || !data.inventory[UpgradeSystem.targetIdx]) {
            if(display) display.innerHTML = '<span style="color:#888">강화할 장비를 선택해주세요.</span>';
            if(supportDisplay) supportDisplay.innerText = "선택된 보조 아이템 없음";
            if(btnExec) { btnExec.disabled = true; btnExec.innerText = "강화하기"; }
            if(btnSell) btnSell.style.display = 'none';
            if(costDisplay) costDisplay.innerText = "0 G";
            document.getElementById('up-chance').innerText = '0';
            document.getElementById('up-break').innerText = '0';
            return;
        }

        const item = data.inventory[UpgradeSystem.targetIdx];
        const cost = UpgradeSystem.calcCost(item);
        if(costDisplay) costDisplay.innerText = `${MainEngine.formatNumber(cost)} G`;

        // 2. 보조 아이템 표시 영역 처리
        let supportHtml = `<span style="color:#888">선택된 보조 아이템 없음</span>`;
        let scroll = null;
        let ticket = null;

        if (UpgradeSystem.selectedScroll !== -1) {
            scroll = data.inventory[UpgradeSystem.selectedScroll];
            if(scroll) {
                // 파괴방지권 유효성 체크
                let isUsable = true;
                let warning = "";

                if (scroll.maxLimit && item.en > scroll.maxLimit) {
                    isUsable = false;
                    warning = ` (불가: +${scroll.maxLimit}강 이하만)`;
                } else if (scroll.limitLv && item.lv > scroll.limitLv) {
                    isUsable = false;
                    warning = ` (불가: Lv.${scroll.limitLv} 이하만)`;
                }

                const color = isUsable ? '#3498db' : '#e74c3c';
                supportHtml = `<span style="color:${color}; font-weight:bold;">🛡️ ${scroll.name}${warning}</span>`;
            } else {
                UpgradeSystem.selectedScroll = -1;
            }
        } else if (UpgradeSystem.selectedTicket !== -1) {
            ticket = data.inventory[UpgradeSystem.selectedTicket];
            if(ticket) {
                // [★수정] 강화권 유효성 체크 (수치 + 레벨)
                let isUsable = true;
                let warning = "";

                // 1) 수치 체크
                if (ticket.val <= item.en) {
                    isUsable = false;
                    warning = " (수치 낮음)";
                } 
                // 2) 레벨 체크
                else if (ticket.limitLv && item.lv > ticket.limitLv) {
                    isUsable = false;
                    warning = ` (불가: Lv.${ticket.limitLv} 이하만)`;
                }

                const color = isUsable ? '#f1c40f' : '#e74c3c';
                supportHtml = `<span style="color:${color}; font-weight:bold;">🎫 ${ticket.name}${warning}</span>`;
            } else {
                UpgradeSystem.selectedTicket = -1;
            }
        }
        if(supportDisplay) supportDisplay.innerHTML = supportHtml;


        // 3. 메인 정보 및 버튼 상태 처리
        // [A] 강화권 모드
        if (ticket) {
            if(display) {
                display.innerHTML = `
                    <div style="font-size:1.2em; font-weight:bold; color:#f1c40f">${item.name} (+${item.en})</div>
                    <div style="margin-top:5px; color:#2ecc71;">▲ 강화권 적용 대기</div>`;
            }
            document.getElementById('up-chance').innerText = '100';
            document.getElementById('up-break').innerText = '0';
            
            if(btnExec) { 
                const isLevelOk = !ticket.limitLv || item.lv <= ticket.limitLv;
                const isValOk = ticket.val > item.en;

                if (isValOk && isLevelOk) {
                    btnExec.disabled = false; btnExec.innerText = "강화권 사용"; 
                } else {
                    btnExec.disabled = true; 
                    if(!isValOk) btnExec.innerText = "사용 불가 (수치 낮음)";
                    else btnExec.innerText = "사용 불가 (레벨 높음)";
                }
            }
        } 
        // [B] 일반/스크롤 모드
        else {
            const rates = UpgradeSystem.getRates(item.en);
            let destroyRate = rates.destroy;
            let scrollText = "";

            if (scroll) {
                const isOverEnchant = scroll.maxLimit && item.en > scroll.maxLimit;
                const isOverLevel = scroll.limitLv && item.lv > scroll.limitLv;

                if (isOverEnchant || isOverLevel) {
                    destroyRate = rates.destroy;
                } else {
                    destroyRate = 0;
                    scrollText = `<div style="color:#3498db; font-size:0.9em; margin-top:5px;">🛡️ 파괴 방지 적용중</div>`;
                }
            }

            if (item.en >= 20) {
                if(display) display.innerHTML = `<div style="color:#e74c3c; font-weight:bold;">🔥 ${item.name} (+${item.en}) [MAX]</div>`;
                if(btnExec) { btnExec.disabled = true; btnExec.innerText = "최대 강화 도달"; }
            } else {
                if(display) {
                    display.innerHTML = `
                        <div style="font-size:1.2em; font-weight:bold; color:${item.en >= 10 ? '#e74c3c' : '#fff'}">${item.name} (+${item.en})</div>
                        <div style="color:#aaa; font-size:0.9em;">다음 레벨: +${item.en + 1}</div>
                        ${scrollText}
                    `;
                }
                if(btnExec) { btnExec.disabled = false; btnExec.innerText = `강화하기`; }
            }

            document.getElementById('up-chance').innerText = rates.success;
            document.getElementById('up-break').innerText = destroyRate;
        }

        if(btnSell) btnSell.style.display = 'inline-block';
        if(typeof upIdx !== 'undefined') upIdx = UpgradeSystem.targetIdx; 
    },

    getRates: (en) => {
        let success = 100;
        let destroy = 0;
        if (en < 10) success = Math.max(40, 100 - (en * 5));
        else if (en === 10) success = 40;
        else success = 30;

        if (en >= 11) destroy = 5 + (en - 11) * 5; 
        return { success, destroy };
    },

    try: () => {
        if (UpgradeSystem.targetIdx === -1) return;
        const item = data.inventory[UpgradeSystem.targetIdx];
        const log = document.getElementById('log-container');
        
        if (item.en >= 20) {
            UpgradeSystem.stopAuto();
            return alert("이미 최대 강화 수치(+20)에 도달했습니다!");
        }

        // [A] 강화권 사용 실행
        if (UpgradeSystem.selectedTicket !== -1) {
            const ticket = data.inventory[UpgradeSystem.selectedTicket];
            // 1. 수치 유효성 검사
            if (!ticket || ticket.val <= item.en) return alert("사용할 수 없는 강화권입니다.");
            
            // 2. [★수정] 레벨 유효성 검사
            if (ticket.limitLv && item.lv > ticket.limitLv) {
                return alert(`[${ticket.name}]은 Lv.${ticket.limitLv} 이하의 장비에만 사용 가능합니다.\n(현재 장비: Lv.${item.lv})`);
            }

            if (confirm(`${ticket.name}을 사용하여 +${ticket.val} 강으로 만드시겠습니까?`)) {
                item.en = ticket.val;
                if (item.en > 20) item.en = 20;

                const realIdx = data.inventory.findIndex(i => i === ticket);
                if (realIdx !== -1) {
                    data.inventory.splice(realIdx, 1);
                    if (realIdx < UpgradeSystem.targetIdx) UpgradeSystem.targetIdx--;
                }

                if(log) log.innerHTML = `<div style="color:#f1c40f">🎫 [${ticket.name}] 사용 성공! -> +${item.en} 달성!</div>` + log.innerHTML;
                
                UpgradeSystem.selectedTicket = -1;
                UpgradeSystem.renderUI();
                if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
            }
            return;
        }

        // [B] 일반 강화 실행
        const cost = UpgradeSystem.calcCost(item);
        if (data.gold < cost) {
            UpgradeSystem.stopAuto();
            return alert("골드가 부족합니다.");
        }

        // 파괴방지권 체크
        let useScroll = false;
        let scrollItem = null;
        if (UpgradeSystem.selectedScroll !== -1) {
            scrollItem = data.inventory[UpgradeSystem.selectedScroll];
            if (scrollItem) {
                // 1. 강화 수치 제한 체크
                if (scrollItem.maxLimit && item.en > scrollItem.maxLimit) {
                    UpgradeSystem.stopAuto();
                    return alert(`[${scrollItem.name}]은 +${scrollItem.maxLimit}강 이하만 사용 가능합니다.`);
                }
                // 2. 아이템 레벨 제한 체크
                if (scrollItem.limitLv && item.lv > scrollItem.limitLv) {
                    UpgradeSystem.stopAuto();
                    return alert(`[${scrollItem.name}]은 Lv.${scrollItem.limitLv} 이하의 장비에만 사용 가능합니다.\n(현재 장비: Lv.${item.lv})`);
                }

                useScroll = true;
            }
        }

        data.gold -= cost;

        const rates = UpgradeSystem.getRates(item.en);
        const rand = Math.random() * 100;

        // 성공
        if (rand < rates.success) {
            item.en++;
            if (item.en > 20) item.en = 20;
            if(log) log.innerHTML = `<div style="color:#2ecc71">성공! (+${item.en}) / -${MainEngine.formatNumber(cost)}G</div>` + log.innerHTML;
            
            // 안전모드 중단 체크
            const safeMode = document.getElementById('chk-safe-mode');
            if (UpgradeSystem.isAuto && safeMode && safeMode.checked && item.en >= 10) {
                 UpgradeSystem.stopAuto();
                 alert("🎉 안전 모드: +10강을 달성하여 자동 강화를 중단합니다.");
            }
            if (item.en >= 20) {
                UpgradeSystem.stopAuto();
                alert("🎉 축하합니다! 최대 강화(+20)에 도달했습니다!");
            }
        } 
        // 실패
        else {
            const destroyRand = Math.random() * 100;
            // 파괴 판정
            if (destroyRand < rates.destroy) {
                // 방지권 사용
                if (useScroll && scrollItem) {
                    const realIdx = data.inventory.findIndex(i => i === scrollItem);
                    if (realIdx !== -1) {
                        data.inventory.splice(realIdx, 1);
                        if (realIdx < UpgradeSystem.targetIdx) UpgradeSystem.targetIdx--;
                    }
                    if(log) log.innerHTML = `<div style="color:#3498db">🛡️ 파괴 방어 성공! (${scrollItem.name} 소모) / -${MainEngine.formatNumber(cost)}G</div>` + log.innerHTML;
                    
                    UpgradeSystem.selectedScroll = -1; 
                    UpgradeSystem.stopAuto(); // 소모했으니 자동 중단
                } 
                // 장비 파괴
                else {
                    if(log) log.innerHTML = `<div style="color:#e74c3c">💀 장비 파괴됨... / -${MainEngine.formatNumber(cost)}G</div>` + log.innerHTML;
                    data.inventory.splice(UpgradeSystem.targetIdx, 1);
                    if (data.equipment[item.type] === item) data.equipment[item.type] = null;
                    UpgradeSystem.targetIdx = -1;
                    UpgradeSystem.stopAuto();
                }
            } 
            // 그냥 실패 (등급 유지)
            else {
                if(log) log.innerHTML = `<div style="color:#e67e22">실패 (등급 유지) / -${MainEngine.formatNumber(cost)}G</div>` + log.innerHTML;
            }
        }
        UpgradeSystem.renderUI();
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    },

    startAuto: () => {
        if (UpgradeSystem.targetIdx === -1 || !data.inventory[UpgradeSystem.targetIdx]) {
            return alert("강화할 대상을 먼저 선택해주세요.");
        }
        
        if (UpgradeSystem.isAuto) { 
            UpgradeSystem.stopAuto(); 
            return; 
        }

        UpgradeSystem.selectedScroll = -1;
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();

        UpgradeSystem.isAuto = true;
        const btn = document.getElementById('auto-btn');
        if (btn) btn.innerText = "⏹ 자동 강화 중지";
        
        UpgradeSystem.autoTimer = setInterval(() => {
            if (!UpgradeSystem.isAuto || UpgradeSystem.targetIdx === -1) {
                UpgradeSystem.stopAuto();
                return;
            }
            
            try {
                UpgradeSystem.try();
            } catch (e) {
                console.error("강화 중 오류 발생:", e);
                UpgradeSystem.stopAuto();
            }
        }, 150);
    }, // 콤마(,) 확인

    // ★ 이 함수가 빠져서 에러가 났던 것입니다!
    stopAuto: () => {
        UpgradeSystem.isAuto = false;
        if (UpgradeSystem.autoTimer) {
            clearInterval(UpgradeSystem.autoTimer);
            UpgradeSystem.autoTimer = null;
        }
        const btn = document.getElementById('auto-btn');
        if (btn) btn.innerText = "자동 강화 시작";
    }
}; // 마지막에 객체를 닫는 중괄호와 세미콜론 확인

