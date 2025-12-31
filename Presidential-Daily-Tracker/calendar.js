// Calendar Controller
// Manages the mini calendar UI and date selection

class CalendarController {
    constructor(onDateSelect) {
        this.onDateSelect = onDateSelect;
        this.currentDate = null;
        this.year = 2025;
        this.month = 12; // December
    }

    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const datesWithEvents = getDatesWithEvents();

        // Get days in month
        const daysInMonth = new Date(this.year, this.month, 0).getDate();
        const firstDay = new Date(this.year, this.month - 1, 1).getDay();

        let html = '<div class="calendar-header">';
        html += `<h3>${this.year}년 ${this.month}월</h3>`;
        html += '</div>';

        html += '<div class="calendar-weekdays">';
        ['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
            html += `<div class="weekday">${day}</div>`;
        });
        html += '</div>';

        html += '<div class="calendar-days">';

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.year}-${String(this.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEvents = datesWithEvents.includes(dateStr);
            const isSelected = dateStr === this.currentDate;

            let classes = 'calendar-day';
            if (hasEvents) classes += ' has-events';
            if (isSelected) classes += ' selected';

            html += `<div class="${classes}" data-date="${dateStr}">`;
            html += `<span class="day-number">${day}</span>`;
            if (hasEvents) html += '<span class="event-dot"></span>';
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;

        // Add click listeners
        container.querySelectorAll('.calendar-day.has-events').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const date = dayEl.dataset.date;
                this.selectDate(date);
            });
        });
    }

    selectDate(date) {
        this.currentDate = date;
        this.render('calendar-container');
        if (this.onDateSelect) {
            this.onDateSelect(date);
        }
    }

    getSelectedDate() {
        return this.currentDate;
    }
}
