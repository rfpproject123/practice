import './style2.css';

function App() {

  const goHome = () => {
    window.location.href = "/home.html";
  };

  return (
    <div style={{ backgroundColor: "rgb(36,36,35)", minHeight: "100vh" }}>
      <nav className="modern-navbar">
        <ul>
          <li><a onClick={goHome}>Home</a></li>
          <li><a>Table</a></li>
          <li><a>Ready</a></li>
          <li><a>Cleaning</a></li>
          <li><a>Payment</a></li>
          <li><a>Analysis</a></li>
          <li><a>Dashboard</a></li>
          <li style={{ marginTop: "300px" }}><a>Log out</a></li>
        </ul>
      </nav>
    </div>
  );
}

export default App;
