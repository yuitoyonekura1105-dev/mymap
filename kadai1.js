mapboxgl.accessToken = 'pk.eyJ1IjoieW9uZXgwNTAxIiwiYSI6ImNtaHUyaGp2ZjF2aGIybnB2MTltbmY5a3YifQ.X1acqoB4pWBlYcvOHHzlTQ';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [136.6624, 36.5621],
    zoom: 14
});

const categoryColors = { "🍽️ グルメ": "#ff4500", "🏞️ 絶景・風景": "#2e8b57", "🛍️ ショッピング": "#ba55d3", "🏛️ 歴史・文化": "#8b4513", "☕ カフェ・休憩": "#deb887", "✨ その他": "#3fb1ce" };

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
    const spots = getSavedSpots().sort((a, b) => b.id - a.id);
    const listElement = document.getElementById('spot-list-items');
    if(!listElement) return;
    listElement.innerHTML = ''; 

    spots.forEach(spot => {
        const googleMapUrl = `https://www.google.com/maps?q=${spot.lat},${spot.lng}`;
        
        const marker = new mapboxgl.Marker({ color: categoryColors[spot.category] || "#3fb1ce" })
            .setLngLat([spot.lng, spot.lat])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${spot.name}</strong><p>${spot.comment}</p>`))
            .addTo(map);
        markers[spot.id] = marker;

        const item = document.createElement('div');
        item.className = 'spot-list-item';
        item.innerHTML = `
            <div onclick="map.flyTo({ center: [${spot.lng}, ${spot.lat}], zoom: 16 })">
                <div class="card-header">
                    <span class="user-name">👤 ${spot.name}</span>
                    <span class="category-badge">${spot.category}</span>
                </div>
                <div class="post-content">${spot.comment}</div>
                ${spot.photo ? `<img src="${spot.photo}" class="post-img">` : ''}
            </div>
            <div class="card-actions">
                <button class="action-btn" onclick="likeSpot(${spot.id})">❤️ ${spot.likes || 0}</button>
                <a href="${googleMapUrl}" target="_blank" class="action-btn">🌐 GoogleMap</a>
                <button class="action-btn" onclick="deleteSpot(${spot.id})" style="color:red;">🗑️ 削除</button>
            </div>`;
        listElement.appendChild(item);
    });
}

map.on('click', (e) => {
    selectedLngLat = e.lngLat;
    document.getElementById('coords-display').innerText = `📍 場所を選択しました`;
    document.getElementById('submit-btn').disabled = false;
    toggleForm(true);
});

document.getElementById('spot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const photoFile = document.getElementById('spot-photo-file').files[0];
    const photoDataUrl = photoFile ? await new Promise(r => { const rd = new FileReader(); rd.onload = ev => r(ev.target.result); rd.readAsDataURL(photoFile); }) : "";

    const spots = getSavedSpots();
    spots.push({ id: Date.now(), name: document.getElementById('spot-name').value, category: document.getElementById('spot-category').value, comment: document.getElementById('spot-comment').value, photo: photoDataUrl, lat: selectedLngLat.lat, lng: selectedLngLat.lng, likes: 0 });
    
    localStorage.setItem('touristSpots', JSON.stringify(spots));
    e.target.reset();
    toggleForm(false);
    renderSpots();
});

window.likeSpot = (id) => {
    let spots = getSavedSpots();
    const s = spots.find(x => x.id === id);
    if(s) { s.likes++; localStorage.setItem('touristSpots', JSON.stringify(spots)); renderSpots(); }
};

window.deleteSpot = (id) => {
    if(confirm("削除しますか？")) {
        localStorage.setItem('touristSpots', JSON.stringify(getSavedSpots().filter(s => s.id !== id)));
        renderSpots();
    }
};

map.on('load', renderSpots);