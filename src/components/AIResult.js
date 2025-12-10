"use client";

import { motion } from "framer-motion";
import { CheckCircle, Download, Share2, RefreshCw } from "lucide-react";

export default function AIResult({ data }) {

    const handleDownload = () => {
        window.print();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl relative"
        >
            {/* 1. 상단 헤더 */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-300" />
                    <h2 className="text-2xl font-bold">여행 계획 생성 완료!</h2>
                </div>
            </div>

            {/* 2. 본문 내용 (여백 추가: pb-40) */}
            {/* 하단 고정 버튼에 가려지지 않도록 아래쪽에 충분한 여백(padding-bottom)을 줍니다. */}
            <div className="p-8 bg-gray-50 min-h-[500px] pb-40">
                <div
                    className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600"
                    dangerouslySetInnerHTML={{ __html: data }}
                />
            </div>

            {/* 3. 하단 고정 버튼 바 (Fixed Bottom Bar) */}
            {/* 화면 맨 아래에 항상 떠 있도록 설정했습니다 (fixed bottom-0) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 print:hidden">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">

                    <p className="text-gray-500 text-sm hidden sm:block">
                        *PDF 저장 시 '배경 그래픽' 옵션을 켜주세요.
                    </p>

                    <div className="flex gap-3 w-full sm:w-auto">
                        {/* PDF 저장 버튼 */}
                        <button
                            onClick={handleDownload}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md hover:shadow-lg"
                        >
                            <Download size={20} />
                            PDF로 저장
                        </button>

                        {/* 공유 버튼 (모양만) */}
                        <button
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-200 transition-all font-medium"
                            onClick={() => alert("친구에게 공유하는 기능은 준비 중입니다!")}
                        >
                            <Share2 size={20} />
                            공유
                        </button>

                        {/* 다시 만들기 버튼 (새로고침) */}
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

            {/* 인쇄 스타일: 인쇄할 때는 버튼 숨기고, 여백 제거 */}
            <style jsx global>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .shadow-xl { box-shadow: none !important; }
          .max-w-4xl { max-width: 100% !important; margin: 0 !important; }
          .fixed { position: static !important; } /* 인쇄 시 고정 해제 */
          .pb-40 { padding-bottom: 0 !important; } /* 인쇄 시 여백 제거 */
        }
      `}</style>
        </motion.div>
    );
}