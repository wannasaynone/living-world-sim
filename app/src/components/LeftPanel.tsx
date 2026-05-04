import { useWorldStore, type EntityType } from '../store/world-store';

const sections: { type: EntityType; label: string; emoji: string }[] = [
    { type: 'character', label: '角色', emoji: '👤' },
    { type: 'location', label: '地點', emoji: '📍' },
    { type: 'object', label: '物件', emoji: '📦' },
    { type: 'activity', label: '活動', emoji: '🎯' },
    { type: 'topic', label: '話題', emoji: '💬' },
];

export function LeftPanel() {
    const characters = useWorldStore((s) => s.characters);
    const locations = useWorldStore((s) => s.locations);
    const objects = useWorldStore((s) => s.objects);
    const activities = useWorldStore((s) => s.activities);
    const topics = useWorldStore((s) => s.topics);
    const selectedEntity = useWorldStore((s) => s.selectedEntity);
    const selectEntity = useWorldStore((s) => s.selectEntity);
    const addCharacter = useWorldStore((s) => s.addCharacter);
    const addLocation = useWorldStore((s) => s.addLocation);
    const addObject = useWorldStore((s) => s.addObject);
    const addActivity = useWorldStore((s) => s.addActivity);
    const addTopic = useWorldStore((s) => s.addTopic);

    const getItems = (type: EntityType) => {
        switch (type) {
            case 'character': return characters.map((c) => ({ id: c.id, name: c.name }));
            case 'location': return locations.map((l) => ({ id: l.id, name: l.name }));
            case 'object': return objects.map((o) => ({ id: o.id, name: o.name }));
            case 'activity': return activities.map((a) => ({ id: a.id, name: a.name }));
            case 'topic': return topics.map((t) => ({ id: t.id, name: t.name }));
        }
    };

    const handleAdd = (type: EntityType) => {
        const name = prompt(`新增${sections.find((s) => s.type === type)?.label}名稱：`);
        if (!name?.trim()) return;
        switch (type) {
            case 'character': addCharacter(name.trim()); break;
            case 'location': addLocation(name.trim()); break;
            case 'object': addObject(name.trim()); break;
            case 'activity': addActivity(name.trim()); break;
            case 'topic': addTopic(name.trim()); break;
        }
    };

    return (
        <div className="left-panel">
            {sections.map((section) => {
                const items = getItems(section.type);
                return (
                    <div key={section.type} className="nav-section">
                        <div className="nav-section-header">
                            <span>{section.emoji} {section.label}</span>
                            <span className="count">{items.length}</span>
                        </div>
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className={`nav-item ${selectedEntity?.type === section.type && selectedEntity?.id === item.id ? 'selected' : ''}`}
                                onClick={() => selectEntity({ type: section.type, id: item.id })}
                            >
                                {item.name}
                            </div>
                        ))}
                        <div className="nav-add-btn" onClick={() => handleAdd(section.type)}>
                            + 新增{section.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}