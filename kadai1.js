mapboxgl.accessToken = 'pk.eyJ1IjoieW9uZXgwNTAxIiwiYSI6ImNtaHUyaGp2ZjF2aGIybnB2MTltbmY5a3YifQ.X1acqoB4pWBlYcvOHHzlTQ';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [136.6624, 36.5621],
    zoom: 14
});

const categoryColors = { 
    "🍽️ グルメ": "#ff4500", "🏞️ 絶景・風景": "#2e8b57", 
    "🛍️ ショッピング": "#ba55d3", "🏛️ 歴史・文化": "#8b4513", 
    "☕ カフェ・休憩": "#deb887", "✨ その他": "#3fb1ce" 
};

let currentTab = 'latest';
let selectedLngLat = null;
const markers = {};

// コントロール
map.addControl(new MapboxLanguage({ defaultLanguage: 'ja' }));
map.addControl(new MapboxGeocoder({ 
    accessToken: mapboxgl.accessToken, mapboxgl: mapboxgl, 
    placeholder: '場所を検索', language: 'ja', countries: 'jp', types: 'poi,place,address' 
}), 'top-left');
map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');

const postFormContainer = document.getElementById('post-form-container');
const listContainer = document.getElementById('list-container');
const showFormBtn = document.getElementById('show-form-btn');
const hideFormBtn = document.getElementById('hide-form-btn');

const getSavedSpots = () => JSON.parse(localStorage.getItem('touristSpots') || "[]");

// フォームの表示切り替え（スマホ時にリストを隠す）
const toggleForm = (show) => {
    if (show) {
        postFormContainer.style.display = 'block';
        if (window.innerWidth <= 768) listContainer.style.display = 'none';
    } else {
        postFormContainer.style.display = 'none';
        listContainer.style.display = 'flex';
    }
};

window.switchTab = (tab) => {
    currentTab = tab;
    document.getElementById('tab-latest').classList.toggle('active', tab === 'latest');
    document.getElementById('tab-recommend').classList.toggle('active', tab === 'recommend');
    renderSpots();
};

function renderSpots() {
    Object.values(markers).forEach(m => m.remove());
    const listElement = document.getElementById('spot-list-items');
    if (!listElement) return;
    listElement.innerHTML = '';

    let spots = getSavedSpots();
    const query = document.getElementById('spot-search')?.value.toLowerCase();
    if (query) {
        spots = spots.filter(s => (s.name + s.comment + s.category).toLowerCase().includes(query));
    }

    if (currentTab === 'latest') { spots.sort((a, b) => b.id - a.id); } 
    else { spots.sort(() => Math.random() - 0.5); }

    spots.slice(0, 10).forEach(spot => {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.cssText = `background:${categoryColors[spot.category]}; width:22px; height:22px; border-radius:50%; border:2px solid white; cursor:pointer;`;
        
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            showDetail(spot);
        });

        markers[spot.id] = new mapboxgl.Marker(el).setLngLat([spot.lng, spot.lat]).addTo(map);

        const item = document.createElement('div');
        item.className = 'spot-list-item';
        item.innerHTML = `
            <div onclick="focusSpot(${spot.lng}, ${spot.lat})" style="cursor:pointer;">
                <div class="card-header"><span class="user-name">👤 ${spot.name}</span> <span class="category-badge">${spot.category}</span></div>
                <div class="post-content">${spot.comment}</div>
            </div>
            <div class="card-actions">
                <button class="action-btn" onclick="likeSpot(${spot.id})">❤️ <span id="l-likes-${spot.id}">${spot.likes || 0}</span></button>
                <button class="action-btn" onclick="speakSpot(${spot.id})">🔊</button>
                <a href="https://www.google.com/maps?q=${spot.lat},${spot.lng}" target="_blank" class="action-btn">🌐 地図</a>
                <button class="action-btn" onclick="deleteSpot(${spot.id})" style="color:#e0245e;">🗑️</button>
            </div>`;
        listElement.appendChild(item);
    });
}

window.showDetail = (spot) => {
    const panel = document.getElementById('spot-detail-panel');
    const content = document.getElementById('detail-content');
    content.innerHTML = `
        <div style="font-weight:bold; font-size:18px;">${spot.name}</div>
        <div style="color:#536471; font-size:12px; margin-bottom:8px;">${spot.category}</div>
        <div style="font-size:14px; margin-bottom:12px;">${spot.comment}</div>
        ${spot.photo ? `<img src="${spot.photo}" style="width:100%; border-radius:12px; margin-bottom:10px;">` : ''}
        <div class="card-actions">
            <button class="action-btn" onclick="likeSpot(${spot.id})">❤️ <span id="d-likes-${spot.id}">${spot.likes || 0}</span></button>
            ${spot.link ? `<a href="${spot.link}" target="_blank" class="action-btn">🔗 ウェブ</a>` : ''}
        </div>`;
    panel.style.display = 'block';
    map.flyTo({ center: [spot.lng, spot.lat], zoom: 16 });
};

window.focusSpot = (lng, lat) => {
    if (window.innerWidth <= 768) { /* スマホ時は詳細を出しやすくする工夫 */ }
    map.flyTo({ center: [lng, lat], zoom: 16 });
};

map.on('click', (e) => {
    document.getElementById('spot-detail-panel').style.display = 'none';
    selectedLngLat = e.lngLat;
    document.getElementById('coords-display').innerText = `📍 場所を選択しました`;
    document.getElementById('submit-btn').disabled = false;
    toggleForm(true);
});

showFormBtn.addEventListener('click', () => toggleForm(true));
hideFormBtn.addEventListener('click', () => toggleForm(false));

document.getElementById('spot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const photoFile = document.getElementById('spot-photo-file').files[0];
    const photoDataUrl = photoFile ? await new Promise(r => { 
        const rd = new FileReader(); rd.onload = ev => r(ev.target.result); rd.readAsDataURL(photoFile); 
    }) : "";

    const spots = getSavedSpots();
    spots.push({
        id: Date.now(),
        name: document.getElementById('spot-name').value,
        category: document.getElementById('spot-category').value,
        comment: document.getElementById('spot-comment').value,
        link: document.getElementById('spot-link').value,
        photo: photoDataUrl,
        lat: selectedLngLat.lat,
        lng: selectedLngLat.lng,
        likes: 0
    });

    localStorage.setItem('touristSpots', JSON.stringify(spots));
    e.target.reset();
    toggleForm(false);
    renderSpots();
});

window.likeSpot = (id) => {
    let spots = getSavedSpots();
    const s = spots.find(x => x.id === id);
    if (s) {
        s.likes = (s.likes || 0) + 1;
        localStorage.setItem('touristSpots', JSON.stringify(spots));
        ['l-likes-', 'd-likes-'].forEach(p => {
            const el = document.getElementById(p + id);
            if (el) el.innerText = s.likes;
        });
    }
};

window.deleteSpot = (id) => {
    if (confirm("削除しますか？")) {
        localStorage.setItem('touristSpots', JSON.stringify(getSavedSpots().filter(s => s.id !== id)));
        renderSpots();
    }
};

window.speakSpot = (id) => {
    const spot = getSavedSpots().find(x => x.id === id);
    if (!spot) return;
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(`${spot.name}。${spot.comment}`);
    uttr.lang = 'ja-JP';
    window.speechSynthesis.speak(uttr);
};

window.addEventListener('load', () => {
    setTimeout(() => document.getElementById('splash-screen').classList.add('fade-out'), 1000);
    renderSpots();
});
