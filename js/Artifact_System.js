const ArtifactSystem = {
    // 20레벨당 1개 개방 (최대 5개)
    getSlotCount: () => Math.min(5, Math.floor(data.level / 10)),

    // 개별 아티팩트 효과 텍스트 생성
    getEffectText: function(art) {
        const info = GameDatabase.ARTIFACT_EFFECTS[art.effect];
        // 성급에 따른 수치 계산 (0성: 100%, 1성: 150%...)
        const multiplier = 1 + (art.star * 0.5);
        const val = art.baseVal * multiplier;
        return info.desc.replace('{v}', `<b style="color:#f1c40f">${val.toFixed(1)}</b>`);
    },

    render: function() {
        const listEl = document.getElementById('artifact-list');
        const slotsEl = document.getElementById('artifact-slots-display');
        const statsEl = document.getElementById('artifact-total-stats');
        if(!listEl || !slotsEl || !statsEl) return;

        // [추가된 안전장치 1] 데이터 배열이 없으면 초기화
        if (!data.artifacts) data.artifacts = [];
        if (!data.equippedArtifacts) data.equippedArtifacts = [null, null, null, null, null];

        const unlocked = this.getSlotCount();
        const pStats = MainEngine.getFinalStats();


        // 1. 총 효과 요약 렌더링 (배수 및 보너스 수치)
        let summaryHtml = '';
        const displayData = [
            { label: '공격력 증폭', val: pStats.atkBonusMult, unit: '배' },
            { label: '방어력 증폭', val: pStats.defBonusMult, unit: '배' },
            { label: '체력 증폭', val: pStats.hpBonusMult, unit: '배' },
            { label: '골드 보너스', val: pStats.goldBonus, unit: '%' },
            { label: '경험치 보너스', val: pStats.expBonus, unit: '%' },
            { label: '휴식 회복량', val: pStats.restBonus, unit: '%' }
        ];

        displayData.forEach(e => {
            // 배수는 1배 초과일 때, 보너스는 0% 초과일 때만 노출
            const isActive = (e.unit === '배') ? (e.val > 1) : (e.val > 0);
            if(isActive) {
                const displayVal = (e.unit === '배') ? e.val.toFixed(2) : e.val.toFixed(1);
                summaryHtml += `
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px; border-bottom:1px dotted rgba(224, 86, 253, 0.2); padding-bottom:2px;">
                        <span style="color:#aaa; font-size:0.9em;">${e.label}</span>
                        <span style="color:#f1c40f; font-weight:bold; font-size:0.9em;">${displayVal}${e.unit}</span>
                    </div>`;
            }
        });
        statsEl.innerHTML = summaryHtml || '<div style="color:#666; text-align:center; padding-top:20px; font-size:0.8em;">장착 효과 없음</div>';

        // 2. 슬롯 렌더링
        let slotsHtml = '';
        const openLevels = [10, 20, 30, 40, 50];

        for(let i=0; i<5; i++) {
            const isLocked = i >= unlocked;
            const artUid = data.equippedArtifacts[i];
            const art = artUid ? data.artifacts.find(a => a.uid === artUid) : null;
            
            slotsHtml += `
                <div class="art-slot ${isLocked ? 'locked' : (art ? 'filled' : 'empty-pulse')}" 
                     onclick="${art ? `ArtifactSystem.toggle('${art.uid}')` : ''}"
                     style="cursor:${art ? 'pointer' : 'default'};">
                    <div class="slot-tag" style="position:absolute; top:5px; left:5px; z-index:10; font-size:10px; color:${isLocked ? '#444' : '#e056fd'}; font-weight:bold;">
                        ${isLocked ? '🔒' : (i+1)}
                    </div>
                    
                    ${art ? `
                        <div class="art-img-container-inner">
                            <img src="image/${art.img}" class="floating-img" onerror="this.src='image/unknown.png'">
                        </div>
                        <div class="art-star-footer">${'★'.repeat(art.star)}</div>
                    ` : (isLocked ? `<span class="lock-lv-text" style="font-size:10px; color:#444;">Lv.${openLevels[i]}</span>` : '<span style="font-size:8px; color:#333;">EMPTY</span>')}
                </div>`;
        }
        slotsEl.innerHTML = slotsHtml;

        // 3. 리스트 렌더링
        listEl.innerHTML = '';
        if (!data.artifacts || data.artifacts.length === 0) {
            listEl.innerHTML = '<div style="color:#666; text-align:center; padding:40px;">보유한 유물이 없습니다.<br><span style="font-size:0.8em;">보스 몬스터를 처치하여 유물을 획득하세요!</span></div>';
            return;
        }

        data.artifacts.forEach(art => {
            const isEquipped = data.equippedArtifacts.includes(art.uid);
            const req = art.star + 1; // 강화 필요 재료 수
            // 재료 후보: 동일 ID 아이템 중 나 자신 제외 + 장착되지 않은 것
            const mats = data.artifacts.filter(a => a.id === art.id && a.uid !== art.uid && !data.equippedArtifacts.includes(a.uid));
            
            const card = document.createElement('div');
            card.className = `artifact-item-card ${isEquipped ? 'equipped' : ''}`;
            card.innerHTML = `
                <div style="display:flex; gap:12px;">
                    <div class="art-icon-container">
                        <img src="image/${art.img}" onerror="this.src='image/unknown.png'">
                    </div>
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <b class="art-name-text" style="color:#fff;">${art.name}</b>
                            <span class="art-star-badge">${art.star}성</span>
                        </div>
                        <div style="font-size:0.85em; color:#e0aaff; margin-top:2px;">${this.getEffectText(art)}</div>
                    </div>
                </div>
                <div class="art-desc-box">${art.desc}</div>
                <div style="display:flex; gap:8px; margin-top:5px;">
                    <button class="btn-enhance-new" onclick="ArtifactSystem.enhance('${art.uid}')" 
                        ${art.star >= 5 || mats.length < req ? 'disabled' : ''} 
                        style="flex:1.5; height:36px; cursor:pointer;">
                        강화 (${mats.length}/${req})
                    </button>
                    <button class="btn-equip-new ${isEquipped ? 'is-equipped' : ''}" 
                        onclick="ArtifactSystem.toggle('${art.uid}')" 
                        style="flex:1; height:36px; cursor:pointer;">
                        ${isEquipped ? '해제' : '장착'}
                    </button>
                </div>`;
            listEl.appendChild(card);
        });
    },

    // 장착/해제 로직
    toggle: function(uid) {
        const artToEquip = data.artifacts.find(a => a.uid === uid);
        if(!artToEquip) return;

        const idx = data.equippedArtifacts.indexOf(uid);
        if(idx !== -1) {
            // 이미 장착됨 -> 해제
            data.equippedArtifacts[idx] = null;
            MainEngine.showNotification("유물 장착을 해제했습니다.", "#aaa");
        } else {
            // [중복 방지 추가] 이미 동일한 종류(ID)의 유물이 장착되어 있는지 확인
            const isAlreadyEquippedType = data.equippedArtifacts.some(equippedUid => {
                if(!equippedUid) return false;
                const equippedArt = data.artifacts.find(a => a.uid === equippedUid);
                return equippedArt && equippedArt.id === artToEquip.id;
            });

            if(isAlreadyEquippedType) {
                return alert("동일한 종류의 유물은 중복 장착할 수 없습니다.");
            }

            // 장착 시도 -> 빈 슬롯 확인
            const emptyIdx = data.equippedArtifacts.findIndex((s, i) => s === null && i < this.getSlotCount());
            if(emptyIdx === -1) return alert("장착할 수 있는 슬롯이 부족하거나 레벨 제한에 걸려 있습니다.");
            
            data.equippedArtifacts[emptyIdx] = uid;
            MainEngine.showNotification("유물을 장착했습니다.", "#e056fd");
        }
        this.render(); 
        MainEngine.updateUI();
        MainEngine.isDirty = true;
    },

    // 강화 로직
    enhance: function(uid) {
        const art = data.artifacts.find(a => a.uid === uid);
        if (!art || art.star >= 5) return;

        const req = art.star + 1;
        const mats = data.artifacts.filter(a => a.id === art.id && a.uid !== art.uid && !data.equippedArtifacts.includes(a.uid));
        
        if (mats.length < req) return alert("강화 재료가 부족합니다.");

        if(!confirm(`${art.name}을(를) ${art.star + 1}성으로 강화하시겠습니까?\n동일한 유물 ${req}개가 재료로 소모됩니다.`)) return;
        
        // 재료 제거 (앞에서부터 req개만큼 제거)
        for(let i=0; i<req; i++) {
            const matIdx = data.artifacts.findIndex(a => a.uid === mats[i].uid);
            if(matIdx !== -1) data.artifacts.splice(matIdx, 1);
        }
        
        art.star++;
        MainEngine.showNotification(`${art.name} 강화 성공! (${art.star}성)`, "#f1c40f");
        
        this.render(); 
        MainEngine.updateUI();
        MainEngine.isDirty = true;
    }
};