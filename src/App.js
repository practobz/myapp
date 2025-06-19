import './App.css';

function App() {
  return (
    <div className="App" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }}>
      <div style={{
        background: "#fff",
        borderRadius: "16px",
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        padding: "48px 32px",
        textAlign: "center",
        maxWidth: "400px"
      }}>
        <h1 style={{
          color: "#764ba2",
          marginBottom: "16px",
          fontSize: "2.5rem"
        }}>Hello, World Version 2</h1>
        <p style={{
          color: "#333",
          fontSize: "1.2rem"
        }}>
          Welcome to your beautiful React app.
        </p>
      </div>
    </div>
  );
}

export default App;
