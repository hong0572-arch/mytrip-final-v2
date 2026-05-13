const fs = require('fs');
let content = fs.readFileSync('src/app/mypage/page.js', 'utf8');

const navRegex = /<nav className="bg-white\/70 backdrop-blur-2xl border border-white\/50 shadow-\[0_20px_40px_rgba\(0,0,0,0\.1\)\] rounded-\[32px\] px-2 py-2\.5 flex justify-around items-center">[\s\S]+?<\/nav>/;

const newNav = `<nav className="bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[32px] px-2 py-2.5 flex justify-around items-center">
                        <button onClick={() => router.push('/?mode=new')} className="flex flex-col items-center gap-1 p-2 w-[70px] text-gray-500 hover:text-rose-600 transition"><HomeIcon size={24} strokeWidth={2} /><span className="text-[10px] font-bold break-keep whitespace-nowrap">홈</span></button>
                        <button onClick={() => setActiveTab('social')} className={\`flex flex-col items-center gap-1 p-2 w-[70px] transition \${activeTab === 'social' ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500 scale-110' : 'text-gray-500 hover:text-rose-600'}\`}><Users size={24} strokeWidth={activeTab === 'social' ? 2.5 : 2} className={activeTab === 'social' ? 'text-rose-500' : ''} /><span className="text-[10px] font-bold break-keep whitespace-nowrap">동행</span></button>
                        <button onClick={() => setActiveTab('schedule')} className={\`flex flex-col items-center gap-1 p-2 w-[70px] transition \${activeTab === 'schedule' ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500 scale-110' : 'text-gray-500 hover:text-rose-600'}\`}><Calendar size={24} strokeWidth={activeTab === 'schedule' ? 2.5 : 2} className={activeTab === 'schedule' ? 'text-rose-500' : ''} /><span className="text-[10px] font-bold break-keep whitespace-nowrap">일정</span></button>
                        <button onClick={() => setActiveTab('wallet')} className={\`flex flex-col items-center gap-1 p-2 w-[70px] transition \${activeTab === 'wallet' ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 scale-110' : 'text-gray-500 hover:text-indigo-600'}\`}><Wallet size={24} strokeWidth={activeTab === 'wallet' ? 2.5 : 2} className={activeTab === 'wallet' ? 'text-indigo-500' : ''} /><span className="text-[10px] font-bold break-keep whitespace-nowrap">트립머니</span></button>
                        <button onClick={() => setActiveTab('vault')} className={\`flex flex-col items-center gap-1 p-2 w-[70px] transition \${activeTab === 'vault' ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 scale-110' : 'text-gray-500 hover:text-emerald-600'}\`}><Box size={24} strokeWidth={activeTab === 'vault' ? 2.5 : 2} className={activeTab === 'vault' ? 'text-emerald-500' : ''} /><span className="text-[10px] font-bold break-keep whitespace-nowrap">보관함</span></button>
                    </nav>`;

content = content.replace(navRegex, newNav);
fs.writeFileSync('src/app/mypage/page.js', content, 'utf8');
console.log('Navigation bar updated successfully');
