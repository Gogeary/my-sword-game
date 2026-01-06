/* ==========================================
   [광산 시스템] 4x4 그리드 채굴 로직
   ========================================== */

const MiningSystem = {
    // 1. 광산 입장 및 초기화
    enter: (tier) => {
        const mineInfo = GameDatabase.MINES[tier];
        
        // 입장 비용(탐색 비용) 체크
        if (data.gold < mineInfo.cost) {
            return alert("골드가 부족하여 광산에 입장할 수 없습니다.");
        }

        // 비용 차감
        data.gold -= mineInfo.cost;
        data.currentMineTier = tier;

        // 4x4 그리드 데이터 생성
        MiningSystem.generateGrid(mineInfo.rates);
        
        // 페이지 이동 및 UI 업데이트
        showPage('page-mine-play');
        document.getElementById('mine-title').innerText = `${mineInfo.name} 채굴 중`;
        MainEngine.updateUI();
    },

    // 2. 그리드 데이터 생성 (확률 분포 적용)
    generateGrid: (rates) => {
        data.mineGrid = [];
        for (let i = 0; i < 16; i++) {
            const r = Math.random();
            let accumulated = 0;
            let typeIndex = 0;

            // Database의 확률(rates)에 따라 광석 종류 결정
            for (let j = 0; j < rates.length; j++) {
                accumulated += rates[j];
                if (r < accumulated) {
                    typeIndex = j;
                    break;
                }
            }
            data.mineGrid.push(typeIndex);
        }
        MiningSystem.render();
    },

    // 3. 광산 화면 렌더링
    render: () => {
        const grid = document.getElementById('mine-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        let oresLeft = false;

        data.mineGrid.forEach((oreIdx, i) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            const ore = GameDatabase.ORES[oreIdx];
            cell.innerText = ore.s; // 광석 이모지 표시

            // 빈공간(Index 0)이 아닌 광석이 있는 경우
            if (oreIdx > 0) {
                oresLeft = true;
                cell.style.cursor = 'pointer';
                cell.onclick = () => MiningSystem.dig(i, ore);
            } else {
                cell.style.cursor = 'default';
            }
            
            grid.appendChild(cell);
        });

        // 요구사항: 광맥의 모든 광석을 채굴해야 새로운 탐색 버튼 노출
        const refreshBtn = document.getElementById('mine-refresh');
        if (refreshBtn) {
            refreshBtn.style.display = oresLeft ? 'none' : 'block';
        }
    },

    // 4. 채굴 실행 (클릭 시 골드 획득)
    dig: (index, ore) => {
        // 골드 획득
        data.gold += ore.v;
        
        // 해당 칸을 빈공간(0)으로 변경
        data.mineGrid[index] = 0;

        // 화면 갱신
        MiningSystem.render();
        MainEngine.updateUI();
        
        // 채굴 로그가 필요하다면 추가 (선택사항)
        // addLog(`${ore.n} 채굴! +${ore.v.toLocaleString()}G`, 'var(--mine)');
    },

    // 5. 새로운 광맥 탐색 (재입장과 동일)
    refresh: () => {
        if (data.currentMineTier !== -1) {
            MiningSystem.enter(data.currentMineTier);
        }
    }
};