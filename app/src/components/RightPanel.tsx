import { useRef, useEffect } from 'react';
import { useWorldStore } from '../store/world-store';
import type { EventLogEntry } from '../models/types';

const EVENT_TYPE_LABELS: Record<string, string> = {
    move: '移動',
    activity: '活動',
    use_object: '物件',
    talk: '交談',
    joint_activity: '共同',
    idle: '待機',
    system: '系統',
};

export function RightPanel() {
    const currentTick = useWorldStore((s) => s.currentTick);
    const timeLabel = useWorldStore((s) => s.timeLabel);
    const isAutoPlaying = useWorldStore((s) => s.isAutoPlaying);
    const eventLog = useWorldStore((s) => s.eventLog);
    const selectedEventId = useWorldStore((s) => s.selectedEventId);
    const nextTick = useWorldStore((s) => s.nextTick);
    const startAutoPlay = useWorldStore((s) => s.startAutoPlay);
    const stopAutoPlay = useWorldStore((s) => s.stopAutoPlay);
    const selectEvent = useWorldStore((s) => s.selectEvent);

    const logEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new events arrive
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [eventLog.length]);

    const selectedEvent = selectedEventId
        ? eventLog.find((e) => e.id === selectedEventId)
        : null;


    return (
        <div className="right-panel">
            {/* Simulation Controls */}
            <div className="sim-controls">
                <div className="sim-info">
                    <span className="tick-label">Tick #{currentTick}</span>
                    <span className="time-label">{timeLabel}</span>
                </div>
                <div className="sim-buttons">
                    <button className="btn btn-primary" onClick={nextTick} disabled={isAutoPlaying}>
                        ⏭ 下一步
                    </button>
                    {isAutoPlaying ? (
                        <button className="btn btn-danger" onClick={stopAutoPlay}>
                            ⏸ 暫停
                        </button>
                    ) : (
                        <button className="btn btn-secondary" onClick={() => startAutoPlay()}>
                            ▶ 自動播放
                        </button>
                    )}
                </div>
            </div>

            {/* Event Log */}
            <div className="event-log">
                {eventLog.length === 0 && (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        按「下一步」開始模擬
                    </div>
                )}
                {eventLog.map((event) => (
                    <div
                        key={event.id}
                        className={`event-log-item ${selectedEventId === event.id ? 'selected' : ''}`}
                        onClick={() => selectEvent(selectedEventId === event.id ? null : event.id)}
                    >
                        <div className="event-time">
                            <span className={`event-type-badge ${event.eventType}`}>
                                {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                            </span>
                            {event.timeLabel} (#{event.tick})
                        </div>
                        <div className="event-text">{event.displayText}</div>
                    </div>
                ))}
                <div ref={logEndRef} />
            </div>

            {/* Event Detail */}
            {selectedEvent && <EventDetail event={selectedEvent} />}
        </div>
    );
}

function EventDetail({ event }: { event: EventLogEntry }) {
    const characters = useWorldStore((s) => s.characters);
    const locations = useWorldStore((s) => s.locations);
    const objects = useWorldStore((s) => s.objects);
    const activities = useWorldStore((s) => s.activities);
    const topics = useWorldStore((s) => s.topics);

    const charNames = event.characterIds
        .map((cid) => characters.find((c) => c.id === cid)?.name ?? cid)
        .join('、');
    const locName = event.locationId
        ? locations.find((l) => l.id === event.locationId)?.name ?? event.locationId
        : '—';
    const objName = event.objectId
        ? objects.find((o) => o.id === event.objectId)?.name ?? event.objectId
        : '—';
    const actName = event.activityId
        ? activities.find((a) => a.id === event.activityId)?.name ?? event.activityId
        : '—';
    const topicName = event.topicId
        ? topics.find((t) => t.id === event.topicId)?.name ?? event.topicId
        : '—';

    return (
        <div className="event-detail">
            <h3>事件詳情</h3>
            <div className="event-detail-row">
                <span className="label">Tick</span>
                <span className="value">#{event.tick}</span>
            </div>
            <div className="event-detail-row">
                <span className="label">時間</span>
                <span className="value">{event.timeLabel}</span>
            </div>
            <div className="event-detail-row">
                <span className="label">類型</span>
                <span className="value">
                    <span className={`event-type-badge ${event.eventType}`}>
                        {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                    </span>
                </span>
            </div>
            <div className="event-detail-row">
                <span className="label">角色</span>
                <span className="value">{charNames || '—'}</span>
            </div>
            <div className="event-detail-row">
                <span className="label">地點</span>
                <span className="value">{locName}</span>
            </div>
            <div className="event-detail-row">
                <span className="label">活動</span>
                <span className="value">{actName}</span>
            </div>
            <div className="event-detail-row">
                <span className="label">物件</span>
                <span className="value">{objName}</span>
            </div>
            <div className="event-detail-row">
                <span className="label">話題</span>
                <span className="value">{topicName}</span>
            </div>
            <div className="event-detail-row">
                <span className="label">結果</span>
                <span className="value">{event.resultSummary}</span>
            </div>
            {event.weightSummary && (
                <div className="event-detail-row">
                    <span className="label">權重摘要</span>
                    <span className="value weight-summary">{event.weightSummary}</span>
                </div>
            )}
        </div>
    );
}