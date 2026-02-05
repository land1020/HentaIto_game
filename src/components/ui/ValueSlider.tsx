import React, { useRef, useState, useEffect } from 'react';

interface SliderIcon {
    id: string;
    value: number; // 0-100
    color: string;
    label?: string; // e.g. "自分" or "P1"
}

interface ValueSliderProps {
    value: number | null; // Current user's value
    onChange: (val: number) => void;
    otherIcons?: SliderIcon[]; // Icons of other players (if visible)
    minLabel?: string;
    maxLabel?: string;
    activeColor?: string;
    compact?: boolean;
    disabled?: boolean;
    markers?: { value: number; color: string }[];
    bottomIcons?: SliderIcon[];
    readOnly?: boolean;
}

export const ValueSlider: React.FC<ValueSliderProps> = ({
    value,
    onChange,
    otherIcons = [],
    minLabel = "弱い (1)",
    maxLabel = "強い (100)",
    disabled = false,
    activeColor = 'var(--color-primary)',
    compact = false,
    markers = [],
    bottomIcons = [],
    readOnly = false
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleInteraction = (clientX: number) => {
        if (disabled || readOnly || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        let percentage = (x / rect.width) * 100;

        // Clamp
        percentage = Math.max(1, Math.min(100, percentage));

        onChange(Math.round(percentage));
    };

    const onMouseDown = (e: React.MouseEvent) => {
        if (readOnly) return;
        handleInteraction(e.clientX);
        setIsDragging(true);
    };

    const onTouchStart = (e: React.TouchEvent) => {
        if (readOnly) return;
        handleInteraction(e.touches[0].clientX);
        setIsDragging(true);
    };

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (isDragging) handleInteraction(e.clientX);
        };
        const onUp = () => setIsDragging(false);

        const onTouchMove = (e: TouchEvent) => {
            if (isDragging) handleInteraction(e.touches[0].clientX);
        };

        if (isDragging) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onUp);
        };
    }, [isDragging]);

    const showLabels = minLabel || maxLabel;
    const trackHeight = compact ? '24px' : '40px';
    const containerPadding = compact ? '10px 0' : '20px 0';

    return (
        <div style={{ padding: containerPadding, userSelect: 'none' }}>
            {showLabels && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 'bold', color: '#666', fontSize: compact ? '0.8rem' : '1rem' }}>
                    <span>{minLabel}</span>
                    <span>{maxLabel}</span>
                </div>
            )}

            <div
                ref={trackRef}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                style={{
                    position: 'relative',
                    height: trackHeight,
                    background: '#eee',
                    borderRadius: '20px',
                    cursor: (disabled || readOnly) ? 'default' : 'pointer',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                    border: '2px solid #ddd'
                }}
            >
                {/* Track Line Center */}
                <div style={{
                    position: 'absolute', top: '50%', left: '10px', right: '10px', height: '2px', background: '#ccc', transform: 'translateY(-50%)'
                }} />

                {/* Markers (Inverted Triangles) */}
                {markers.map((marker, i) => (
                    <div
                        key={`marker-${i}`}
                        style={{
                            position: 'absolute',
                            left: `${marker.value}%`,
                            top: '-8px', // Position above the track
                            transform: 'translate(-50%, -100%)',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: `10px solid ${marker.color}`, // Inverted triangle
                            zIndex: 5,
                            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))'
                        }}
                        title={`正解: ${marker.value}`}
                    />
                ))}

                {/* Bottom Icons (Discussion Phase) */}
                {bottomIcons.map((icon, i) => (
                    <div
                        key={`bottom-${i}`}
                        style={{
                            position: 'absolute',
                            left: `${icon.value}%`,
                            // Let's use top: '50px' assuming track is 40px height.
                            top: compact ? '32px' : '48px',
                            transform: 'translate(-50%, 0)',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: icon.color,
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {/* Simple dot or handled by GameScreen passing specific color */}
                    </div>
                ))}

                {/* Other Icons */}
                {(() => {
                    const sortedIcons = [...otherIcons].sort((a, b) => a.value - b.value);
                    const offsets = new Array(sortedIcons.length).fill(0); // 0: Center, 1: Bottom, -1: Top

                    for (let i = 1; i < sortedIcons.length; i++) {
                        const curr = sortedIcons[i];
                        const prev = sortedIcons[i - 1];

                        // If overlap with previous
                        if (Math.abs(curr.value - prev.value) < 6) {
                            const prevOffset = offsets[i - 1];
                            // Cycle through offsets to find a free visual lane
                            // Simple logic: Rotate 0 -> 1 -> -1 -> 0 ...
                            // If prev is 0, we go 1. If prev is 1, we go -1. If prev is -1, we go 0.
                            // But going back to 0 might overlap with prev-prev if that was 0? 
                            // With 6% gap, prev-prev is likely > 6% away if we are just chaining overlaps.
                            // If A(40), B(42), C(44). A=0, B=1, C=-1. Works.

                            if (prevOffset === 0) offsets[i] = 1;      // Move to Bottom
                            else if (prevOffset === 1) offsets[i] = -1; // Move to Top
                            else offsets[i] = 0;                        // Back to Center
                        }
                    }

                    return sortedIcons.map((icon, i) => {
                        const offset = offsets[i];
                        let topPos = '50%';
                        if (offset === 1) topPos = '80%';
                        if (offset === -1) topPos = '20%';

                        return (
                            <div
                                key={icon.id}
                                style={{
                                    position: 'absolute',
                                    left: `${icon.value}%`,
                                    top: topPos,
                                    transform: 'translate(-50%, -50%)',
                                    width: compact ? '28px' : '32px',
                                    height: compact ? '28px' : '32px',
                                    borderRadius: '50%',
                                    background: icon.color,
                                    border: '2px solid white',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    zIndex: 2, // Slightly higher than track
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: compact ? '0.8rem' : '0.9rem',
                                    fontWeight: 'bold',
                                    color: 'white',
                                    transition: 'top 0.3s ease, left 0.3s ease'
                                }}
                                title={`${icon.label}: ${icon.value}`}
                            >
                                {icon.value}
                            </div>
                        );
                    });
                })()}

                {/* Current User Icon */}
                {value !== null && (
                    <div
                        style={{
                            position: 'absolute',
                            left: `${value}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: compact ? '28px' : '32px',
                            height: compact ? '28px' : '32px',
                            borderRadius: '50%',
                            background: activeColor,
                            border: '3px solid white',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                            zIndex: 10,
                            transition: isDragging ? 'none' : 'left 0.1s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            color: 'white',
                            fontSize: compact ? '0.9rem' : '1rem' // Slightly distinct font size if needed, but size is matched now
                        }}
                    >
                        {value}
                    </div>
                )}
            </div>

            {value !== null && (!disabled || readOnly) && (
                <div style={{ textAlign: 'center', marginTop: '28px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                    現在の値: {value}
                </div>
            )}
        </div>
    );
};
