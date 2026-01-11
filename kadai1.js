mapboxgl.accessToken = 'pk.eyJ1IjoieW9uZXgwNTAxIiwiYSI6ImNtaHUyaGp2ZjF2aGIybnB2MTltbmY5a3YifQ.X1acqoB4pWBlYcvOHHzlTQ';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [136.6624, 36.5621],
    zoom: 14
});

const categoryColors = { "🍽️ グルメ": "#ff4500", "🏞️ 絶景・風景": "#2e8b57", "🛍️ ショッピング": "#ba55d3", "🏛️ 歴史・文化": "#8b4513", "☕ カフェ・休憩": "#deb887", "✨ その他": "#3fb1ce" };

map.addControl(new MapboxLanguage({ defaultLanguage: 'ja' }));
map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken, mapboxgl: mapboxgl, placeholder: '場所を検索', language: 'ja', countries: 'jp', types: 'poi,place,address,locality' }), 'top-left');

let selectedLngLat = null;
const markers = {};

// パネル制御
function openPanel(panelId) {
    const list = document.getElementById('list-container');
    const form = document.getElementById('post-form-container');
    const detail = document.getElementById('spot-detail-panel');

    if (window.innerWidth <= 768) {
        list.classList.remove('active');
        form.classList.remove('active');
        detail.style.display = 'none';
    }

    const target = document.getElementById(panelId);
    if (target) {
        target.style.display = 'flex';
        setTimeout(() => target.classList.add('active'), 10);
    }
}

window.closeAllPanels = () => {
    document.getElementById('list-container').classList.remove('active');
    document.getElementById('post-form-container').classList.remove('active');
};

document.getElementById('tab-list-btn').addEventListener('click', () => openPanel('list-container'));
document.getElementById('tab-post-btn').addEventListener('click', () => openPanel('post-form-container'));

map.on('click', (e) => {
    selectedLngLat = e.lngLat;
    document.getElementById('coords-display').innerText = "📍 場所を選択しました";
    document.getElementById('submit-btn').disabled = false;
    openPanel('post-form-container');
});

function getSavedSpots() { return JSON.parse(localStorage.getItem('touristSpots') || "[]"); }

function renderSpots() {
    Object.values(markers).forEach(m => m.remove());
    const spots = getSavedSpots().sort((a, b) => b.id - a.id);
    const listElement = document.getElementById('spot-list-items');
    listElement.innerHTML = ''; 

    spots.forEach(spot => {
        const marker = new mapboxgl.Marker({ color: categoryColors[spot.category] || "#3fb1ce" })
            .setLngLat([spot.lng, spot.lat])
            .addTo(map);
        markers[spot.id] = marker;

        const item = document.createElement('div');
        item.className = 'spot-list-item';
        item.innerHTML = `<b>${spot.name}</b><p>${spot.comment}</p>`;
        item.onclick = () => {
            map.flyTo({center: [spot.lng, spot.lat], zoom: 16});
            if(window.innerWidth <= 768) closeAllPanels();
        };
        listElement.appendChild(item);
    });
}

document.getElementById('spot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const photoFile = document.getElementById('spot-photo-file').files[0];
    const photoDataUrl = photoFile ? await new Promise(r => { const rd = new FileReader(); rd.onload = ev => r(ev.target.result); rd.readAsDataURL(photoFile); }) : "";

    const spots = getSavedSpots();
    spots.push({ id: Date.now(), name: document.getElementById('spot-name').value, category: document.getElementById('spot-category').value, comment: document.getElementById('spot-comment').value, photo: photoDataUrl, lat: selectedLngLat.lat, lng: selectedLngLat.lng });
    
    localStorage.setItem('touristSpots', JSON.stringify(spots));
    e.target.reset();
    closeAllPanels();
    renderSpots();
});

map.on('load', () => {
    document.getElementById('splash-screen').style.display = 'none';
    renderSpots();
});
