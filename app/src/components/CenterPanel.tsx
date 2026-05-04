import { useWorldStore } from '../store/world-store';
import type { Personality, PersonalityAffinity } from '../models/types';
import { getMBTILabel, defaultPersonalityAffinity } from '../engine/personality-utils';

const PERSONALITY_TRAITS: { key: keyof Personality; label: string }[] = [
    { key: 'I', label: 'I 內向' },
    { key: 'E', label: 'E 外向' },
    { key: 'S', label: 'S 實感' },
    { key: 'N', label: 'N 直覺' },
    { key: 'T', label: 'T 思考' },
    { key: 'F', label: 'F 情感' },
    { key: 'J', label: 'J 判斷' },
    { key: 'P', label: 'P 感知' },
];

const AFFINITY_TRAITS: { key: keyof PersonalityAffinity; label: string }[] = [
    { key: 'I', label: 'I' },
    { key: 'E', label: 'E' },
    { key: 'S', label: 'S' },
    { key: 'N', label: 'N' },
    { key: 'T', label: 'T' },
    { key: 'F', label: 'F' },
    { key: 'J', label: 'J' },
    { key: 'P', label: 'P' },
];

// ===== Shared Personality Affinity Editor =====
function PersonalityAffinityEditor({
    affinity,
    onChange,
}: {
    affinity: PersonalityAffinity;
    onChange: (updated: PersonalityAffinity) => void;
}) {
    return (
        <div className="editor-section">
            <h3>人格相性</h3>
            <p className="form-hint" style={{ marginBottom: 12, lineHeight: 1.6 }}>
                設定哪些人格傾向更容易觸發這個項目。角色人格值只是計算來源；相性 0 表示中性。<br />
                正值（如 E +30）：E 較高的角色更容易觸發此項目。<br />
                負值（如 E -30）：E 較高的角色較不容易觸發此項目。
            </p>
            {AFFINITY_TRAITS.map((trait) => (
                <div key={trait.key} className="personality-slider">
                    <span className="trait-label">{trait.label}</span>
                    <input
                        type="range" min="-100" max="100"
                        value={affinity[trait.key]}
                        onChange={(e) => {
                            onChange({
                                ...affinity,
                                [trait.key]: Number(e.target.value),
                            });
                        }}
                    />
                    <span className="trait-value" style={{ minWidth: 36, textAlign: 'right' }}>
                        {affinity[trait.key] > 0 ? '+' : ''}{affinity[trait.key]}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function CenterPanel() {
    const selectedEntity = useWorldStore((s) => s.selectedEntity);

    if (!selectedEntity) {
        return (
            <div className="center-panel">
                <div className="editor-empty">← 從左側選擇項目進行編輯</div>
            </div>
        );
    }

    return (
        <div className="center-panel">
            <div className="editor-card">
                {selectedEntity.type === 'character' && <CharacterEditor id={selectedEntity.id} />}
                {selectedEntity.type === 'location' && <LocationEditor id={selectedEntity.id} />}
                {selectedEntity.type === 'object' && <ObjectEditor id={selectedEntity.id} />}
                {selectedEntity.type === 'activity' && <ActivityEditor id={selectedEntity.id} />}
                {selectedEntity.type === 'topic' && <TopicEditor id={selectedEntity.id} />}
            </div>
        </div>
    );
}

// ===== Character Editor =====
function CharacterEditor({ id }: { id: string }) {
    const character = useWorldStore((s) => s.characters.find((c) => c.id === id));
    const locations = useWorldStore((s) => s.locations);
    const topics = useWorldStore((s) => s.topics);
    const updateCharacter = useWorldStore((s) => s.updateCharacter);
    const deleteCharacter = useWorldStore((s) => s.deleteCharacter);

    if (!character) return <div className="editor-empty">角色不存在</div>;

    const mbti = getMBTILabel(character.personality);

    return (
        <>
            <div className="editor-header">
                <h2>👤 {character.name}</h2>
                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`確定刪除角色「${character.name}」？`)) deleteCharacter(id); }}>
                    🗑 刪除
                </button>
            </div>

            <div className="editor-section">
                <h3>基本資料</h3>
                <div className="form-group">
                    <label>名稱</label>
                    <input
                        className="form-input"
                        value={character.name}
                        onChange={(e) => updateCharacter(id, { name: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>所在地點</label>
                    <select
                        className="form-select"
                        value={character.locationId ?? ''}
                        onChange={(e) => updateCharacter(id, { locationId: e.target.value || null })}
                    >
                        <option value="">（無）</option>
                        {locations.map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>心情</label>
                    <div className="personality-slider">
                        <input
                            type="range" min="0" max="100"
                            value={character.mood}
                            onChange={(e) => updateCharacter(id, { mood: Number(e.target.value) })}
                        />
                        <span className="trait-value">{character.mood}</span>
                    </div>
                </div>
                <div className="form-group">
                    <label>精力</label>
                    <div className="personality-slider">
                        <input
                            type="range" min="0" max="100"
                            value={character.energy}
                            onChange={(e) => updateCharacter(id, { energy: Number(e.target.value) })}
                        />
                        <span className="trait-value">{character.energy}</span>
                    </div>
                </div>
            </div>

            <div className="editor-section">
                <h3>人格傾向 <span className="mbti-label">{mbti}</span></h3>
                <p className="form-hint" style={{ marginBottom: 12, lineHeight: 1.6 }}>
                    角色的人格數值作為權重計算來源，與地點、活動、物件、話題上的人格相性搭配決定行動傾向。<br />
                    人格不會直接禁止行動，只會影響觸發機率。
                </p>
                {PERSONALITY_TRAITS.map((trait) => (
                    <div key={trait.key} className="personality-slider">
                        <span className="trait-label">{trait.key}</span>
                        <input
                            type="range" min="0" max="100"
                            value={character.personality[trait.key]}
                            onChange={(e) => {
                                updateCharacter(id, {
                                    personality: {
                                        ...character.personality,
                                        [trait.key]: Number(e.target.value),
                                    },
                                });
                            }}
                        />
                        <span className="trait-value">{character.personality[trait.key]}</span>
                    </div>
                ))}
            </div>

            <div className="editor-section">
                <h3>話題偏好</h3>
                <div className="chip-container">
                    {topics.map((topic) => {
                        const isSelected = character.topicPreferences.includes(topic.id);
                        return (
                            <span
                                key={topic.id}
                                className={`chip ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                    const newPrefs = isSelected
                                        ? character.topicPreferences.filter((tid) => tid !== topic.id)
                                        : [...character.topicPreferences, topic.id];
                                    updateCharacter(id, { topicPreferences: newPrefs });
                                }}
                            >
                                {topic.name}
                            </span>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// ===== Location Editor =====
function LocationEditor({ id }: { id: string }) {
    const location = useWorldStore((s) => s.locations.find((l) => l.id === id));
    const activities = useWorldStore((s) => s.activities);
    const objects = useWorldStore((s) => s.objects);
    const updateLocation = useWorldStore((s) => s.updateLocation);
    const deleteLocation = useWorldStore((s) => s.deleteLocation);

    if (!location) return <div className="editor-empty">地點不存在</div>;

    const affinity = location.personalityAffinity ?? defaultPersonalityAffinity();

    return (
        <>
            <div className="editor-header">
                <h2>📍 {location.name}</h2>
                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`確定刪除地點「${location.name}」？`)) deleteLocation(id); }}>
                    🗑 刪除
                </button>
            </div>

            <div className="editor-section">
                <h3>基本資料</h3>
                <div className="form-group">
                    <label>名稱</label>
                    <input
                        className="form-input"
                        value={location.name}
                        onChange={(e) => updateLocation(id, { name: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>吸引力</label>
                    <p className="form-hint">影響角色移動到這個地點的機率。</p>
                    <div className="personality-slider">
                        <input
                            type="range" min="0" max="100"
                            value={location.visitWeight}
                            onChange={(e) => updateLocation(id, { visitWeight: Number(e.target.value) })}
                        />
                        <span className="trait-value">{location.visitWeight}</span>
                    </div>
                </div>
            </div>

            <PersonalityAffinityEditor
                affinity={affinity}
                onChange={(updated) => updateLocation(id, { personalityAffinity: updated })}
            />

            <div className="editor-section">
                <h3>可用活動</h3>
                <div className="chip-container">
                    {activities.map((act) => {
                        const isSelected = location.activityIds.includes(act.id);
                        return (
                            <span
                                key={act.id}
                                className={`chip ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                    const newIds = isSelected
                                        ? location.activityIds.filter((aid) => aid !== act.id)
                                        : [...location.activityIds, act.id];
                                    updateLocation(id, { activityIds: newIds });
                                }}
                            >
                                {act.name}
                            </span>
                        );
                    })}
                </div>
            </div>

            <div className="editor-section">
                <h3>包含物件</h3>
                <div className="chip-container">
                    {objects.map((obj) => {
                        const isSelected = location.objectIds.includes(obj.id);
                        return (
                            <span
                                key={obj.id}
                                className={`chip ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                    const newIds = isSelected
                                        ? location.objectIds.filter((oid) => oid !== obj.id)
                                        : [...location.objectIds, obj.id];
                                    updateLocation(id, { objectIds: newIds });
                                }}
                            >
                                {obj.name}
                            </span>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// ===== Object Editor =====
function ObjectEditor({ id }: { id: string }) {
    const obj = useWorldStore((s) => s.objects.find((o) => o.id === id));
    const locations = useWorldStore((s) => s.locations);
    const actions = useWorldStore((s) => s.actions);
    const updateObject = useWorldStore((s) => s.updateObject);
    const deleteObject = useWorldStore((s) => s.deleteObject);
    const addAction = useWorldStore((s) => s.addAction);
    const deleteAction = useWorldStore((s) => s.deleteAction);

    if (!obj) return <div className="editor-empty">物件不存在</div>;

    const objActions = actions.filter((a) => obj.actionIds.includes(a.id));
    const affinity = obj.personalityAffinity ?? defaultPersonalityAffinity();

    const handleAddAction = () => {
        const name = prompt('新增行動名稱：');
        if (!name?.trim()) return;
        addAction(name.trim(), 'object', id);
    };

    return (
        <>
            <div className="editor-header">
                <h2>📦 {obj.name}</h2>
                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`確定刪除物件「${obj.name}」？`)) deleteObject(id); }}>
                    🗑 刪除
                </button>
            </div>

            <div className="editor-section">
                <h3>基本資料</h3>
                <div className="form-group">
                    <label>名稱</label>
                    <input
                        className="form-input"
                        value={obj.name}
                        onChange={(e) => updateObject(id, { name: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>所在地點</label>
                    <select
                        className="form-select"
                        value={obj.locationId ?? ''}
                        onChange={(e) => updateObject(id, { locationId: e.target.value || null })}
                    >
                        <option value="">（無）</option>
                        {locations.map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <PersonalityAffinityEditor
                affinity={affinity}
                onChange={(updated) => updateObject(id, { personalityAffinity: updated })}
            />

            <div className="editor-section">
                <h3>行動列表</h3>
                {objActions.map((action) => (
                    <div key={action.id} className="action-list-item">
                        <span className="action-name">{action.name}</span>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteAction(action.id)}>
                            ✕
                        </button>
                    </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={handleAddAction} style={{ marginTop: 8 }}>
                    + 新增行動
                </button>
            </div>
        </>
    );
}

// ===== Activity Editor =====
function ActivityEditor({ id }: { id: string }) {
    const activity = useWorldStore((s) => s.activities.find((a) => a.id === id));
    const topics = useWorldStore((s) => s.topics);
    const updateActivity = useWorldStore((s) => s.updateActivity);
    const deleteActivity = useWorldStore((s) => s.deleteActivity);

    if (!activity) return <div className="editor-empty">活動不存在</div>;

    const affinity = activity.personalityAffinity ?? defaultPersonalityAffinity();

    return (
        <>
            <div className="editor-header">
                <h2>🎯 {activity.name}</h2>
                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`確定刪除活動「${activity.name}」？`)) deleteActivity(id); }}>
                    🗑 刪除
                </button>
            </div>

            <div className="editor-section">
                <h3>基本資料</h3>
                <div className="form-group">
                    <label>名稱</label>
                    <input
                        className="form-input"
                        value={activity.name}
                        onChange={(e) => updateActivity(id, { name: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>基礎權重</label>
                    <p className="form-hint">影響角色在可用活動中選到此活動的機率。</p>
                    <div className="personality-slider">
                        <input
                            type="range" min="0" max="100"
                            value={activity.baseWeight}
                            onChange={(e) => updateActivity(id, { baseWeight: Number(e.target.value) })}
                        />
                        <span className="trait-value">{activity.baseWeight}</span>
                    </div>
                </div>
                <div className="form-group">
                    <label>心情效果</label>
                    <div className="personality-slider">
                        <input
                            type="range" min="-50" max="50"
                            value={activity.effect.mood ?? 0}
                            onChange={(e) => updateActivity(id, { effect: { ...activity.effect, mood: Number(e.target.value) } })}
                        />
                        <span className="trait-value">{activity.effect.mood ?? 0}</span>
                    </div>
                </div>
                <div className="form-group">
                    <label>精力效果</label>
                    <div className="personality-slider">
                        <input
                            type="range" min="-50" max="50"
                            value={activity.effect.energy ?? 0}
                            onChange={(e) => updateActivity(id, { effect: { ...activity.effect, energy: Number(e.target.value) } })}
                        />
                        <span className="trait-value">{activity.effect.energy ?? 0}</span>
                    </div>
                </div>
            </div>

            <PersonalityAffinityEditor
                affinity={affinity}
                onChange={(updated) => updateActivity(id, { personalityAffinity: updated })}
            />

            <div className="editor-section">
                <h3>可能引出的話題</h3>
                <p className="form-hint">活動事件或共同活動事件可能抽到的話題素材。</p>
                <div className="chip-container">
                    {topics.map((topic) => {
                        const isSelected = activity.topicIds.includes(topic.id);
                        return (
                            <span
                                key={topic.id}
                                className={`chip ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                    const newIds = isSelected
                                        ? activity.topicIds.filter((tid) => tid !== topic.id)
                                        : [...activity.topicIds, topic.id];
                                    updateActivity(id, { topicIds: newIds });
                                }}
                            >
                                {topic.name}
                            </span>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// ===== Topic Editor =====
function TopicEditor({ id }: { id: string }) {
    const topic = useWorldStore((s) => s.topics.find((t) => t.id === id));
    const updateTopic = useWorldStore((s) => s.updateTopic);
    const deleteTopic = useWorldStore((s) => s.deleteTopic);

    if (!topic) return <div className="editor-empty">話題不存在</div>;

    const affinity = topic.personalityAffinity ?? defaultPersonalityAffinity();

    return (
        <>
            <div className="editor-header">
                <h2>💬 {topic.name}</h2>
                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`確定刪除話題「${topic.name}」？`)) deleteTopic(id); }}>
                    🗑 刪除
                </button>
            </div>

            <div className="editor-section">
                <h3>基本資料</h3>
                <div className="form-group">
                    <label>名稱</label>
                    <input
                        className="form-input"
                        value={topic.name}
                        onChange={(e) => updateTopic(id, { name: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>分類</label>
                    <input
                        className="form-input"
                        value={topic.category}
                        onChange={(e) => updateTopic(id, { category: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>情緒傾向</label>
                    <select
                        className="form-select"
                        value={topic.moodTone}
                        onChange={(e) => updateTopic(id, { moodTone: e.target.value as 'positive' | 'neutral' | 'negative' })}
                    >
                        <option value="positive">😊 正面</option>
                        <option value="neutral">😐 中性</option>
                        <option value="negative">😟 負面</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>出現權重</label>
                    <p className="form-hint">影響此話題在活動或交談事件中被抽到的機率。</p>
                    <div className="personality-slider">
                        <input
                            type="range" min="0" max="100"
                            value={topic.baseWeight}
                            onChange={(e) => updateTopic(id, { baseWeight: Number(e.target.value) })}
                        />
                        <span className="trait-value">{topic.baseWeight}</span>
                    </div>
                </div>
            </div>

            <PersonalityAffinityEditor
                affinity={affinity}
                onChange={(updated) => updateTopic(id, { personalityAffinity: updated })}
            />
        </>
    );
}