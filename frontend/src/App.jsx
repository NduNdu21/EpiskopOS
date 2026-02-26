import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './index.css'
import './App.css'
import Register from "./pages/Register";

function App() {

  return (
    <BrowserRouter>
      <div className="flex bg-gradient-to-b from-dark-teal to-ash-grey">
        <h1 className="text-beige">EpiskopOS</h1>
      </div>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
