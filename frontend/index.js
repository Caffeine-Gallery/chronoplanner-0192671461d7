import { backend } from 'declarations/backend';

const calendar = document.getElementById('calendar');
const dayDetail = document.getElementById('day-detail');
const loadingSpinner = document.getElementById('loading-spinner');

let currentDate = new Date();
let selectedDate = new Date();

function showLoading() {
    loadingSpinner.style.display = 'block';
    document.querySelectorAll('button').forEach(button => button.disabled = true);
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
    document.querySelectorAll('button').forEach(button => button.disabled = false);
}

async function renderCalendar() {
    showLoading();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    let calendarHTML = `
        <h2>${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <button id="go-to-today">Go to Today</button>
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
        const isSelected = date.toDateString() === selectedDate.toDateString();

        calendarHTML += `
            <div class="day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isSelected ? 'selected' : ''}" data-date="${date.toISOString()}">
                <span>${day}</span>
                <span class="note-count" id="note-count-${day}" style="display: none;"></span>
            </div>
        `;
    }

    calendarHTML += '</div>';
    calendar.innerHTML = calendarHTML;

    document.querySelectorAll('.day').forEach(dayElement => {
        dayElement.addEventListener('click', () => {
            selectedDate = new Date(dayElement.dataset.date);
            renderCalendar();
            renderDayDetail();
        });
    });

    document.getElementById('go-to-today').addEventListener('click', () => {
        selectedDate = new Date();
        currentDate = new Date();
        renderCalendar();
        renderDayDetail();
    });

    await fetchMonthData();
    hideLoading();
}

async function fetchMonthData() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    try {
        const monthData = await backend.getMonthData(year, month);
        monthData.forEach(([dateString, dayData]) => {
            const [, , day] = dateString.split('-');
            const incompleteNotes = dayData.notes.filter(note => !note.isCompleted).length;
            const noteCountElement = document.getElementById(`note-count-${day}`);
            if (noteCountElement) {
                if (incompleteNotes > 0) {
                    noteCountElement.textContent = incompleteNotes;
                    noteCountElement.style.display = 'flex';
                } else {
                    noteCountElement.style.display = 'none';
                }
            }
        });
    } catch (error) {
        console.error(`Error fetching data for ${year}-${month}:`, error);
    }
}

async function renderDayDetail() {
    showLoading();

    const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
    try {
        const data = await backend.getDayData(dateString);
        console.log('Day data:', data); // Debugging log
        const dayData = data && data.length > 0 ? data[0] : { notes: [], onThisDay: null };

        let detailHTML = `
            <h2>${selectedDate.toDateString()}</h2>
            <div class="on-this-day">
                <h3>On This Day</h3>
        `;

        if (dayData.onThisDay && dayData.onThisDay.length > 0) {
            console.log('On This Day data:', dayData.onThisDay[0]); // Debugging log
            const onThisDay = dayData.onThisDay[0];
            detailHTML += `
                <p>${onThisDay.title || 'No title'} (${onThisDay.year || 'No year'})</p>
                <a href="${onThisDay.wikiLink || '#'}" target="_blank" rel="noopener noreferrer">Read more</a>
            `;
        } else {
            detailHTML += '<button id="fetch-on-this-day">Fetch via HTTPS Outcall</button>';
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
                    ${!note.isCompleted ? `<button class="complete-note" data-id="${note.id}">Mark As Done</button>` : ''}
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

        document.getElementById('add-note').addEventListener('click', addNote);

        document.querySelectorAll('.complete-note').forEach(button => {
            button.addEventListener('click', () => completeNote(parseInt(button.dataset.id)));
        });

        if (!dayData.onThisDay || dayData.onThisDay.length === 0) {
            document.getElementById('fetch-on-this-day').addEventListener('click', fetchOnThisDay);
        }
    } catch (error) {
        console.error('Error rendering day detail:', error);
        dayDetail.innerHTML = '<p>Error loading day details. Please try again.</p>';
    }
    hideLoading();
}

async function addNote() {
    const newNoteInput = document.getElementById('new-note');
    const content = newNoteInput.value.trim();
    if (content) {
        showLoading();
        const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
        try {
            await backend.addNote(dateString, content);
            newNoteInput.value = '';
            await renderDayDetail();
            await renderCalendar();
        } catch (error) {
            console.error('Error adding note:', error);
        }
        hideLoading();
    }
}

async function completeNote(noteId) {
    showLoading();
    const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
    try {
        await backend.completeNote(dateString, noteId);
        await renderDayDetail();
        await renderCalendar();
    } catch (error) {
        console.error('Error completing note:', error);
    }
    hideLoading();
}

async function fetchOnThisDay() {
    showLoading();

    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = selectedDate.getDate().toString().padStart(2, '0');
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${month}/${day}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('On This Day API Response:', data);
        if (data.selected && data.selected.length > 0) {
            const item = data.selected[0];
            const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
            await backend.storeOnThisDay(dateString, item.text, item.year, item.pages[0].content_urls.desktop.page);
            await renderDayDetail();
        }
    } catch (error) {
        console.error('Error fetching On This Day data:', error);
    }
    hideLoading();
}

renderCalendar();
renderDayDetail();
