"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

const colors = ['#FF5A5F', '#00A699', '#FC642D', '#484848', '#767676', '#1E90FF', '#32CD32'];

export default function RouteMap({ data, className }) {
    // 1. 데이터 유효성 검사 (필수 데이터 없으면 렌더링 중단)
    if (!data || !data.markers || !Array.isArray(data.markers) || data.markers.length === 0) {
        return null;
    }

    const { markers, polylines } = data;

    // 2. 중심 좌표 계산 (첫 번째 마커 기준, 없으면 서울 시청)
    const center = [markers[0].lat, markers[0].lng];

    return (
        <div className={`w-full overflow-hidden relative z-0 ${className || "h-80 my-6 rounded-xl border border-gray-200"}`}>
            <MapContainer
                center={center}
                zoom={10}
                scrollWheelZoom={false}
                className="w-full h-full"
                style={{ background: '#f5f5f5' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* 마커 표시 */}
                {markers.map((marker, index) => (
                    <Marker key={index} position={[marker.lat, marker.lng]}>
                        <Popup>
                            <div className="text-sm font-bold">{marker.title}</div>
                            <div className="text-xs text-gray-500 mb-1">{marker.day}일차</div>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(marker.title)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 text-xs hover:underline flex items-center gap-1"
                            >
                                구글맵에서 보기 ↗
                            </a>
                        </Popup>
                    </Marker>
                ))}

                {/* 경로 선 표시 */}
                {polylines && Array.isArray(polylines) && polylines.map((line, index) => (
                    <Polyline
                        key={index}
                        positions={line.path}
                        pathOptions={{ color: colors[index % colors.length], weight: 4, opacity: 0.7 }}
                    />
                ))}
            </MapContainer>
        </div>
    );
}
