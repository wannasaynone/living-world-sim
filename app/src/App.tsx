import { useRef } from 'react';
import './App.css';
import { useWorldStore } from './store/world-store';
import { LeftPanel } from './components/LeftPanel';
import { CenterPanel } from './components/CenterPanel';
import { RightPanel } from './components/RightPanel';

function App() {
  const worldName = useWorldStore((s) => s.worldName);
  const exportWorld = useWorldStore((s) => s.exportWorld);
  const importWorld = useWorldStore((s) => s.importWorld);
  const resetToSeed = useWorldStore((s) => s.resetToSeed);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportWorld();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'living-world-save.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const success = importWorld(text);
      if (!success) {
        alert('匯入失敗：檔案格式不正確');
      }
    };
    reader.readAsText(file);
    // Reset so same file can be imported again
    e.target.value = '';
  };

  return (
    <div className="app-container">
      <div className="top-bar">
        <h1>🌍 {worldName}</h1>
        <div className="top-bar-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            📤 匯出
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleImport}>
            📥 匯入
          </button>
          <button className="btn btn-secondary btn-sm" onClick={resetToSeed}>
            🔄 重置
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>
      <div className="main-content">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
    </div>
  );
}

export default App;