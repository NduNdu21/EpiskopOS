import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css'
import Register from "./pages/Register";
import Login from "./pages/Login";
import HomePage from './pages/HomePage';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
