// Map Controller
// Manages the Mapbox GL JS map and location markers

// Set Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZ3l1MSIsImEiOiJjbWpzaTVmbHA0cGpnM2hwc3d4djdlNHoxIn0.qdEvNcXk4APFiK4I0mhnow';

// Initialize Mapbox Geocoding client
const mapboxClient = mapboxSdk({ accessToken: mapboxgl.accessToken });

class MapController {
    constructor() {
        this.map = null;
        this.markers = {}; // Store markers by event ID
        this.routeLayer = null;
        this.routeSourceId = 'route-line';
    }

    initialize(containerId) {
        // Initialize Mapbox map centered on Seoul with isometric 3D view
        this.map = new mapboxgl.Map({
            container: containerId,
            style: 'mapbox://styles/gyu1/cmjute7gq002101skb5t272bg', // Custom 3D style
            center: [126.9748, 37.5867], // [lng, lat] - Note: Mapbox uses lng, lat order
            zoom: 11,
            pitch: 60, // Isometric view angle (0-85, 60 is good for isometric)
            bearing: 0, // Rotation angle (0-360)
            antialias: true // Smooth 3D rendering
        });

        // Configure map lighting and labels
        this.map.on('style.load', () => {
            this.map.setConfigProperty('basemap', 'lightPreset', 'day');
            this.map.setConfigProperty('basemap', 'showPlaceLabels', true);
            this.map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
            this.map.setConfigProperty('basemap', 'showRoadLabels', true);
            this.map.setConfigProperty('basemap', 'showTransitLabels', true);
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

        // Create Mapbox default marker (simple pin)
        const marker = new mapboxgl.Marker({
            color: highlight ? '#4CAF50' : '#3B82F6'
        })
            .setLngLat([event.coordinates.lng, event.coordinates.lat])
            .setPopup(popup)
            .addTo(this.map);

        // Store marker state for color changes
        marker._state = highlight ? 'arrived' : 'default';
        marker._updateColor = function(state) {
            this._state = state;
            const colors = {
                'default': '#3B82F6',
                'target': '#FF9800',
                'arrived': '#4CAF50'
            };
            this.getElement().style.setProperty('--marker-color', colors[state] || colors.default);
            this.getElement().querySelectorAll('svg path').forEach(path => {
                path.setAttribute('fill', colors[state] || colors.default);
            });
        };

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

    // Set pitch (tilt angle) - 0 to 85 degrees
    setPitch(pitch) {
        this.map.setPitch(pitch);
    }

    // Set bearing (rotation angle) - 0 to 360 degrees
    setBearing(bearing) {
        this.map.setBearing(bearing);
    }

    // Animate to specific pitch and bearing
    easeToPitchBearing(pitch, bearing, duration = 1000) {
        this.map.easeTo({
            pitch: pitch,
            bearing: bearing,
            duration: duration
        });
    }

    // Reset to default isometric view
    resetView() {
        this.map.easeTo({
            pitch: 60,
            bearing: 0,
            duration: 1000
        });
    }

    // Geocode an address to coordinates
    async geocodeAddress(address) {
        try {
            const response = await mapboxClient.geocoding
                .forwardGeocode({
                    query: address,
                    countries: ['KR'], // Limit to South Korea
                    autocomplete: false,
                    limit: 1
                })
                .send();

            if (
                !response ||
                !response.body ||
                !response.body.features ||
                !response.body.features.length
            ) {
                console.error('Invalid geocoding response for:', address);
                return null;
            }

            const feature = response.body.features[0];
            const [lng, lat] = feature.center;

            return {
                lat: lat,
                lng: lng,
                fullAddress: feature.place_name
            };
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }
}
