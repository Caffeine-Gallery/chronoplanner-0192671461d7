import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { backend } from 'declarations/backend';

const Calendar = ({ onDayClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState({});

  useEffect(() => {
    fetchMonthData();
  }, [currentDate]);

  const fetchMonthData = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const data = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${month + 1}-${day}`;
      const dayData = await backend.getDayData(date);
      if (dayData) {
        data[day] = dayData[0];
      }
    }
    setMonthData(data);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="empty-day"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      const isPast = date < new Date();
      const dayData = monthData[day];
      const incompleteNotes = dayData ? dayData.notes.filter(note => !note.isCompleted).length : 0;

      days.push(
        <div
          key={day}
          className={`day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
          onClick={() => !isPast && onDayClick(date)}
        >
          <span>{day}</span>
          {incompleteNotes > 0 && <span className="note-count">{incompleteNotes}</span>}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="calendar">
      <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
      <div className="calendar-grid">
        <div className="weekday">Sun</div>
        <div className="weekday">Mon</div>
        <div className="weekday">Tue</div>
        <div className="weekday">Wed</div>
        <div className="weekday">Thu</div>
        <div className="weekday">Fri</div>
        <div className="weekday">Sat</div>
        {renderCalendar()}
      </div>
    </div>
  );
};

const DayDetail = ({ date, onClose }) => {
  const [dayData, setDayData] = useState(null);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchDayData();
  }, [date]);

  const fetchDayData = async () => {
    const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const data = await backend.getDayData(dateString);
    setDayData(data[0] || { notes: [], onThisDay: null });
  };

  const addNote = async () => {
    if (newNote.trim()) {
      const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      await backend.addNote(dateString, newNote);
      setNewNote('');
      fetchDayData();
    }
  };

  const completeNote = async (noteId) => {
    const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    await backend.completeNote(dateString, noteId);
    fetchDayData();
  };

  const fetchOnThisDay = async () => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${month}/${day}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.selected && data.selected.length > 0) {
        const item = data.selected[0];
        const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        await backend.storeOnThisDay(dateString, item.text, item.year, item.pages[0].content_urls.desktop.page);
        fetchDayData();
      }
    } catch (error) {
      console.error('Error fetching On This Day data:', error);
    }
  };

  return (
    <div className="day-detail">
      <h2>{date.toDateString()}</h2>
      <button onClick={onClose}>Close</button>
      <div className="on-this-day">
        <h3>On This Day</h3>
        {dayData && dayData.onThisDay ? (
          <div>
            <p>{dayData.onThisDay.title} ({dayData.onThisDay.year})</p>
            <a href={dayData.onThisDay.wikiLink} target="_blank" rel="noopener noreferrer">Read more</a>
          </div>
        ) : (
          <button onClick={fetchOnThisDay}>Request Data</button>
        )}
      </div>
      <div className="notes">
        <h3>Notes</h3>
        <ul>
          {dayData && dayData.notes.map((note) => (
            <li key={note.id} className={note.isCompleted ? 'completed' : ''}>
              {note.content}
              {!note.isCompleted && (
                <button onClick={() => completeNote(note.id)}>Complete</button>
              )}
            </li>
          ))}
        </ul>
        <div className="add-note">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="New note"
          />
          <button onClick={addNote}>Add Note</button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [selectedDate, setSelectedDate] = useState(null);

  return (
    <div className="app">
      <h1>Daily Planner</h1>
      <Calendar onDayClick={setSelectedDate} />
      {selectedDate && (
        <DayDetail date={selectedDate} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
