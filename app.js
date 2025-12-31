// Main Application Logic
// Orchestrates all components

class PresidentialDailyTracker {
    constructor() {
        this.mapController = null;
        this.calendarController = null;
        this.timelineController = null;
        this.characterController = null;
        this.currentDate = null;
        this.currentEventIndex = -1;
    }

    async initialize() {
        // Initialize map
        this.mapController = new MapController();
        this.mapController.initialize('map');

        // Initialize character
        this.characterController = new CharacterController();

        // Initialize calendar
        this.calendarController = new CalendarController((date) => {
            this.onDateSelected(date);
        });
        this.calendarController.render('calendar-container');

        // Initialize timeline
        this.timelineController = new TimelineController((index, event) => {
            this.onEventSelected(index, event);
        });

        // Update character position when map moves (Mapbox events)
        const map = this.mapController.getMap();
        map.on('move', () => {
            if (this.characterController) {
                this.characterController.updatePosition(map);
            }
        });

        map.on('zoom', () => {
            if (this.characterController) {
                this.characterController.updatePosition(map);
            }
        });

        map.on('pitch', () => {
            if (this.characterController) {
                this.characterController.updatePosition(map);
            }
        });

        map.on('rotate', () => {
            if (this.characterController) {
                this.characterController.updatePosition(map);
            }
        });

        // Set initial date to latest date with events
        const latestDate = getLatestDate();
        this.calendarController.selectDate(latestDate);

        // Setup navigation buttons
        this.setupNavigation();
    }

    setupNavigation() {
        const prevBtn = document.getElementById('prev-date');
        const nextBtn = document.getElementById('next-date');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateDate(-1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateDate(1));
        }
    }

    navigateDate(direction) {
        const dates = getDatesWithEvents();
        const currentIndex = dates.indexOf(this.currentDate);

        if (currentIndex === -1) return;

        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < dates.length) {
            this.calendarController.selectDate(dates[newIndex]);
        }
    }

    onDateSelected(date) {
        this.currentDate = date;
        this.currentEventIndex = -1;

        // Update date display
        const dateObj = new Date(date);
        const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const dayOfWeek = dayNames[dateObj.getDay()];
        const formatted = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
        document.getElementById('current-date').textContent = `${formatted} (${dayOfWeek})`;

        // Get events for this date
        const events = getEventsForDate(date);

        // Update timeline
        this.timelineController.reset();
        this.timelineController.render('timeline-container', events);

        // Clear map and character
        this.mapController.clearAll();
        this.characterController.hide();

        // ===========================
        // State 0 - Idle
        // ===========================
        if (events.length > 0) {
            // Add all markers
            events.forEach(event => {
                this.mapController.addMarker(event, false);
            });

            // Fit map to show all markers
            const latLngs = events.map(e => ({ lat: e.coordinates.lat, lng: e.coordinates.lng }));
            this.mapController.fitBounds(latLngs, 1);

            // Position character at first event (Idle) - very close to marker
            const firstEvent = events[0];
            const firstLatLng = { lat: firstEvent.coordinates.lat, lng: firstEvent.coordinates.lng };
            const offsetLatLng = { lat: firstLatLng.lat + 0.0002, lng: firstLatLng.lng + 0.0002 };
            this.characterController.show(offsetLatLng, this.mapController.getMap());

            // Highlight first marker
            this.mapController.markers[firstEvent.id]?.getElement()?.querySelector('.marker-pin')?.classList.add('marker-arrived');
        }
    }

    async onEventSelected(index, event) {
        const events = getEventsForDate(this.currentDate);
        if (!events || index >= events.length) return;

        const targetLatLng = { lat: event.coordinates.lat, lng: event.coordinates.lng };
        const destLabel = document.getElementById('destination-label');
        const labelText = document.getElementById('label-text');

        // Reset previous states
        destLabel.classList.add('hidden');
        this.characterController.hide();
        Object.values(this.mapController.markers).forEach(m => {
            const markerPin = m.getElement()?.querySelector('.marker-pin');
            if (markerPin) {
                markerPin.classList.remove('marker-target', 'marker-arrived');
            }
        });

        // ===========================
        // State 1 - Select Event
        // ===========================
        // Zoom in to destination
        this.mapController.flyTo(targetLatLng, 15);
        await new Promise(r => setTimeout(r, 1500));

        // First event special case
        if (this.currentEventIndex === -1 || index === 0) {
            this.mapController.markers[event.id]?.getElement()?.querySelector('.marker-pin')?.classList.add('marker-arrived');
            const offsetLatLng = { lat: targetLatLng.lat + 0.0002, lng: targetLatLng.lng + 0.0002 };
            this.characterController.show(offsetLatLng, this.mapController.getMap());
            this.currentEventIndex = index;
            return;
        }

        // ===========================
        // State 2 - Camera Framing
        // ===========================
        const previousEvent = events[this.currentEventIndex];
        const prevLatLng = { lat: previousEvent.coordinates.lat, lng: previousEvent.coordinates.lng };

        // Zoom out to frame both locations
        this.mapController.fitBounds([prevLatLng, targetLatLng], 1.5);
        await new Promise(r => setTimeout(r, 1600));

        // Pan back to destination and show label
        this.mapController.flyTo(targetLatLng, 15);
        await new Promise(r => setTimeout(r, 800));

        labelText.textContent = event.location;
        destLabel.classList.remove('hidden');
        this.mapController.markers[event.id]?.getElement()?.querySelector('.marker-pin')?.classList.add('marker-target');
        await new Promise(r => setTimeout(r, 800));

        // ===========================
        // State 3 - Path Reveal
        // ===========================
        const pathPromise = this.mapController.drawRoute(prevLatLng, targetLatLng);

        // Character appears at roughly 70% of path reveal
        await new Promise(r => setTimeout(r, 1000));
        this.characterController.show(prevLatLng, this.mapController.getMap());

        await pathPromise;

        // ===========================
        // State 4 - Character Move
        // ===========================
        await this.characterController.moveTo(targetLatLng, this.mapController.getMap(), 2000);

        // ===========================
        // State 5 - Arrival
        // ===========================
        destLabel.classList.add('hidden');
        const markerPin = this.mapController.markers[event.id]?.getElement()?.querySelector('.marker-pin');
        if (markerPin) {
            markerPin.classList.remove('marker-target');
            markerPin.classList.add('marker-arrived');
        }

        // Show popup summary
        this.mapController.markers[event.id]?.togglePopup();

        this.currentEventIndex = index;
    }
}

// Initialize app when DOM is ready
let app;

function initApp() {
    app = new PresidentialDailyTracker();
    app.initialize();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
