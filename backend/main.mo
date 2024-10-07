import Bool "mo:base/Bool";
import Func "mo:base/Func";
import Hash "mo:base/Hash";

import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Array "mo:base/Array";
import Nat "mo:base/Nat";

actor {
  // Define types
  type Note = {
    id: Nat;
    content: Text;
    isCompleted: Bool;
  };

  type OnThisDay = {
    title: Text;
    year: Int;
    wikiLink: Text;
  };

  type DayData = {
    notes: [Note];
    onThisDay: ?OnThisDay;
  };

  // Create a stable variable to store the data
  stable var dayDataEntries : [(Text, DayData)] = [];

  // Create a HashMap to store the data
  var dayData = HashMap.HashMap<Text, DayData>(0, Text.equal, Text.hash);

  // Initialize the HashMap with the stable data
  dayData := HashMap.fromIter<Text, DayData>(dayDataEntries.vals(), 0, Text.equal, Text.hash);

  // Function to add a note
  public func addNote(date: Text, content: Text) : async () {
    let currentData = switch (dayData.get(date)) {
      case null { { notes = []; onThisDay = null; } };
      case (?data) { data };
    };
    
    let newNote : Note = {
      id = Array.size(currentData.notes);
      content = content;
      isCompleted = false;
    };
    
    let updatedNotes = Array.append(currentData.notes, [newNote]);
    let updatedData : DayData = {
      notes = updatedNotes;
      onThisDay = currentData.onThisDay;
    };
    
    dayData.put(date, updatedData);
  };

  // Function to complete a note
  public func completeNote(date: Text, noteId: Nat) : async () {
    switch (dayData.get(date)) {
      case null { /* Do nothing if no data for this date */ };
      case (?data) {
        let updatedNotes = Array.map<Note, Note>(data.notes, func (note) {
          if (note.id == noteId) {
            return { id = note.id; content = note.content; isCompleted = true; };
          } else {
            return note;
          };
        });
        let updatedData : DayData = {
          notes = updatedNotes;
          onThisDay = data.onThisDay;
        };
        dayData.put(date, updatedData);
      };
    };
  };

  // Function to get data for a specific date
  public query func getDayData(date: Text) : async ?DayData {
    dayData.get(date)
  };

  // Function to store "On This Day" data
  public func storeOnThisDay(date: Text, title: Text, year: Int, wikiLink: Text) : async () {
    let currentData = switch (dayData.get(date)) {
      case null { { notes = []; onThisDay = null; } };
      case (?data) { data };
    };
    
    let updatedData : DayData = {
      notes = currentData.notes;
      onThisDay = ?{ title = title; year = year; wikiLink = wikiLink; };
    };
    
    dayData.put(date, updatedData);
  };

  // New function to get data for an entire month
  public query func getMonthData(year: Nat, month: Nat) : async [(Text, DayData)] {
    let monthPrefix = Text.concat(Int.toText(year), "-" # Int.toText(month) # "-");
    Iter.toArray(Iter.filter(dayData.entries(), func ((k, v) : (Text, DayData)) : Bool {
      Text.startsWith(k, #text monthPrefix)
    }))
  };

  // Pre-upgrade hook to store the data
  system func preupgrade() {
    dayDataEntries := Iter.toArray(dayData.entries());
  };

  // Post-upgrade hook to restore the data
  system func postupgrade() {
    dayData := HashMap.fromIter<Text, DayData>(dayDataEntries.vals(), 0, Text.equal, Text.hash);
  };
}
