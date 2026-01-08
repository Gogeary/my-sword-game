/* ==========================================
   [Shop_System.js] 
   상점 시스템 (장비 / 소비 / 뽑기 통합)
   ========================================== */

const ShopSystem = {
    currentTab: 'equip', 

    // 1. 상점 열기 & 목록 표시
    open: (tab) => {
        ShopSystem.currentTab = tab;
        const list = document.getElementById('shop-list');
        const title = document.getElementById('shop-title');
        
        if (!list || !title) return console.error("상점 UI 요소를 찾을 수 없습니다.");

        list.innerHTML = ''; // 기존 목록 비우기
        
        if (tab === 'equip') {
            title.innerText = "⚔️ 장비 상점";
            // 5티어 이하 + 글러브 제외
            const items = GameDatabase.EQUIPMENT.filter(item => {
                const isLowTier = (item.tier || 1) <= 5;
                const isNotGlove = item.type !== 'gloves';
                return isLowTier && isNotGlove;
            });
            ShopSystem.renderItems(items, list);

        } else if (tab === 'consume') {
            title.innerText = "🧪 소비 아이템 상점";
            
            // --- [수정 구간] ---
            // 1. 포션은 그대로 판매 (필요 없다면 이 줄을 지우세요)
            const potions = GameDatabase.CONSUMABLES.potions || [];
            
            // 2. 주문서 중에서 'limitLv'가 30인 '파괴 방지권'만 필터링
            const targetScrolls = (GameDatabase.CONSUMABLES.scrolls || []).filter(s => s.limitLv === 30);
            
            // 3. 강화권(tickets)은 상점에서 직접 팔지 않고 필터에서 제외 (뽑기와 합성으로만 획득)
            
            ShopSystem.renderItems([...potions, ...targetScrolls], list);
            // ------------------
        } else if (tab === 'gacha') {
            title.innerText = "🎲 행운의 뽑기 상점";
            // ★ [중요] 뽑기 상자 전용 렌더링 함수 호출
            ShopSystem.renderGachaBoxes(list);
        }

        // 페이지 이동
        if (typeof showPage === 'function') showPage('page-shop-detail');
    },

    // 일반 아이템 출력 함수
    renderItems: (items, listElement) => {
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-card';
            const imgPath = item.img ? `image/${item.img}` : '';
            const imgTag = item.img ? 
                `<img src="${imgPath}" class="item-icon" onerror="this.replaceWith(document.createElement('div')); this.className='item-icon'; this.innerText='💰';">` 
                : '<div class="item-icon">💰</div>';

            let subText = item.info || "";
            div.innerHTML = `
                ${imgTag}
                <div class="item-info">
                    <strong>${item.name}</strong><br>
                    <span style="color:#aaa; font-size:0.85em;">${subText}</span><br>
                    <span style="color:var(--money); font-weight:bold;">${MainEngine.formatNumber(item.p)} G</span>
                </div>
                <button class="item-btn" style="background:var(--money); color:#000; width:60px;" onclick="ShopSystem.buy('${item.name}')">구매</button>
            `;
            listElement.appendChild(div);
        });
    },

    // 3. 뽑기 실행 로직 (최종 수정본)
    playGacha: (boxKey, count) => {
        const boxData = GameDatabase.GACHA[boxKey];
        if (!boxData) return alert("존재하지 않는 뽑기 상자입니다.");

        const cost = boxData.cost * count;
        if (data.gold < cost) return alert(`골드가 부족합니다. (${MainEngine.formatNumber(cost)} G 필요)`);
        if (data.inventory.length > 100) return alert("인벤토리가 가득 찼습니다!");

        if(!confirm(`[${boxData.name}]\n${MainEngine.formatNumber(cost)} G를 사용하여 ${count}회 뽑으시겠습니까?`)) return;

        data.gold -= cost;
        
        // 로그 박스 찾기 (ShopSystem.renderGachaBoxes에서 생성된 id="gacha-log")
        const logBox = document.getElementById('gacha-log');
        if(logBox) {
            logBox.innerHTML = ''; // 이전 로그 초기화
            logBox.style.color = "#fff";
        }

        let results = [];

        for (let i = 0; i < count; i++) {
            const rand = Math.random() * 100;
            let currentProb = 0;
            let selectedOption = null;

            for (let rate of boxData.rates) {
                currentProb += rate.chance;
                if (rand < currentProb) {
                    selectedOption = rate;
                    break;
                }
            }
            if (!selectedOption) selectedOption = boxData.rates[boxData.rates.length - 1];

            let pick = null;
            
            // A. 강화권(ticket) 처리
            if (selectedOption.type === 'ticket') {
                // [개선] 문자열에서 숫자만 추출 (BOX_30 -> 30, BOX100 -> 100 모두 대응)
                const targetLimitLv = parseInt(boxKey.replace(/[^0-9]/g, ''));
                
                pick = GameDatabase.CONSUMABLES.tickets.find(t => 
                    t.val === selectedOption.val && t.limitLv === targetLimitLv
                );
            } 
            // B. 주문서(scroll) 처리
            else if (selectedOption.type === 'scroll') {
                pick = GameDatabase.CONSUMABLES.scrolls.find(s => s.id === selectedOption.id);
            }

            if (pick) {
                const newItem = { ...pick, count: 1 };
                MainEngine.addItem(newItem);
                results.push({ name: pick.name, color: selectedOption.color || '#fff' });
            } else {
                results.push({ name: "데이터 오류 (매칭 실패)", color: "#555" });
            }
        }

        // 결과 출력
        if(logBox) {
            results.forEach((res, idx) => {
                const div = document.createElement('div');
                div.style.padding = "3px 0";
                div.style.borderBottom = "1px solid #222";
                div.innerHTML = `<span style="color:#888;">#${idx+1}</span> <span style="color:${res.color}; font-weight:bold;">${res.name}</span> 획득!`;
                logBox.appendChild(div);
            });
            logBox.scrollTop = logBox.scrollHeight;
        }

        MainEngine.updateUI();
    },

    // 4. 합성 로직
    craft: (srcVal, dstVal, limitLv) => {
        const srcItem = data.inventory.find(i => i.type === 'ticket' && i.val === srcVal && i.limitLv === limitLv);
        if (!srcItem || (srcItem.count || 0) < 3) return alert("재료가 부족합니다.");

        if (!confirm(`[Lv.${limitLv}] +${srcVal} 강화권 3개를 소모합니까?`)) return;

        srcItem.count -= 3;
        if (srcItem.count <= 0) data.inventory.splice(data.inventory.indexOf(srcItem), 1);

        const target = GameDatabase.CONSUMABLES.tickets.find(t => t.val === dstVal && t.limitLv === limitLv);
        MainEngine.addItem({ ...target, count: 1 });
        
        alert("🎉 합성 성공!");
        SynthesisSystem.render();
        MainEngine.updateUI();
    }
};

const SynthesisSystem = {
    tiers: [30, 50, 70, 100],
    recipes: [{src:5,dst:7},{src:7,dst:10},{src:10,dst:12},{src:12,dst:13},{src:13,dst:14},{src:14,dst:15}],
    open: () => { showPage('page-synthesis'); SynthesisSystem.render(); },
    render: () => {
        const list = document.getElementById('synthesis-list');
        list.innerHTML = '';
        const counts = {};
        data.inventory.forEach(i => { if(i.type==='ticket') counts[`${i.val}_${i.limitLv}`] = (counts[`${i.val}_${i.limitLv}`]||0) + (i.count||1); });

        SynthesisSystem.tiers.forEach(tier => {
            const h = document.createElement('div');
            h.style = "padding:10px; background:#333; color:#f1c40f; font-weight:bold; margin-top:10px;";
            h.innerText = `▼ ${tier}Lv 장비용 강화권 합성`;
            list.appendChild(h);

            SynthesisSystem.recipes.forEach(r => {
                const c = counts[`${r.src}_${tier}`] || 0;
                const div = document.createElement('div');
                div.className = 'item-card';
                div.innerHTML = `
                    <div style="flex:1; text-align:left; padding-left:10px;">
                        +${r.src} x3 ➡ <span style="color:#f1c40f">+${r.dst}</span> (보유: ${c}/3)
                    </div>
                    <button class="item-btn" style="background:${c>=3?'#27ae60':'#555'}" onclick="ShopSystem.craft(${r.src},${r.dst},${tier})" ${c<3?'disabled':''}>합성</button>
                `;
                list.appendChild(div);
            });
        });
    }
};



