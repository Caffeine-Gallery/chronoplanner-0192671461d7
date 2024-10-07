export const idlFactory = ({ IDL }) => {
  const OnThisDay = IDL.Record({
    'title' : IDL.Text,
    'wikiLink' : IDL.Text,
    'year' : IDL.Int,
  });
  const Note = IDL.Record({
    'id' : IDL.Nat,
    'content' : IDL.Text,
    'isCompleted' : IDL.Bool,
  });
  const DayData = IDL.Record({
    'onThisDay' : IDL.Opt(OnThisDay),
    'notes' : IDL.Vec(Note),
  });
  return IDL.Service({
    'addNote' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'completeNote' : IDL.Func([IDL.Text, IDL.Nat], [], []),
    'getDayData' : IDL.Func([IDL.Text], [IDL.Opt(DayData)], ['query']),
    'storeOnThisDay' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Int, IDL.Text],
        [],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
