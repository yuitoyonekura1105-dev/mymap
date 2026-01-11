mapboxgl.accessToken = 'pk.eyJ1IjoieW9uZXgwNTAxIiwiYSI6ImNtaHUyaGp2ZjF2aGIybnB2MTltbmY5a3YifQ.X1acqoB4pWBlYcvOHHzlTQ';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [136.6624, 36.5621],
    zoom: 14
});

const categoryColors = { "🍽️ グルメ": "#ff4500", "🏞️ 絶景・風景": "#2e8b57", "🛍️ ショッピング": "#ba55d3", "🏛️ 歴史・文化": "#8b4513", "☕ カフェ・休憩": "#deb887", "✨ その他": "#3fb1ce" };
let currentTab = 'latest';
let selectedLngLat = null;
const markers = {};

map.addControl(new MapboxLanguage({ defaultLanguage: 'ja' }));
map.addControl(new MapboxGeocoder({ 
    accessToken: mapboxgl.accessToken, 
    mapboxgl: mapboxgl, 
    placeholder: '場所を検索', 
    language: 'ja', 
    countries: 'jp'
}), 'top-left');
map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');

const postFormContainer = document.getElementById('post-form-container');
const listContainer = document.getElementById('list-container');
const showFormBtn = document.getElementById('show-form-btn');

// フォームの表示切り替え（スマホ時にリストを隠す）
const toggleForm = (show) => {
    postFormContainer.style.display = show ? 'block' : 'none';
    if (window.innerWidth <= 768) {
        listContainer.style.display = show ? 'none' : 'flex';
        showFormBtn.style.display = show ? 'none' : 'block';
    }
};

showFormBtn.addEventListener('click', () => toggleForm(true));
document.getElementById('hide-form-btn').addEventListener('click', () => toggleForm(false));

function getSavedSpots() { return JSON.parse(localStorage.getItem('touristSpots') || "[]"); }

window.switchTab = (tab) => {
    currentTab = tab;
    document.getElementById('tab-latest').classList.toggle('active', tab === 'latest');
    document.getElementById('tab-recommend').classList.toggle('active', tab === 'recommend');
    renderSpots();
};

function renderSpots() {
    Object.values(markers).forEach(m => m.remove());
    const listElement = document.getElementById('spot-list-items');
    listElement.innerHTML = '';
    let spots = getSavedSpots();

    const searchQuery = document.getElementById('spot-search')?.value.toLowerCase() || "";
    if (searchQuery) {
        spots = spots.filter(s => (s.name + s.comment).toLowerCase().includes(searchQuery));
    }

    if (currentTab === 'latest') spots.sort((a, b) => b.id - a.id);
    else spots.sort(() => Math.random() - 0.5);

    spots.slice(0, 10).forEach(spot => {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.cssText = `background:${categoryColors[spot.category]}; width:24px; height:24px; border-radius:50%; border:2px solid white; cursor:pointer;`;

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            showDetail(spot);
        });

        markers[spot.id] = new mapboxgl.Marker(el).setLngLat([spot.lng, spot.lat]).addTo(map);

        const item = document.createElement('div');
        item.className = 'spot-list-item';
        item.innerHTML = `
            <div onclick="map.flyTo({center:[${spot.lng},${spot.lat}], zoom:16}); showDetail(${JSON.stringify(spot).replace(/"/g, '&quot;')})">
                <span style="font-weight:bold;">${spot.name}</span><span class="category-badge">${spot.category}</span>
                <div style="font-size:13px; color:#536471; margin-top:4px;">${spot.comment.substring(0,30)}...</div>
            </div>`;
        listElement.appendChild(item);
    });
}

window.showDetail = (spot) => {
    const panel = document.getElementById('spot-detail-panel');
    const content = document.getElementById('detail-content');
    content.innerHTML = `
        <h3 style="margin:0 0 10px 0;">${spot.name}</h3>
        <p style="font-size:14px; color:#536471;">${spot.category}</p>
        <p style="font-size:15px; line-height:1.5;">${spot.comment}</p>
        ${spot.photo ? `<img src="${spot.photo}" style="width:100%; border-radius:12px; margin-bottom:10px;">` : ''}
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
            <button class="action-btn" onclick="likeSpot(${spot.id})">❤️ <span id="like-count-${spot.id}">${spot.likes||0}</span></button>
            <button class="action-btn" onclick="speakSpot(${spot.id})">🔊 読み上げ</button>
            <a href="https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}" target="_blank" class="action-btn">🌐 GoogleMap</a>
            <button class="action-btn" onclick="deleteSpot(${spot.id})" style="color:red; border-color:red;">🗑️ 削除</button>
        </div>
    `;
    panel.style.display = 'block';
    map.flyTo({ center: [spot.lng, spot.lat], zoom: 16 });
};

map.on('click', (e) => {
    document.getElementById('spot-detail-panel').style.display = 'none';
    selectedLngLat = e.lngLat;
    document.getElementById('coords-display').innerText = `📍 場所を選択しました`;
    document.getElementById('submit-btn').disabled = false;
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
        link: document.getElementById('spot-link').value,
        photo: photoDataUrl,
        lat: selectedLngLat.lat, lng: selectedLngLat.lng,
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
        const countSpan = document.getElementById(`like-count-${id}`);
        if(countSpan) countSpan.innerText = s.likes;
    }
};

window.deleteSpot = (id) => {
    if(confirm("削除しますか？")) {
        localStorage.setItem('touristSpots', JSON.stringify(getSavedSpots().filter(s => s.id !== id)));
        renderSpots();
        document.getElementById('spot-detail-panel').style.display = 'none';
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

document.getElementById('spot-search').addEventListener('input', renderSpots);
