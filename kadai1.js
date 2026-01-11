mapboxgl.accessToken = 'pk.eyJ1IjoieW9uZXgwNTAxIiwiYSI6ImNtaHUyaGp2ZjF2aGIybnB2MTltbmY5a3YifQ.X1acqoB4pWBlYcvOHHzlTQ';


const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [136.6624, 36.5621],
    zoom: 14
});

const categoryColors = { "🍽️ グルメ": "#ff4500", "🏞️ 絶景・風景": "#2e8b57", "🛍️ ショッピング": "#ba55d3", "🏛️ 歴史・文化": "#8b4513", "☕ カフェ・休憩": "#deb887", "✨ その他": "#3fb1ce" };
// --- グローバル変数の追加 ---
let currentTab = 'latest'; // 'latest' か 'recommend'
map.addControl(new MapboxLanguage({ defaultLanguage: 'ja' }));

// ★施設検索(poi)を有効にした検索機能
map.addControl(new MapboxGeocoder({ 
    accessToken: mapboxgl.accessToken, 
    mapboxgl: mapboxgl, 
    placeholder: '駅名、店名、場所を検索', 
    language: 'ja', 
    countries: 'jp',
    types: 'poi,place,address,locality' 
}), 'top-left');

// --- タブ切り替え関数 ---
window.switchTab = (tab) => {
    currentTab = tab;
    document.getElementById('tab-latest').classList.toggle('active', tab === 'latest');
    document.getElementById('tab-recommend').classList.toggle('active', tab === 'recommend');
    renderSpots();
};

map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }), 'top-right');

let selectedLngLat = null;
const markers = {};

const postFormContainer = document.getElementById('post-form-container');
const showFormBtn = document.getElementById('show-form-btn');
const hideFormBtn = document.getElementById('hide-form-btn');

const toggleForm = (show) => {
    if(postFormContainer) postFormContainer.style.display = show ? 'block' : 'none';
};

if(showFormBtn) showFormBtn.addEventListener('click', () => toggleForm(true));
if(hideFormBtn) hideFormBtn.addEventListener('click', () => toggleForm(false));

function getSavedSpots() { return JSON.parse(localStorage.getItem('touristSpots') || "[]"); }

function renderSpots() {
    Object.values(markers).forEach(m => m.remove());
    const listElement = document.getElementById('spot-list-items');
    if (!listElement) return;
    listElement.innerHTML = '';

    let spots = getSavedSpots();

    // 1. 検索フィルタリング
    const searchQuery = document.getElementById('spot-search')?.value.trim().toLowerCase() || "";
    if (searchQuery) {
        const keywords = searchQuery.split(/[\s　]+/);
        spots = spots.filter(s => keywords.every(kw => (s.name + s.comment + s.category).toLowerCase().includes(kw)));
    }

    // 2. タブによる並べ替えと抽出
    if (currentTab === 'latest') {
        spots.sort((a, b) => b.id - a.id); // 新しい順
    } else {
        spots.sort(() => Math.random() - 0.5); // ランダム
    }

    // 3. 最大5件に制限
    const displaySpots = spots.slice(0, 5);

    displaySpots.forEach(spot => {
        const googleMapUrl = `https://www.google.com/maps?q=${spot.lat},${spot.lng}`;
        // マーカーの要素を作成（直接クリックを制御するため）
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundColor = categoryColors[spot.category] || "#3fb1ce";
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';

        // ★ ピンをクリックした時の処理
        el.addEventListener('click', (e) => {
            e.stopPropagation(); // ★ 地図へのクリックイベント伝播を阻止！

            const detailPanel = document.getElementById('spot-detail-panel');
            const linkBtn = spot.link ? `<a href="${spot.link}" target="_blank" class="action-btn" style="border: 1px solid #eff3f4; padding: 5px 10px; border-radius: 15px; text-decoration:none;">🔗 ウェブ</a>` : '';
            const detailContent = document.getElementById('detail-content');

            detailContent.innerHTML = `
                <div style="font-weight:bold; font-size:16px; margin-bottom:5px;">${spot.name}</div>
                <div style="font-size:12px; color:#536471; margin-bottom:10px;">${spot.category}</div>
                <div style="font-size:14px; margin-bottom:10px;">${spot.comment}</div>
                ${spot.photo ? `<img src="${spot.photo}" style="width:100%; border-radius:8px;">` : ''}
                <div style="margin-top:10px;">
　　　　　　　　<button class="action-btn" onclick="likeSpot(${spot.id})" style="border: 1px solid #eff3f4; padding: 5px 10px; border-radius: 15px;">❤️ <span id="detail-likes-${spot.id}">${spot.likes || 0}</span></button>
                <button class="action-btn" onclick="speakSpot(${spot.id})">🔊 読み上げ</button>
                <a href="${googleMapUrl}" target="_blank" class="action-btn">🌐 GoogleMap</a>
                ${linkBtn}<button class="action-btn" onclick="deleteSpot(${spot.id})" style="color:red;">🗑️ 削除</button>
                </div>
            `;
            detailPanel.style.display = 'block';

            // 地図をその場所へ移動
            map.flyTo({ center: [spot.lng, spot.lat], zoom: 16 });
        });

        const marker = new mapboxgl.Marker(el)
            .setLngLat([spot.lng, spot.lat])
            .addTo(map);
        markers[spot.id] = marker;
        const linkBtn = spot.link ? `<a href="${spot.link}" target="_blank" class="action-btn" style="border: 1px solid #eff3f4; padding: 5px 10px; border-radius: 15px; text-decoration:none;">🔗 ウェブ</a>` : '';

        const item = document.createElement('div');
        item.className = 'spot-list-item';
        item.innerHTML = `
            <div onclick="map.flyTo({ center: [${spot.lng}, ${spot.lat}], zoom: 16 })" style="cursor:pointer;">
                <div class="card-header">
                    <span class="user-name">👤 ${spot.name}</span>
                    <span class="category-badge">${spot.category}</span>
                </div>
                <div class="post-content">${spot.comment}</div>
            </div>
            <div class="card-actions">
                <button class="action-btn" onclick="likeSpot(${spot.id})">❤️ ${spot.likes || 0}</button>
                <button class="action-btn" onclick="speakSpot(${spot.id})">🔊 読み上げ</button>
                <a href="${googleMapUrl}" target="_blank" class="action-btn">🌐 GoogleMap</a>
                ${linkBtn}<button class="action-btn" onclick="deleteSpot(${spot.id})" style="color:red;">🗑️ 削除</button>
            </div>`;
        listElement.appendChild(item);
    });
}

map.on('click', (e) => {
    // 詳細パネルが開いていたら閉じる
    document.getElementById('spot-detail-panel').style.display = 'none';

    selectedLngLat = e.lngLat;
    document.getElementById('coords-display').innerText = `📍 場所を選択しました`;
    document.getElementById('submit-btn').disabled = false;

    // フォームを表示（リストを隠す処理を含む）
    toggleForm(true);
});

document.getElementById('spot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const photoFile = document.getElementById('spot-photo-file').files[0];
    const photoDataUrl = photoFile ? await new Promise(r => { const rd = new FileReader(); rd.onload = ev => r(ev.target.result); rd.readAsDataURL(photoFile); }) : "";

    const spots = getSavedSpots();
    spots.push({
        id: Date.now(),
        name: document.getElementById('spot-name').value,
        category: document.getElementById('spot-category').value,
        comment: document.getElementById('spot-comment').value,
        link: document.getElementById('spot-link').value, // ★追加
        photo: photoDataUrl,
        lat: selectedLngLat.lat,
        lng: selectedLngLat.lng,
        likes: 0
    });

    localStorage.setItem('touristSpots', JSON.stringify(spots));
    e.target.reset();
    currentTab = 'latest';
    toggleForm(false);
    renderSpots();
});

window.likeSpot = (id) => {
    let spots = getSavedSpots();
    const s = spots.find(x => x.id === id);

    if (s) {

        s.likes = (s.likes || 0) + 1;


        localStorage.setItem('touristSpots', JSON.stringify(spots));


        renderSpots();

        const detailLikeSpan = document.getElementById(`detail-likes-${id}`);
        if (detailLikeSpan) {
            detailLikeSpan.innerText = s.likes;
        }

        // --- おまけ：いいねした時のぷるんとしたアニメーション ---
        const btn = event.currentTarget;
        if (btn) {
            btn.style.transform = "scale(1.3)";
            setTimeout(() => { btn.style.transform = "scale(1)"; }, 200);
        }
    } else {
        console.error("スポットが見つかりませんでした:", id);
    }
};

window.deleteSpot = (id) => {
    if(confirm("削除しますか？")) {
        localStorage.setItem('touristSpots', JSON.stringify(getSavedSpots().filter(s => s.id !== id)));
        renderSpots();
    }
};
// 読み上げ機能の実装
window.speakSpot = (id) => {
    const spot = getSavedSpots().find(x => x.id === id);
    if (!spot) return;

    // すでに読み上げ中の場合は停止
    window.speechSynthesis.cancel();

    const text = `${spot.name}。カテゴリーは、${spot.category.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')}です。おすすめポイント、${spot.comment}`;
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'ja-JP'; // 日本語設定
    uttr.rate = 1.5;     // 速度
    uttr.pitch = 0.3; // 声の高さ (0〜2)

    window.speechSynthesis.speak(uttr);
};
(function () {
    // ページ読み込み完了後に実行
    window.addEventListener('load', () => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            // 2秒間しっかり見せてからフェードアウト
            setTimeout(() => {
                splash.classList.add('fade-out');
            }, 1000);
        }
    });
})();
