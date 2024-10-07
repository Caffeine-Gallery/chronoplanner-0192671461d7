import { backend } from 'declarations/backend';

const calendar = document.getElementById('calendar');
const dayDetail = document.getElementById('day-detail');

let currentDate = new Date();
let selectedDate = null;

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    let calendarHTML = `
        <h2>${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <div class="calendar-grid">
            <div class="weekday">Sun</div>
            <div class="weekday">Mon</div>
            <div class="weekday">Tue</div>
            <div class="weekday">Wed</div>
            <div class="weekday">Thu</div>
            <div class="weekday">Fri</div>
            <div class="weekday">Sat</div>
    `;

    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarHTML += '<div class="empty-day"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === new Date().toDateString();
        const isPast = date < new Date();

        calendarHTML += `
            <div class="day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" data-date="${date.toISOString()}">
                <span>${day}</span>
                <span class="note-count" id="note-count-${day}"></span>
            </div>
        `;
    }

    calendarHTML += '</div>';
    calendar.innerHTML = calendarHTML;

    document.querySelectorAll('.day').forEach(dayElement => {
        dayElement.addEventListener('click', () => {
            if (!dayElement.classList.contains('past')) {
                selectedDate = new Date(dayElement.dataset.date);
                renderDayDetail();
            }
        });
    });

    fetchMonthData();
}

async function fetchMonthData() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${month + 1}-${day}`;
        const dayData = await backend.getDayData(date);
        if (dayData && dayData[0]) {
            const incompleteNotes = dayData[0].notes.filter(note => !note.isCompleted).length;
            const noteCountElement = document.getElementById(`note-count-${day}`);
            if (noteCountElement && incompleteNotes > 0) {
                noteCountElement.textContent = incompleteNotes;
            }
        }
    }
}

async function renderDayDetail() {
    if (!selectedDate) return;

    const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
    const data = await backend.getDayData(dateString);
    const dayData = data[0] || { notes: [], onThisDay: null };

    let detailHTML = `
        <h2>${selectedDate.toDateString()}</h2>
        <button id="close-detail">Close</button>
        <div class="on-this-day">
            <h3>On This Day</h3>
    `;

    if (dayData.onThisDay) {
        detailHTML += `
            <p>${dayData.onThisDay.title} (${dayData.onThisDay.year})</p>
            <a href="${dayData.onThisDay.wikiLink}" target="_blank" rel="noopener noreferrer">Read more</a>
        `;
    } else {
        detailHTML += '<button id="fetch-on-this-day">Request Data</button>';
    }

    detailHTML += `
        </div>
        <div class="notes">
            <h3>Notes</h3>
            <ul>
    `;

    dayData.notes.forEach(note => {
        detailHTML += `
            <li class="${note.isCompleted ? 'completed' : ''}">
                ${note.content}
                ${!note.isCompleted ? `<button class="complete-note" data-id="${note.id}">Complete</button>` : ''}
            </li>
        `;
    });

    detailHTML += `
            </ul>
            <div class="add-note">
                <input type="text" id="new-note" placeholder="New note">
                <button id="add-note">Add Note</button>
            </div>
        </div>
    `;

    dayDetail.innerHTML = detailHTML;

    document.getElementById('close-detail').addEventListener('click', () => {
        dayDetail.innerHTML = '';
        selectedDate = null;
    });

    document.getElementById('add-note').addEventListener('click', addNote);

    document.querySelectorAll('.complete-note').forEach(button => {
        button.addEventListener('click', () => completeNote(parseInt(button.dataset.id)));
    });

    if (!dayData.onThisDay) {
        document.getElementById('fetch-on-this-day').addEventListener('click', fetchOnThisDay);
    }
}

async function addNote() {
    const newNoteInput = document.getElementById('new-note');
    const content = newNoteInput.value.trim();
    if (content && selectedDate) {
        const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
        await backend.addNote(dateString, content);
        newNoteInput.value = '';
        renderDayDetail();
        renderCalendar();
    }
}

async function completeNote(noteId) {
    if (selectedDate) {
        const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
        await backend.completeNote(dateString, noteId);
        renderDayDetail();
        renderCalendar();
    }
}

async function fetchOnThisDay() {
    if (!selectedDate) return;

    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = selectedDate.getDate().toString().padStart(2, '0');
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${month}/${day}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.selected && data.selected.length > 0) {
            const item = data.selected[0];
            const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
            await backend.storeOnThisDay(dateString, item.text, item.year, item.pages[0].content_urls.desktop.page);
            renderDayDetail();
        }
    } catch (error) {
        console.error('Error fetching On This Day data:', error);
    }
}

renderCalendar();
