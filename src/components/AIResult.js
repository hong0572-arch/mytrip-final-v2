"use client";

import { motion } from "framer-motion";
import { CheckCircle, Download, Share2, RefreshCw } from "lucide-react";

export default function AIResult({ data }) {

    const handleDownload = () => {
        window.print();
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden mb-32"
            // mb-32: 버튼에 가려지지 않게 아래 여백을 넉넉히 줌
            >
                {/* 상단 헤더 */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-300" />
                        <h2 className="text-2xl font-bold">여행 계획 생성 완료!</h2>
                    </div>
                </div>

                {/* 본문 내용 (디자인 플러그인 적용됨: prose) */}
                <div className="p-8 bg-gray-50 min-h-[500px]">
                    <div
                        className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-li:marker:text-blue-500"
                        dangerouslySetInnerHTML={{ __html: data }}
                    />
                </div>

                {/* 하단 안내 문구 */}
                <div className="bg-gray-100 p-4 text-center text-gray-500 text-sm print:hidden">
                    My Trip Pro AI Report
                </div>
            </motion.div>

            {/* ⭐⭐⭐ 중요: 버튼을 motion.div 밖으로 뺐습니다! ⭐⭐⭐
        이제 애니메이션의 영향을 받지 않고 화면 맨 아래에 무조건 고정됩니다.
      */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[9999] print:hidden">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">

                    <p className="text-gray-500 text-sm font-medium hidden sm:block">
                        💡 팁: PDF 저장 시 '배경 그래픽'을 체크하세요.
                    </p>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {/* PDF 저장 버튼 */}
                        <button
                            onClick={handleDownload}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg"
                        >
                            <Download size={20} />
                            PDF 저장
                        </button>

                        {/* 새로고침 버튼 */}
                        <button
                            className="flex-none flex items-center justify-center p-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-200 transition-all"
                            onClick={() => window.location.reload()}
                            title="다시 만들기"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 인쇄용 스타일 */}
            <style jsx global>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .shadow-xl { box-shadow: none !important; }
          .max-w-4xl { max-width: 100% !important; margin: 0 !important; }
          .mb-32 { margin-bottom: 0 !important; }
        }
      `}</style>
        </>
    );
}