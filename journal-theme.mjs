/** Cold Storage 1.5.0: Altered Carbon look for the adventure's own journals.
 * Only JournalEntries (and their pages) imported by this module are themed; other journals are untouched.
 */
const MOD='cold-storage';
export function isColdStorageJournal(doc){
 const entry=doc?.documentName==='JournalEntryPage'?doc.parent:doc;
 if(entry?.documentName!=='JournalEntry')return false;
 const flags=entry.flags?.[MOD]??{};
 return Boolean(flags.sourceId||flags.bookCategory);
}
export function themeJournalElement(app,element){
 const doc=app?.document;if(!isColdStorageJournal(doc))return false;
 const root=element?.classList?element:app?.element;if(!root?.classList)return false;
 const entry=doc.documentName==='JournalEntryPage'?doc.parent:doc;
 root.classList.add('cold-storage','cs-journal-sheet','theme-dark');root.classList.remove('theme-light');
 const category=entry.flags?.[MOD]?.bookCategory;if(category)root.dataset.csCategory=category;
 return true;
}
export function registerJournalTheme(){
 Hooks.on('renderApplicationV2',(app,element)=>{try{themeJournalElement(app,element);}catch(error){console.warn('Cold Storage | journal theme skipped',error);}});
}
