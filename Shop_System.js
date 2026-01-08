const ShopSystem = {
    currentTab: 'equip', 

    // 1. 상점 열기 (기존과 동일)
    open: (tab) => {
        ShopSystem.currentTab = tab;
        const list = document.getElementById('shop-list');
        const title = document.getElementById('shop-title');
        
        if (!list || !title) return console.error("상점 UI 요소를 찾을 수 없습니다.");

        list.innerHTML = '';
        
        let items = [];
        
        if (tab === 'equip') {
            title.innerText = "⚔️ 장비 상점";
            items = GameDatabase.EQUIPMENT.filter(item => {
                const isLowTier = (item.tier || 1) <= 5;
                const isNotGlove = item.type !== 'gloves';
                return isLowTier && isNotGlove;
            });
        } else {
            title.innerText = "🧪 소비 아이템 상점";
            const potions = GameDatabase.CONSUMABLES.potions || [];
            const scrolls = GameDatabase.CONSUMABLES.scrolls || [];
            items = [...potions, ...scrolls];
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-card';
            
            const imgPath = item.img ? `image/${item.img}` : '';
            const imgTag = item.img ? 
                `<img src="${imgPath}" class="item-icon" onerror="this.replaceWith(document.createElement('div')); this.className='item-icon'; this.innerText='💰';">` 
                : '<div class="item-icon">💰</div>';

            let subText = "";
            if (item.info) subText = item.info;
            else if (item.type === 'potion') subText = `체력 회복: <span style="color:#e74c3c">${MainEngine.formatNumber(item.val)}</span>`;
            else if (item.type === 'scroll') subText = `효과: 강화 파괴 방지`;
            else {
                const tierVal = item.tier ? item.tier : Math.floor((item.p || 0) / 1000); 
                subText = `등급: Tier ${tierVal > 0 ? tierVal : 1}`;
            }

            div.innerHTML = `
                ${imgTag}
                <div class="item-info">
                    <strong>${item.name}</strong><br>
                    <span style="color:#aaa; font-size:0.85em;">${subText}</span><br>
                    <span style="color:var(--money); font-weight:bold;">${MainEngine.formatNumber(item.p)} G</span>
                </div>
                <button class="item-btn" style="background:var(--money); color:#000; width:60px;" onclick="ShopSystem.buy('${item.name}')">구매</button>
            `;
            list.appendChild(div);
        });
        
        if (typeof showPage === 'function') showPage('page-shop-detail');
    },

    // 2. [수정됨] 구매 로직 (MainEngine.addItem 사용)
    buy: (name) => {
        let item = GameDatabase.EQUIPMENT.find(i => i.name === name);
        if (!item) item = GameDatabase.CONSUMABLES.potions.find(i => i.name === name);
        if (!item) item = GameDatabase.CONSUMABLES.scrolls.find(i => i.name === name);

        if (!item) return alert("아이템 정보를 찾을 수 없습니다.");
        if (data.gold < item.p) return alert("골드가 부족합니다.");

        // 물약 소지 제한 체크
        if (item.type === 'potion') {
            const currentPotions = data.inventory.filter(i => i.type === 'potion').reduce((sum, i) => sum + (i.count || 1), 0);
            // 겹치기 때문에 총 개수(count 합)로 체크하거나, 슬롯 수로 체크할 수 있음. 
            // 여기서는 슬롯 수 제한을 유지하거나, 개수 제한으로 변경 가능. 
            // 일단 기존 로직(슬롯 수) 유지하되 겹치기 되므로 10슬롯이면 충분함.
            const potionSlots = data.inventory.filter(i => i.type === 'potion').length;
            if (potionSlots >= GameDatabase.SYSTEM.MAX_POTION_CAPACITY && !data.inventory.find(i=>i.name === item.name)) {
                 return alert(`물약 슬롯이 가득 찼습니다. (${GameDatabase.SYSTEM.MAX_POTION_CAPACITY}칸)`);
            }
        }

        // 결제
        data.gold -= item.p;

        // ★ [핵심] 겹치기 적용을 위해 addItem 호출
        // (깊은 복사를 위해 전개 연산자 사용)
        const newItem = { ...item, en: 0, count: 1 };
        
        // 장비일 경우에만 새 ID 생성 (addItem 내부에서 처리하지만 명시적으로 삭제)
        if (['weapon','armor','belt','gloves','shoes'].includes(item.type)) {
            newItem.id = Date.now() + Math.random();
        } 
        // 소비템은 ID를 DB 그대로 유지해야 addItem에서 이름/ID로 찾기 쉬움 (여기서는 이름으로 찾게 수정했으므로 상관없음)

        MainEngine.addItem(newItem);
        alert(`${item.name}을(를) 구매했습니다!`);
        
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    },

  // 3. [수정됨] 뽑기 실행 로직 (상자 키 기반)
    playGacha: (boxKey, count) => {
        const boxData = GameDatabase.GACHA[boxKey];
        if (!boxData) return alert("존재하지 않는 뽑기 상자입니다.");

        const cost = boxData.cost * count;

        if (data.gold < cost) return alert(`골드가 부족합니다. (${MainEngine.formatNumber(cost)} G 필요)`);
        if (data.inventory.length > 100) return alert("인벤토리가 가득 찼습니다!");

        if(!confirm(`[${boxData.name}]\n${MainEngine.formatNumber(cost)} G를 사용하여 ${count}회 뽑으시겠습니까?`)) return;

        data.gold -= cost;
        const logBox = document.getElementById('gacha-log');
        if(logBox) logBox.innerHTML = ''; 

        let results = [];

        // 뽑기 반복 실행
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
            // 오차 방지용 안전장치 (맨 마지막 아이템 선택)
            if (!selectedOption) selectedOption = boxData.rates[boxData.rates.length - 1];

            // 실제 아이템 데이터 찾기 (ID 또는 값으로 매칭)
            let pick = null;
            
            // A. 강화권일 경우
            if (selectedOption.type === 'ticket') {
                // limitLv까지 체크하여 정확한 강화권 찾기
                // 예: boxKey가 BOX_30이면 limitLv 30인 티켓을 찾아야 함
                // boxData.rates에는 limitLv 정보가 없으므로 boxData 이름이나 티켓 목록에서 필터링 필요.
                // 여기서는 rates에 정의된 val(강화수치)와 box의 레벨대(30,50,70,100)를 기준으로 찾습니다.
                
                let targetLv = 30;
                if (boxKey === 'BOX_50') targetLv = 50;
                if (boxKey === 'BOX_70') targetLv = 70;
                if (boxKey === 'BOX_100') targetLv = 100;

                const ticketBase = GameDatabase.CONSUMABLES.tickets.find(t => 
                    t.val === selectedOption.val && t.limitLv === targetLv
                );
                if (ticketBase) pick = { ...ticketBase };
            } 
            // B. 주문서일 경우
            else {
                const scrollBase = GameDatabase.CONSUMABLES.scrolls.find(s => s.id === selectedOption.id);
                if (scrollBase) pick = { ...scrollBase };
            }

            if (pick) {
                pick.displayColor = selectedOption.color;
                pick.displayName = selectedOption.name;
                pick.count = 1;
                
                MainEngine.addItem(pick);
                results.push(pick);
            } else {
                results.push({ displayName: "오류: 아이템 없음", displayColor: "#555" });
            }
        }

        // 결과 로그 출력
        if(logBox) {
            results.forEach((res, idx) => {
                const div = document.createElement('div');
                div.style.padding = "5px";
                div.style.borderBottom = "1px solid #333";
                div.innerHTML = `<span style="color:#888;">#${idx+1}</span> <span style="color:${res.displayColor}; font-weight:bold;">${res.displayName || res.name}</span> 획득!`;
                logBox.appendChild(div);
            });
            logBox.scrollTop = logBox.scrollHeight;
        }

        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    },

   합성 시스템을 **레벨 구간(30, 50, 70, 100)**별로 나누어 처리하려면, craft 함수뿐만 아니라 화면을 그려주는 render 함수도 함께 수정해야 합니다.

그래야 화면에 [Lv.30] +5 합성 버튼과 [Lv.100] +5 합성 버튼이 따로 생성되고, 각각의 재료를 올바르게 소모할 수 있습니다.

Shop_System.js 파일의 하단에 있는 SynthesisSystem 객체 전체를 아래 코드로 교체해 주세요.

🛠️ Shop_System.js 수정 (SynthesisSystem 부분)
JavaScript

/* ==========================================
   [Shop_System.js] 하단 부분
   합성 시스템 (수정됨: 4단계 레벨 구간 적용)
   ========================================== */
const SynthesisSystem = {
    // 1. 레벨 구간 정의
    tiers: [30, 50, 70, 100],

    // 2. 합성 레시피 정의 (재료 -> 결과)
    recipes: [
        { src: 5, dst: 7 },
        { src: 7, dst: 10 },
        { src: 10, dst: 12 },
        { src: 12, dst: 13 },
        { src: 13, dst: 14 },
        { src: 14, dst: 15 }
    ],

    open: () => {
        showPage('page-synthesis');
        SynthesisSystem.render();
    },

    // 3. [수정됨] UI 렌더링 (구간별로 분류하여 표시)
    render: () => {
        const list = document.getElementById('synthesis-list');
        if (!list) return;
        list.innerHTML = '';

        // 현재 인벤토리의 강화권 수량 파악 (Key: "val_limitLv" 형태)
        // 예: "5_30" -> 3개
        const ticketCounts = {};
        data.inventory.forEach(item => {
            if (item.type === 'ticket') {
                const key = `${item.val}_${item.limitLv}`;
                ticketCounts[key] = (ticketCounts[key] || 0) + (item.count || 1);
            }
        });

        // 각 티어별로 섹션 생성
        SynthesisSystem.tiers.forEach(tier => {
            // 섹션 헤더 (구분선)
            const header = document.createElement('div');
            header.style.padding = "10px";
            header.style.marginTop = "10px";
            header.style.backgroundColor = "#333";
            header.style.color = "#f1c40f";
            header.style.fontWeight = "bold";
            header.innerText = `▼ 장비 레벨제한 ${tier}Lv 구간`;
            list.appendChild(header);

            // 해당 티어의 레시피 생성
            SynthesisSystem.recipes.forEach(recipe => {
                const countKey = `${recipe.src}_${tier}`;
                const count = ticketCounts[countKey] || 0;
                const canCraft = count >= 3;

                const div = document.createElement('div');
                div.className = 'item-card';
                div.style.border = canCraft ? '1px solid #2ecc71' : '1px solid #444';
                div.style.marginBottom = '5px';
                
                div.innerHTML = `
                    <div style="flex:1; text-align:left; padding-left:10px;">
                        <div style="font-size:1.0em; color:#fff;">
                            <span style="color:#aaa; font-size:0.8em;">[Lv.${tier}]</span> 
                            +${recipe.src}권 <span style="color:#aaa;">x3</span> 
                            <span style="margin:0 5px;">➡</span> 
                            <span style="color:#f1c40f; font-weight:bold;">+${recipe.dst}권</span>
                        </div>
                        <div style="font-size:0.85em; color:${canCraft ? '#2ecc71' : '#e74c3c'}; margin-top:4px;">
                            보유량: ${count} / 3
                        </div>
                    </div>
                    <button class="item-btn" 
                        style="background:${canCraft ? '#27ae60' : '#555'}; color:#fff; width:70px; padding:8px;" 
                        onclick="ShopSystem.craft(${recipe.src}, ${recipe.dst}, ${tier})" 
                        ${canCraft ? '' : 'disabled'}>
                        합성
                    </button>
                `;
                list.appendChild(div);
            });
        });
    },

    // 4. [수정됨] 합성 로직 (티어 구분 추가)
    // 인자값: srcVal(재료수치), dstVal(결과수치), limitLv(티어)
    craft: (srcVal, dstVal, limitLv) => {
        // 해당 티어의 재료 아이템 찾기
        const srcItem = data.inventory.find(i => 
            i.type === 'ticket' && 
            i.val === srcVal && 
            i.limitLv === limitLv
        );
        
        const currentCount = srcItem ? (srcItem.count || 1) : 0;

        if (currentCount < 3) return alert("재료가 부족합니다.");

        if (!confirm(`[Lv.${limitLv}] +${srcVal} 강화권 3개를 사용하여\n[Lv.${limitLv}] +${dstVal} 강화권을 만드시겠습니까?`)) return;

        // 재료 소모 (겹치기 처리)
        srcItem.count -= 3;
        if (srcItem.count <= 0) {
            const idx = data.inventory.indexOf(srcItem);
            if (idx > -1) data.inventory.splice(idx, 1);
        }

        // 결과물 지급 (같은 티어의 상위 강화권 찾기)
        const targetTicket = GameDatabase.CONSUMABLES.tickets.find(t => 
            t.val === dstVal && 
            t.limitLv === limitLv
        );
        
        if (targetTicket) {
            // MainEngine.addItem을 사용하여 겹치기 처리
            const newItem = { ...targetTicket, count: 1, en: 0 };
            MainEngine.addItem(newItem);
            alert(`🎉 합성 성공! [Lv.${limitLv} +${dstVal} 강화권] 획득!`);
        } else {
            alert(`데이터 오류: Lv.${limitLv} +${dstVal} 강화권을 DB에서 찾을 수 없습니다.`);
            // 복구 로직 (에러 시 재료 돌려주기)
            srcItem.count += 3;
            if(!data.inventory.includes(srcItem)) data.inventory.push(srcItem);
        }

        // UI 갱신
        SynthesisSystem.render();
        if (typeof MainEngine !== 'undefined') MainEngine.updateUI();
    }
};
