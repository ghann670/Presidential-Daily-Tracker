// Map Controller
// Manages the Mapbox GL JS map and location markers

// Set Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZ3l1MSIsImEiOiJjbWpzaTVmbHA0cGpnM2hwc3d4djdlNHoxIn0.qdEvNcXk4APFiK4I0mhnow';

class MapController {
    constructor() {
        this.map = null;
        this.markers = {}; // Store markers by event ID
        this.routeLayer = null;
        this.routeSourceId = 'route-line';
    }

    initialize(containerId) {
        // Initialize Mapbox map centered on Seoul
        this.map = new mapboxgl.Map({
            container: containerId,
            style: 'mapbox://styles/mapbox/dark-v11', // Dark theme
            center: [126.9748, 37.5867], // [lng, lat] - Note: Mapbox uses lng, lat order
            zoom: 11,
            pitch: 0,
            bearing: 0
        });

        // Add navigation controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Wait for map to load before adding sources
        this.map.on('load', () => {
            // Add route line source
            this.map.addSource(this.routeSourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                }
            });

            // Add route line layer
            this.map.addLayer({
                id: 'route-line',
                type: 'line',
                source: this.routeSourceId,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': 'hsl(220, 90%, 55%)',
                    'line-width': 4,
                    'line-opacity': 0.8
                }
            });
        });

        return this.map;
    }

    clearMarkers() {
        Object.values(this.markers).forEach(marker => marker.remove());
        this.markers = {};
    }

    clearRoutes() {
        if (this.map.getSource(this.routeSourceId)) {
            this.map.getSource(this.routeSourceId).setData({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: []
                }
            });
        }
    }

    clearAll() {
        this.clearMarkers();
        this.clearRoutes();
    }

    addMarker(event, highlight = false) {
        // Create custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.innerHTML = `
            <div class="marker-pin" style="
                width: 40px;
                height: 40px;
                background: hsl(220, 80%, 60%);
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
            ">
                📍
            </div>
        `;

        // Create popup
        const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            closeOnClick: false
        }).setHTML(`
            <div style="font-family: 'Noto Sans KR', sans-serif; min-width: 200px;">
                <strong style="font-size: 1.1rem; color: hsl(220, 90%, 45%);">${event.time}</strong><br>
                <strong style="font-size: 1rem; margin-top: 0.5rem; display: block;">${event.title}</strong><br>
                <span style="color: #666; font-size: 0.9rem;">📍 ${event.location}</span>
            </div>
        `);

        // Create marker (Mapbox uses [lng, lat] order)
        const marker = new mapboxgl.Marker({
            element: markerEl,
            anchor: 'bottom'
        })
            .setLngLat([event.coordinates.lng, event.coordinates.lat])
            .setPopup(popup)
            .addTo(this.map);

        if (highlight) {
            markerEl.querySelector('.marker-pin')?.classList.add('marker-arrived');
        }

        this.markers[event.id] = marker;
        return marker;
    }

    async drawRoute(fromLatLng, toLatLng) {
        // fromLatLng and toLatLng are objects with {lat, lng}
        const coordinates = [
            [fromLatLng.lng, fromLatLng.lat],
            [toLatLng.lng, toLatLng.lat]
        ];

        // Update route source
        if (this.map.getSource(this.routeSourceId)) {
            this.map.getSource(this.routeSourceId).setData({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            });

            // Animate the line drawing using dasharray
            const dashArraySequence = [
                [0, 4, 3],
                [0.5, 4, 2.5],
                [1, 4, 2],
                [1.5, 4, 1.5],
                [2, 4, 1],
                [2.5, 4, 0.5],
                [3, 4, 0],
                [0, 0.5, 3, 3.5],
                [0, 1, 3, 3],
                [0, 1.5, 3, 2.5],
                [0, 2, 3, 2],
                [0, 2.5, 3, 1.5],
                [0, 3, 3, 1],
                [0, 3.5, 3, 0.5]
            ];

            let step = 0;

            return new Promise(resolve => {
                const animateDashArray = () => {
                    step = (step + 1) % dashArraySequence.length;
                    this.map.setPaintProperty('route-line', 'line-dasharray', dashArraySequence[step]);

                    if (step !== 0) {
                        requestAnimationFrame(animateDashArray);
                    } else {
                        setTimeout(() => {
                            this.map.setPaintProperty('route-line', 'line-dasharray', [1, 0]);
                            resolve();
                        }, 500);
                    }
                };

                setTimeout(() => {
                    animateDashArray(0);
                }, 100);
            });
        }

        return Promise.resolve();
    }

    flyTo(latLng, zoom = 13) {
        // latLng is object with {lat, lng}
        this.map.flyTo({
            center: [latLng.lng, latLng.lat],
            zoom: zoom,
            duration: 1500,
            essential: true
        });
    }

    fitBounds(latLngs, duration = 1.5) {
        // latLngs is array of objects with {lat, lng}
        if (latLngs.length === 0) return;

        // Convert to Mapbox LngLatBounds format
        const bounds = new mapboxgl.LngLatBounds();
        latLngs.forEach(latLng => {
            bounds.extend([latLng.lng, latLng.lat]);
        });

        this.map.fitBounds(bounds, {
            padding: 100,
            maxZoom: 14,
            duration: duration * 1000,
            essential: true
        });
    }

    getMap() {
        return this.map;
    }
}
