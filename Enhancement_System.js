/* ============================================================
   [Enhancement_System.js] - v2.1
   기능: 강화 비용, 10강 안전 모드, 보조 아이템 UI 개선
   ============================================================ */

const UpgradeSystem = {
    targetIdx: -1,       
    selectedScroll: -1,  
    selectedTicket: -1, 
    isAuto: false,
    autoTimer: null,
    
    // [수정] 강화 비용 계산기 (5강 유지 -> 1.2배 -> 11강부터 1.8배)
    calcCost: (item) => {
        if (!item) return 0;

        // 1. 기본 비용 (아이템 가격의 10%)
        let baseCost = Math.floor(item.p * 0.1);

        // [구간 A] 5강 미만: 기존 선형 방식 유지
        if (item.en < 5) {
            return baseCost + (item.en * 1000);
        }

        // [구간 B] 5강 이상: 배율 적용 (복리 계산)
        // 기준점: 5강일 때의 비용을 먼저 계산합니다.
        let cost = baseCost + (5 * 1000);

        // 5강부터 현재 레벨까지 반복문을 돌며 배율을 곱합니다.
        for (let i = 5; i < item.en; i++) {
            if (i < 10) {
                // 5강~9강 구간 (즉, 6~10강 도전 시): 1.2배 증가
                cost *= 1.2;
            } else {
                // 10강 이상 구간 (즉, 11강 도전부터): 1.8배 증가
                cost *= 1.8;
            }
        }
       return Math.floor(cost);
    },

    selectUpgrade: (idx) => {
        if (typeof idx === 'undefined' || idx === null || idx < 0) return;
        UpgradeSystem.targetIdx = idx;
        UpgradeSystem.selectedScroll = -1;
        UpgradeSystem.selectedTicket = -1;
        
        UpgradeSystem.renderUI();
        UpgradeSystem.renderSupportItems(); 
    },

    renderUI: () => {
        const display = document.getElementById('upgrade-target-display');
        const btnExec = document.getElementById('btn-up-exec');
        const btnSell = document.getElementById('btn-up-sell');
        const costDisplay = document.getElementById('up-cost-display'); // 비용 표시용
        
        if (UpgradeSystem.targetIdx === -1 || !data.inventory[UpgradeSystem.targetIdx]) {
            if(display) display.innerHTML = '<span style="color:#888">강화할 장비를 선택해주세요.</span>';
            if(btnExec) { btnExec.disabled = true; btnExec.innerText = "강화하기"; }
            if(btnSell) btnSell.style.display = 'none';
            if(costDisplay) costDisplay.innerText = "0 G";
            document.getElementById('up-chance').innerText = '0';
            document.getElementById('up-break').innerText = '0';
            document.getElementById('support-item-area').innerHTML = '';
            return;
        }

        const item = data.inventory[UpgradeSystem.targetIdx];
        const cost = UpgradeSystem.calcCost(item);
        
        if(costDisplay) costDisplay.innerText = `${cost.toLocaleString()} G`;

        // [A] 강화권 사용 대기 상태
        if (UpgradeSystem.selectedTicket !== -1) {
            const ticket = data.inventory[UpgradeSystem.selectedTicket];
            if(display) {
                display.innerHTML = `
                    <div style="font-size:1.2em; font-weight:bold; color:#f1c40f">${item.name} (+${item.en})</div>
                    <div style="margin-top:5px; color:#2ecc71;">
                        ▲ [${ticket.name}] 사용 대기중<br>
                        (즉시 +${ticket.val} 강으로 변경)
                    </div>`;
            }
            document.getElementById('up-chance').innerText = '100';
            document.getElementById('up-break').innerText = '0';
            if(btnExec) { btnExec.disabled = false; btnExec.innerText = "강화권 사용"; }
        } 
        // [B] 일반 강화 상태
        else {
            const rates = UpgradeSystem.getRates(item.en);
            let destroyRate = rates.destroy;
            if (UpgradeSystem.selectedScroll !== -1) destroyRate = 0;

            if(display) {
                display.innerHTML = `
                    <div style="font-size:1.2em; font-weight:bold; color:${item.en >= 10 ? '#e74c3c' : '#fff'}">${item.name} (+${item.en})</div>
                    <div style="color:#aaa; font-size:0.9em;">다음 레벨: +${item.en + 1}</div>
                    ${UpgradeSystem.selectedScroll !== -1 ? '<div style="color:#3498db; margin-top:5px;">🛡️ 파괴 방지권 적용됨</div>' : ''}
                `;
            }
            document.getElementById('up-chance').innerText = rates.success;
            document.getElementById('up-break').innerText = destroyRate;
            if(btnExec) { btnExec.disabled = false; btnExec.innerText = `강화하기`; }
        }

        if(btnSell) btnSell.style.display = 'inline-block';
        if(typeof upIdx !== 'undefined') upIdx = UpgradeSystem.targetIdx; 
    },

    renderSupportItems: () => {
        const area = document.getElementById('support-item-area');
        if (!area) return;

        const item = data.inventory[UpgradeSystem.targetIdx];
        if (!item) return;

        area.innerHTML = ''; 

        // 인벤토리에서 티켓과 스크롤 찾기
        const tickets = [];
        const scrolls = [];
        data.inventory.forEach((it, idx) => {
            if (it.type === 'ticket') tickets.push({ ...it, invIdx: idx });
            if (it.type === 'scroll') scrolls.push({ ...it, invIdx: idx });
        });

        // (1) 강화권 목록
        if (tickets.length > 0) {
            const tDiv = document.createElement('div');
            tDiv.innerHTML = '<div style="font-size:0.9em; color:#ccc; margin:5px 0;">🎫 강화권 (클릭하여 선택)</div>';
            const tGrid = document.createElement('div');
            tGrid.style.display = 'flex'; tGrid.style.gap = '5px'; tGrid.style.flexWrap = 'wrap';

            tickets.forEach(t => {
                const btn = document.createElement('button');
                const isSelected = (UpgradeSystem.selectedTicket === t.invIdx);
                const isUsable = (t.val > item.en);

                btn.className = 'btn-small';
                btn.style.width = 'auto';
                btn.style.background = isSelected ? '#2ecc71' : (isUsable ? '#333' : '#222');
                btn.style.color = isUsable ? '#fff' : '#555';
                btn.style.border = isSelected ? '1px solid #fff' : '1px solid #444';
                btn.innerText = t.name;
                
                if (isUsable) {
                    btn.onclick = () => {
                        if (UpgradeSystem.selectedTicket === t.invIdx) UpgradeSystem.selectedTicket = -1;
                        else {
                            UpgradeSystem.selectedTicket = t.invIdx;
                            UpgradeSystem.selectedScroll = -1; 
                        }
                        UpgradeSystem.renderUI();
                        UpgradeSystem.renderSupportItems();
                    };
                } else { btn.disabled = true; }
                tGrid.appendChild(btn);
            });
            tDiv.appendChild(tGrid);
            area.appendChild(tDiv);
        }

        // (2) 방지권 목록
        if (UpgradeSystem.selectedTicket === -1 && scrolls.length > 0) {
            const sDiv = document.createElement('div');
            sDiv.style.marginTop = '10px';
            sDiv.innerHTML = '<div style="font-size:0.9em; color:#ccc; margin:5px 0;">🛡️ 방지권 (파괴 확률 0%)</div>';
            const sGrid = document.createElement('div');
            sGrid.style.display = 'flex'; sGrid.style.gap = '5px'; sGrid.style.flexWrap = 'wrap';

            scrolls.forEach(s => {
                const btn = document.createElement('button');
                const isSelected = (UpgradeSystem.selectedScroll === s.invIdx);
                
                btn.className = 'btn-small';
                btn.style.width = 'auto';
                btn.style.background = isSelected ? '#3498db' : '#333';
                btn.style.border = isSelected ? '1px solid #fff' : '1px solid #444';
                btn.innerText = s.name;
                
                btn.onclick = () => {
                    if (UpgradeSystem.selectedScroll === s.invIdx) UpgradeSystem.selectedScroll = -1;
                    else UpgradeSystem.selectedScroll = s.invIdx;
                    UpgradeSystem.renderUI();
                    UpgradeSystem.renderSupportItems();
                };
                sGrid.appendChild(btn);
            });
            sDiv.appendChild(sGrid);
            area.appendChild(sDiv);
        }

        // 아이템이 하나도 없을 때 메시지
        if (tickets.length === 0 && scrolls.length === 0) {
            area.innerHTML = '<div style="color:#666; font-size:0.8em; padding:5px;">(보유 중인 강화권/방지권이 없습니다)</div>';
        }
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
        
        // [A] 강화권 사용
        if (UpgradeSystem.selectedTicket !== -1) {
            const ticket = data.inventory[UpgradeSystem.selectedTicket];
            if (confirm(`${ticket.name}을 사용하여 +${ticket.val} 강으로 만드시겠습니까?`)) {
                item.en = ticket.val;
                const realTicketIdx = data.inventory.findIndex(i => i === ticket);
                if (realTicketIdx !== -1) {
                    data.inventory.splice(realTicketIdx, 1);
                    if (realTicketIdx < UpgradeSystem.targetIdx) UpgradeSystem.targetIdx--;
                }
                if(log) log.innerHTML = `<div style="color:#f1c40f">🎫 [${ticket.name}] 사용 성공! -> +${item.en} 달성!</div>` + log.innerHTML;
                
                UpgradeSystem.selectedTicket = -1;
                UpgradeSystem.renderUI();
                UpgradeSystem.renderSupportItems();
                if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
            }
            return;
        }

        // [B] 일반 강화 (비용 발생)
        const cost = UpgradeSystem.calcCost(item);
        if (data.gold < cost) {
            UpgradeSystem.stopAuto();
            return alert("골드가 부족합니다.");
        }

        // 골드 소모
        data.gold -= cost;

        const rates = UpgradeSystem.getRates(item.en);
        const rand = Math.random() * 100;

        if (rand < rates.success) {
            item.en++;
            if(log) log.innerHTML = `<div style="color:#2ecc71">성공! (+${item.en}) / -${cost}G</div>` + log.innerHTML;
            
            // [자동강화 안전장치] 10강 도달 시 자동 멈춤 (안전 모드 체크 시)
            const safeMode = document.getElementById('chk-safe-mode');
            if (UpgradeSystem.isAuto && safeMode && safeMode.checked && item.en >= 10) {
                 UpgradeSystem.stopAuto();
                 alert("🎉 안전 모드: +10강을 달성하여 자동 강화를 중단합니다.");
            }

        } else {
            const destroyRand = Math.random() * 100;
            if (destroyRand < rates.destroy) {
                if (UpgradeSystem.selectedScroll !== -1) {
                    const scroll = data.inventory[UpgradeSystem.selectedScroll];
                    const realScrollIdx = data.inventory.findIndex(i => i === scroll);
                    if (realScrollIdx !== -1) {
                        data.inventory.splice(realScrollIdx, 1);
                        if (realScrollIdx < UpgradeSystem.targetIdx) UpgradeSystem.targetIdx--;
                    }
                    if(log) log.innerHTML = `<div style="color:#3498db">🛡️ 파괴 방어 성공! (${scroll.name} 소모) / -${cost}G</div>` + log.innerHTML;
                    UpgradeSystem.selectedScroll = -1; 
                    UpgradeSystem.stopAuto(); // 방지권 썼으면 자동 멈춤
                } else {
                    if(log) log.innerHTML = `<div style="color:#e74c3c">💀 장비 파괴됨... / -${cost}G</div>` + log.innerHTML;
                    data.inventory.splice(UpgradeSystem.targetIdx, 1);
                    if (data.equipment[item.type] === item) data.equipment[item.type] = null;
                    UpgradeSystem.targetIdx = -1;
                    UpgradeSystem.stopAuto(); // 장비 터지면 자동 멈춤
                }
            } else {
                if(log) log.innerHTML = `<div style="color:#e67e22">실패 (등급 유지) / -${cost}G</div>` + log.innerHTML;
            }
        }
        UpgradeSystem.renderUI();
        UpgradeSystem.renderSupportItems();
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    },

    startAuto: () => {
        if (UpgradeSystem.isAuto) { UpgradeSystem.stopAuto(); return; }
        if (UpgradeSystem.targetIdx === -1) return alert("대상을 선택하세요.");
        
        UpgradeSystem.selectedScroll = -1;
        UpgradeSystem.selectedTicket = -1;
        UpgradeSystem.renderUI();
        UpgradeSystem.renderSupportItems();

        UpgradeSystem.isAuto = true;
        document.getElementById('auto-btn').innerText = "⏹ 중지";
        
        UpgradeSystem.autoTimer = setInterval(() => {
            if (!UpgradeSystem.isAuto || UpgradeSystem.targetIdx === -1) {
                UpgradeSystem.stopAuto();
                return;
            }
            UpgradeSystem.try();
        }, 100);
    },

    stopAuto: () => {
        UpgradeSystem.isAuto = false;
        if (UpgradeSystem.autoTimer) clearInterval(UpgradeSystem.autoTimer);
        const btn = document.getElementById('auto-btn');
        if(btn) btn.innerText = "자동 강화 시작";
    }
};


