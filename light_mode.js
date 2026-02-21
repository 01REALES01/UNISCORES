const fs = require('fs');

let file = './src/app/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

// Global Background and text
txt = txt.replace('bg-[#030711] text-white', 'bg-slate-50 text-slate-900');

// Header
txt = txt.replace('bg-[#030711]/70', 'bg-white/70');
txt = txt.replace('border-b border-white/5', 'border-b border-slate-200');
txt = txt.replace('from-white to-slate-400', 'from-slate-900 to-slate-600');
txt = txt.replace('text-white relative z-10', 'text-white relative z-10'); // Trophy icon is fine in red box
// Small text in header
txt = txt.replace('text-white font-bold', 'text-slate-900 font-bold'); // "Hola, user"
txt = txt.replace(/>{user.email\?\./, ' className="text-slate-900">{user.email?.');

// Header greeting
txt = txt.replace('text-sm font-bold text-white', 'text-sm font-bold text-slate-900');

// Search Bar
txt = txt.replace('bg-white/5 border border-white/10 focus:border-amber-500/50 focus:bg-white/10 focus:ring-4 focus:ring-amber-500/10 focus:outline-none transition-all text-sm font-medium placeholder:text-slate-500 text-white', 'bg-white border border-slate-200 focus:border-amber-500/50 focus:bg-slate-50 focus:ring-4 focus:ring-amber-500/10 focus:outline-none transition-all text-sm font-medium placeholder:text-slate-500 text-slate-900 shadow-sm');

// Filter Buttons
txt = txt.replace('bg-white text-[#030711] border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]', 'bg-red-600 text-white border-red-600 shadow-md');
txt = txt.replace(/"bg-white\/5 border-white\/5 text-slate-400 hover:bg-white\/10 hover:text-white"/g, '"bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 shadow-sm border"');

txt = txt.replace(/bg-\[#0a0f1c\]/g, 'bg-white');

// Section Titles
txt = txt.replace(/text-white tracking-tight/g, 'text-slate-900 tracking-tight');
txt = txt.replace(/text-white mb-2/g, 'text-slate-900 mb-2');

// Live Cards
txt = txt.replace('bg-[#0a0f1c]/80 backdrop-blur-xl', 'bg-white backdrop-blur-xl shadow-md');
txt = txt.replace(/border-white\/10/g, 'border-slate-200');
txt = txt.replace(/text-white\/60/g, 'text-slate-500');
txt = txt.replace(/text-white\/80/g, 'text-slate-700');
txt = txt.replace(/text-white leading-tight/g, 'text-slate-900 leading-tight');
txt = txt.replace(/text-white tracking-tighter/g, 'text-slate-900 tracking-tighter');
txt = txt.replace(/text-white\/20/g, 'text-slate-300'); // the ":"
txt = txt.replace(/text-white\/90/g, 'text-slate-700');
txt = txt.replace(/text-white\/40/g, 'text-slate-400');
txt = txt.replace(/border-2 border-white\/10 shadow-lg bg-\[#030711\]/g, 'border-2 border-slate-100 shadow-sm bg-white');

// Upcoming Cards
txt = txt.replace(/bg-white\/5 hover:bg-white\/10/g, 'bg-white hover:bg-slate-50 shadow-sm border-slate-200');
txt = txt.replace(/border-white\/5/g, 'border-slate-200');
txt = txt.replace(/text-slate-200/g, 'text-slate-800');
txt = txt.replace(/text-slate-400/g, 'text-slate-500');

// Result Cards
txt = txt.replace(/bg-white\/\[0\.02\] hover:bg-white\/5/g, 'bg-white hover:bg-slate-50 shadow-sm');
txt = txt.replace(/bg-slate-800\/50/g, 'bg-slate-100');

// Empty State
txt = txt.replace(/text-white\/20/g, 'text-slate-300'); // trophy
txt = txt.replace(/border-white\/10/g, 'border-slate-200');

fs.writeFileSync(file, txt);
