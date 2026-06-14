"use client";

import React from 'react';

export default function SunSceneBackground({ scene }) {
    // Determine the background gradient for the largest box (based on the scene)
    let containerGradient = '';
    switch(scene) {
        case 'mountain':
            // Green theme gradient (Vivid green down to dark forest green)
            containerGradient = 'linear-gradient(to bottom, #1b5e20 0%, #004d40 40%, #001810 100%)';
            break;
        case 'beach':
            // Blue theme gradient (Vivid blue down to dark ocean blue)
            containerGradient = 'linear-gradient(to bottom, #0d47a1 0%, #1a237e 40%, #05081f 100%)';
            break;
        case 'city':
            // Purple/indigo theme gradient (Vivid indigo down to deep dark purple/black)
            containerGradient = 'linear-gradient(to bottom, #311b92 0%, #1a0f4e 40%, #080315 100%)';
            break;
        case 'cruise':
            // Magenta/orange/warm theme gradient (Vivid magenta down to deep wine/charcoal)
            containerGradient = 'linear-gradient(to bottom, #880e4f 0%, #4a0072 40%, #150025 100%)';
            break;
        case 'sky':
        default:
            // Golden yellow/orange theme gradient (Vivid gold down to dark amber/black)
            containerGradient = 'linear-gradient(to bottom, #e65100 0%, #5d2000 40%, #1c0600 100%)';
            break;
    }

    return (
        <div 
            className="absolute inset-0 overflow-hidden pointer-events-none z-0 transition-all duration-700"
            style={{ background: containerGradient }}
        >
            <div className="absolute inset-x-0 top-0 h-[320px]">
                {/* The Sun & Sky base gradient */}
                <svg
                    className="w-full h-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        {/* Glowing Sun Radial Gradient */}
                        <radialGradient id="sunGlow" cx="50%" cy="15%" r="35%">
                            <stop offset="0%" stopColor="#FFFF00" stopOpacity="1" />
                            <stop offset="30%" stopColor="#FF7000" stopOpacity="0.9" />
                            <stop offset="70%" stopColor="#FF0000" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#FF0000" stopOpacity="0" />
                        </radialGradient>

                        {/* Massive Vivid Sun Gradient */}
                        <radialGradient id="hugeSun" cx="50%" cy="40%" r="42%">
                            <stop offset="0%" stopColor="#FFFF00" />
                            <stop offset="40%" stopColor="#FF9000" />
                            <stop offset="80%" stopColor="#FF0000" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#FF0000" stopOpacity="0" />
                        </radialGradient>

                        {/* Warm Sun Radial Gradient for Beach */}
                        <radialGradient id="warmSun" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FFFF00" />
                            <stop offset="70%" stopColor="#FF5722" />
                            <stop offset="100%" stopColor="#FF5722" stopOpacity="0" />
                        </radialGradient>

                        {/* Violet Sun Radial Gradient for City */}
                        <radialGradient id="violetSun" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FFFF00" />
                            <stop offset="70%" stopColor="#E040FB" />
                            <stop offset="100%" stopColor="#E040FB" stopOpacity="0" />
                        </radialGradient>

                        {/* Orange Sun Radial Gradient for Cruise */}
                        <radialGradient id="orangeSun" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FFFF00" />
                            <stop offset="70%" stopColor="#FF5722" />
                            <stop offset="100%" stopColor="#FF5722" stopOpacity="0" />
                        </radialGradient>

                        {/* Highly Saturated Sunset Sky for Beach */}
                        <linearGradient id="beachSky" x1="50%" y1="0%" x2="50%" y2="100%">
                            <stop offset="0%" stopColor="#FF007F" stopOpacity="0.7" />
                            <stop offset="50%" stopColor="#FF5722" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#FF5722" stopOpacity="0" />
                        </linearGradient>

                        {/* Highly Saturated Sky for Mountain */}
                        <linearGradient id="mtnSky" x1="50%" y1="0%" x2="50%" y2="100%">
                            <stop offset="0%" stopColor="#7B1FA2" stopOpacity="0.75" />
                            <stop offset="50%" stopColor="#E040FB" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#E040FB" stopOpacity="0" />
                        </linearGradient>

                        {/* Highly Saturated Sky for City */}
                        <linearGradient id="citySky" x1="50%" y1="0%" x2="50%" y2="100%">
                            <stop offset="0%" stopColor="#1A237E" stopOpacity="0.75" />
                            <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
                        </linearGradient>

                        {/* Highly Saturated Sky for Cruise */}
                        <linearGradient id="cruiseSky" x1="50%" y1="0%" x2="50%" y2="100%">
                            <stop offset="0%" stopColor="#311B92" stopOpacity="0.75" />
                            <stop offset="50%" stopColor="#FF4081" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#FF4081" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* 1. Sky Color Gradients */}
                    {scene === 'mountain' && <rect width="100" height="100" fill="url(#mtnSky)" />}
                    {scene === 'beach' && <rect width="100" height="100" fill="url(#beachSky)" />}
                    {scene === 'city' && <rect width="100" height="100" fill="url(#citySky)" />}
                    {scene === 'cruise' && <rect width="100" height="100" fill="url(#cruiseSky)" />}
                    {(!scene || scene === 'sky') && <rect width="100" height="100" fill="url(#mtnSky)" />}

                    {/* Birds flying in the distance */}
                    <g opacity="0.4">
                        <path d="M 20 22 Q 22 20 24 22 Q 26 20 28 22" stroke="#FFFFFF" strokeWidth="0.8" fill="none" />
                        <path d="M 76 18 Q 78 16 80 18 Q 82 16 84 18" stroke="#FFFFFF" strokeWidth="0.8" fill="none" />
                    </g>

                    {/* 2. Scenes Rendered with massive size and vivid raw colors */}

                    {/* [SCENE 1: MOUNTAIN] - 크고 초록초록한 산 */}
                    {scene === 'mountain' && (
                        <g>
                            {/* Sun */}
                            <circle cx="75" cy="30" r="22" fill="url(#sunGlow)" />
                            <circle cx="75" cy="30" r="8" fill="#FFFF00" />

                            {/* Far Mountain range (Deep Forest Green) - Raised and enlarged */}
                            <path
                                d="M -10 80 Q 25 20 48 38 T 98 15 T 110 70 L 110 100 H -10 Z"
                                fill="#004D40"
                            />
                            {/* Mid Mountain range (Vibrant Vivid Green) */}
                            <path
                                d="M -10 86 Q 15 32 38 45 T 78 28 T 110 75 L 110 100 H -10 Z"
                                fill="#00C853"
                            />
                            {/* Near Mountain range (Vivid Neon/Lime Green) */}
                            <path
                                d="M -10 92 Q 30 50 58 58 T 110 80 L 110 100 H -10 Z"
                                fill="#76FF03"
                            />
                            {/* Mountain sunlit highlights */}
                            <path d="M 38 45 L 43 38 L 52 44 M 78 28 L 83 33 L 92 30" stroke="#CCFF90" strokeWidth="1.5" fill="none" opacity="0.6" />
                        </g>
                    )}

                    {/* [SCENE 2: BEACH] - 크고 푸른 바다 */}
                    {scene === 'beach' && (
                        <g>
                            {/* Huge Sun setting into sea */}
                            <circle cx="50" cy="38" r="26" fill="url(#warmSun)" />
                            <circle cx="50" cy="38" r="10" fill="#FFFF00" />

                            {/* Deep Sea (Pure Saturated Blue) - Raised and enlarged */}
                            <path
                                d="M -10 48 H 110 V 100 H -10 Z"
                                fill="#0D47A1"
                            />
                            {/* Mid Sea Wave (Vibrant Electric Blue) */}
                            <path
                                d="M -10 60 Q 25 50 50 62 T 110 55 V 100 H -10 Z"
                                fill="#2979FF"
                            />
                            {/* Near Wave (Vivid Neon Cyan) */}
                            <path
                                d="M -10 74 Q 20 80 48 68 T 110 72 V 100 H -10 Z"
                                fill="#00E5FF"
                            />
                            {/* Coastline Beach Sand (Vivid Golden Yellow) */}
                            <path
                                d="M -10 82 Q 25 76 42 91 T 90 100 H -10 Z"
                                fill="#FFD600"
                            />
                            
                            {/* Palm Tree trunk (Solid Dark Brown) */}
                            <path
                                d="M 5 100 Q 14 70 8 42 Q 11 42 13 44 Q 16 70 11 100 Z"
                                fill="#3E2723"
                            />
                            {/* Palm Leaves (Vibrant Forest Green) */}
                            <path
                                d="M 8 42 Q -3 36 -12 44 M 8 42 Q 5 28 -2 18 M 8 42 Q 18 28 28 20 M 8 42 Q 21 38 32 42 M 8 42 Q 13 52 18 64"
                                stroke="#004D40"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                fill="none"
                            />
                            <path
                                d="M 8 42 Q -3 36 -12 44 M 8 42 Q 5 28 -2 18 M 8 42 Q 18 28 28 20 M 8 42 Q 21 38 32 42 M 8 42 Q 13 52 18 64"
                                stroke="#00C853"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                fill="none"
                            />
                        </g>
                    )}

                    {/* [SCENE 3: CITY] - 크고 화려한 도시 */}
                    {scene === 'city' && (
                        <g>
                            {/* Sunset Sun */}
                            <circle cx="50" cy="38" r="22" fill="url(#violetSun)" />
                            <circle cx="50" cy="38" r="8" fill="#FFFF00" />

                            {/* Cyberpunk City Skyline - Taller & wider */}
                            {/* Building 1 (Vibrant Royal Blue) */}
                            <path d="M 3 100 V 40 H 22 V 100 Z" fill="#0D47A1" />
                            {/* Windows for Building 1 (Neon Cyan) */}
                            <g fill="#00E5FF">
                                <rect x="7" y="46" width="3" height="5" />
                                <rect x="15" y="46" width="3" height="5" />
                                <rect x="7" y="58" width="3" height="5" />
                                <rect x="15" y="58" width="3" height="5" />
                                <rect x="7" y="70" width="3" height="5" />
                                <rect x="15" y="70" width="3" height="5" />
                            </g>

                            {/* Building 2 (Center-left, Neon Violet/Purple with spire) */}
                            <path d="M 25 100 V 22 H 47 V 100 Z" fill="#AA00FF" />
                            <line x1="36" y1="22" x2="36" y2="5" stroke="#FF007F" strokeWidth="2.5" />
                            <circle cx="36" cy="5" r="2" fill="#FF1744" />
                            {/* Windows for Building 2 (Hot Pink) */}
                            <g fill="#FF007F">
                                <rect x="29" y="28" width="4" height="4" />
                                <rect x="39" y="28" width="4" height="4" />
                                <rect x="29" y="38" width="4" height="4" />
                                <rect x="39" y="38" width="4" height="4" />
                                <rect x="29" y="48" width="4" height="4" />
                                <rect x="39" y="48" width="4" height="4" />
                                <rect x="29" y="58" width="4" height="4" />
                                <rect x="39" y="58" width="4" height="4" />
                            </g>

                            {/* Building 3 (Center-right, Electric Teal) */}
                            <path d="M 50 100 V 32 H 72 V 100 Z" fill="#006064" />
                            {/* Windows for Building 3 (Neon Green) */}
                            <g fill="#00E676">
                                <rect x="54" y="38" width="14" height="3" />
                                <rect x="54" y="46" width="14" height="3" />
                                <rect x="54" y="54" width="14" height="3" />
                                <rect x="54" y="62" width="14" height="3" />
                                <rect x="54" y="70" width="14" height="3" />
                            </g>

                            {/* Building 4 (Right, Dark Charcoal/Amber) */}
                            <path d="M 75 100 V 42 H 92 V 100 Z" fill="#212121" />
                            {/* Windows for Building 4 (Vivid Amber) */}
                            <g fill="#FFD600">
                                <circle cx="80" cy="48" r="2.5" />
                                <circle cx="87" cy="48" r="2.5" />
                                <circle cx="80" cy="58" r="2.5" />
                                <circle cx="87" cy="58" r="2.5" />
                                <circle cx="80" cy="68" r="2.5" />
                                <circle cx="87" cy="68" r="2.5" />
                            </g>

                            {/* Building 5 (Far Right) */}
                            <path d="M 94 100 V 55 H 102 V 100 Z" fill="#3E2723" />
                        </g>
                    )}

                    {/* [SCENE 4: CRUISE] - 크고 여러색의 크루즈 */}
                    {scene === 'cruise' && (
                        <g>
                            {/* Sunset Sun */}
                            <circle cx="25" cy="42" r="18" fill="url(#orangeSun)" />
                            <circle cx="25" cy="42" r="6" fill="#FFFF00" opacity="0.95" />

                            {/* Sea (Vibrant Navy Blue) */}
                            <path
                                d="M -10 64 Q 25 60 50 66 T 110 62 V 100 H -10 Z"
                                fill="#0D47A1"
                            />

                            {/* Huge Multi-Colored Cruise Ship */}
                            <g>
                                {/* White Hull */}
                                <path d="M 10 66 L 78 66 L 86 53 Q 50 52 18 52 Z" fill="#FFFFFF" />
                                
                                {/* Vibrant Neon Red Bottom Stripe */}
                                <path d="M 12 65 L 79 65 L 80 60 L 15 60 Z" fill="#FF1744" />
                                
                                {/* Level 1 Cabins (Vibrant Royal Blue) */}
                                <path d="M 20 52 H 76 V 43 H 25 Z" fill="#2979FF" />
                                
                                {/* Level 2 Cabins (Vibrant Neon Cyan) */}
                                <path d="M 30 43 H 70 V 35 H 35 Z" fill="#00E5FF" />
                                
                                {/* Cabin Portholes / Windows (Vibrant Yellow circles) */}
                                <g fill="#FFD600">
                                    <circle cx="26" cy="47.5" r="2" />
                                    <circle cx="34" cy="47.5" r="2" />
                                    <circle cx="42" cy="47.5" r="2" />
                                    <circle cx="50" cy="47.5" r="2" />
                                    <circle cx="58" cy="47.5" r="2" />
                                    <circle cx="66" cy="47.5" r="2" />
                                    <circle cx="74" cy="47.5" r="2" />
                                    
                                    <circle cx="38" cy="39" r="1.5" />
                                    <circle cx="46" cy="39" r="1.5" />
                                    <circle cx="54" cy="39" r="1.5" />
                                    <circle cx="62" cy="39" r="1.5" />
                                </g>

                                {/* Chimneys / Funnels (Vibrant Saturated Orange & Yellow) */}
                                <path d="M 44 35 L 47 24 H 52 L 49 35 Z" fill="#FF3D00" />
                                <path d="M 56 35 L 59 24 H 64 L 61 35 Z" fill="#FFEA00" />
                                
                                {/* Funnel smoke */}
                                <circle cx="49" cy="18" r="3.5" fill="white" opacity="0.45" />
                                <circle cx="62" cy="18" r="3" fill="white" opacity="0.3" />
                            </g>

                            {/* Waves reflection in front of ship */}
                            <path d="M 8 70 Q 35 67 62 70 T 105 70" stroke="white" strokeWidth="0.8" opacity="0.5" fill="none" />
                            <path d="M 20 74 H 65" stroke="#00E5FF" strokeWidth="0.6" opacity="0.4" />
                        </g>
                    )}

                    {/* [SCENE 5: SKY/CLOUD] - 크고 노란 태양 */}
                    {(!scene || scene === 'sky') && (
                        <g>
                            {/* Huge Saturated Yellow Sun */}
                            <circle cx="50" cy="40" r="35" fill="url(#hugeSun)" />
                            <circle cx="50" cy="40" r="15" fill="#FFFF00" />

                            {/* Beautiful White Clouds */}
                            <path
                                d="M -10 65 C 5 54 20 54 25 60 C 32 48 48 48 55 60 C 64 52 76 52 82 65 H -10 Z"
                                fill="#FFFFFF"
                            />
                            {/* Golden cloud highlights */}
                            <path
                                d="M 30 76 C 38 68 50 68 58 73 C 66 65 78 65 86 73 H 20 Z"
                                fill="#FFD600"
                            />
                        </g>
                    )}
                </svg>
            </div>

            {/* A gentle black vignette fade overlay on top of the SVG to merge it perfectly into the gradient background */}
            <div className="absolute inset-x-0 top-0 h-[320px] bg-gradient-to-b from-transparent via-transparent to-black/75 z-10" />
        </div>
    );
}
