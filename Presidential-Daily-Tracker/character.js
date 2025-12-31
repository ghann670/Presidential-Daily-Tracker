// Character Controller
// Manages the presidential character on the Mapbox map

class CharacterController {
    constructor() {
        this.element = null;
        this.currentPosition = null; // {lng, lat}
        this.isMoving = false;
    }

    create() {
        // Create character element with image
        this.element = document.createElement('div');
        this.element.className = 'president-character';
        this.element.innerHTML = `
            <img src="ㅇㅈㅁ사진.png" alt="President" style="
                width: 100%;
                height: 100%;
                object-fit: contain;
            ">
        `;
        this.element.style.cssText = `
            position: absolute;
            width: 60px;
            height: 60px;
            display: none;
            z-index: 1000;
            transition: all 2s cubic-bezier(0.4, 0.0, 0.2, 1);
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
            transform-origin: center;
            pointer-events: none;
        `;
        document.body.appendChild(this.element);
        return this.element;
    }

    show(latLng, map) {
        if (!this.element) this.create();

        // latLng is {lat, lng} format from app.js
        this.currentPosition = { lng: latLng.lng, lat: latLng.lat };
        this.updatePosition(map);
        this.element.style.display = 'block';

        // Entrance animation
        this.element.style.transform = 'scale(0)';
        setTimeout(() => {
            this.element.style.transform = 'scale(1)';
        }, 50);
    }

    hide() {
        if (this.element) {
            this.element.style.transform = 'scale(0)';
            setTimeout(() => {
                this.element.style.display = 'none';
            }, 300);
        }
    }

    updatePosition(map) {
        if (!this.element || !this.currentPosition) return;

        // Mapbox project method: converts [lng, lat] to screen coordinates
        const point = map.project([this.currentPosition.lng, this.currentPosition.lat]);
        // Position character centered at the exact coordinate point
        this.element.style.left = `${point.x - 30}px`; // Half of width (60px)
        this.element.style.top = `${point.y - 30}px`;  // Half of height (60px) - centered on point
    }

    async moveTo(latLng, map, duration = 2000) {
        if (!this.element || this.isMoving) return;

        this.isMoving = true;

        // latLng is {lat, lng} format from app.js
        const endPos = { lng: latLng.lng, lat: latLng.lat };

        // Add rotation during movement
        this.element.style.transform = 'scale(1) rotate(10deg)';

        // Update position
        this.currentPosition = endPos;
        this.updatePosition(map);

        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, duration));

        // Reset rotation
        this.element.style.transform = 'scale(1) rotate(0deg)';
        this.isMoving = false;
    }
}
