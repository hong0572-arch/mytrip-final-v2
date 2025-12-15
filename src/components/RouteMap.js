"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

// 지도의 중심을 자동으로 맞춰주는 컴포넌트
function ChangeView({ center }) {
    const map = useMap();
    useEffect(() => {
        if (map && center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

export default function RouteMap({ data, className }) {
    if (!data || data.length === 0) return null;

    // 모든 좌표 추출
    const allLocations = data.flatMap(day => day.locations);
    if (allLocations.length === 0) return null;

    // 초기 중심좌표 (첫번째 장소)
    const center = [allLocations[0].lat, allLocations[0].lng];

    // 날짜별 색상 (최대 7일치 순환)
    const colors = ['#FF5A5F', '#00A699', '#FC642D', '#484848', '#767676', '#FFB400', '#007A87'];

    return (
        <div className={`w-full overflow-hidden shadow-md relative z-0 border border-gray-200 ${className || "h-80 rounded-xl my-6"}`}>
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <ChangeView center={center} />

                {/* 경로 그리기 & 마커 표시 */}
                {data.map((day, index) => {
                    const color = colors[index % colors.length];
                    const positions = day.locations.map(loc => [loc.lat, loc.lng]);

                    return (
                        <div key={index}>
                            {/* 이동 경로 선 */}
                            <Polyline positions={positions} color={color} weight={4} opacity={0.7} />

                            {/* 장소 마커 */}
                            {day.locations.map((loc, idx) => (
                                <Marker key={`${index}-${idx}`} position={[loc.lat, loc.lng]}>
                                    <Popup>
                                        <div className="text-sm font-bold">{loc.name}</div>
                                        <div className="text-xs text-gray-500 mb-1">Day {day.day} - {idx + 1}번 경유지</div>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 text-xs hover:underline flex items-center gap-1"
                                        >
                                            구글맵에서 보기 ↗
                                        </a>
                                    </Popup>
                                </Marker>
                            ))}
                        </div>
                    );
                })}
            </MapContainer>
        </div>
    );
}
