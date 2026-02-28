import { useState } from 'react';

function DebugTestPage() {
  const [fileName, setFileName] = useState('');

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Debug Test Page</h1>

      <button
        style={{ backgroundColor: 'blue', color: 'white', padding: '15px 30px', fontSize: 18, border: 'none', cursor: 'pointer', marginBottom: 20, display: 'block' }}
        onClick={() => alert('Working!')}
      >
        Test Click
      </button>

      <button
        style={{ padding: '15px 30px', fontSize: 18, cursor: 'pointer', marginBottom: 20, display: 'block' }}
        onClick={() => window.prompt('Link:', window.location.href)}
      >
        Test Share
      </button>

      <input
        type="file"
        accept="image/*"
        style={{ fontSize: 16, marginBottom: 10, display: 'block' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setFileName(file.name);
          const reader = new FileReader();
          reader.onload = () => {
            console.log('Base64 result:', (reader.result as string).substring(0, 100) + '...');
            alert('File conversion successful');
          };
          reader.onerror = () => alert('Error: ' + reader.error?.message);
          reader.readAsDataURL(file);
        }}
      />
      {fileName && <p>Selected: {fileName}</p>}
    </div>
  );
}

export default DebugTestPage;
