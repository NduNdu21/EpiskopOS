import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './index.css'
import './App.css'
import Register from "./pages/Register";
import Login from "./pages/Login";

function App() {

  return (
    <BrowserRouter>
      <div className="flex bg-gradient-to-b from-dark-teal to-ash-grey">
        <h1 className="text-beige">EpiskopOS</h1>
      </div>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
