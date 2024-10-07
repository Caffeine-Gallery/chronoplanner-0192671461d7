import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface DayData {
  'onThisDay' : [] | [OnThisDay],
  'notes' : Array<Note>,
}
export interface Note {
  'id' : bigint,
  'content' : string,
  'isCompleted' : boolean,
}
export interface OnThisDay {
  'title' : string,
  'wikiLink' : string,
  'year' : bigint,
}
export interface _SERVICE {
  'addNote' : ActorMethod<[string, string], undefined>,
  'completeNote' : ActorMethod<[string, bigint], undefined>,
  'getDayData' : ActorMethod<[string], [] | [DayData]>,
  'getMonthData' : ActorMethod<[bigint, bigint], Array<[string, DayData]>>,
  'storeOnThisDay' : ActorMethod<[string, string, bigint, string], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
