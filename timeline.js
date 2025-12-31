// Timeline Controller
// Manages the timeline UI and event selection

class TimelineController {
    constructor(onEventSelect) {
        this.onEventSelect = onEventSelect;
        this.currentEvents = [];
        this.selectedIndex = -1;
    }

    render(containerId, events) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.currentEvents = events;

        if (events.length === 0) {
            container.innerHTML = '<div class="no-events">이 날짜에는 일정이 없습니다</div>';
            return;
        }

        let html = '';
        events.forEach((event, index) => {
            const isSelected = index === this.selectedIndex;
            html += `
                <button class="timeline-event ${isSelected ? 'selected' : ''}" data-index="${index}">
                    <div class="event-time">${event.time}</div>
                    <div class="event-title">${event.title}</div>
                    <div class="event-location">📍 ${event.location}</div>
                </button>
            `;
        });

        container.innerHTML = html;

        // Add click listeners
        container.querySelectorAll('.timeline-event').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.selectEvent(index);
            });
        });
    }

    selectEvent(index) {
        if (index < 0 || index >= this.currentEvents.length) return;

        this.selectedIndex = index;
        this.render('timeline-container', this.currentEvents);

        // Scroll selected button into view
        const container = document.getElementById('timeline-container');
        const selectedBtn = container.querySelector('.timeline-event.selected');
        if (selectedBtn) {
            selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        if (this.onEventSelect) {
            this.onEventSelect(index, this.currentEvents[index]);
        }
    }

    reset() {
        this.selectedIndex = -1;
    }

    getSelectedIndex() {
        return this.selectedIndex;
    }
}
