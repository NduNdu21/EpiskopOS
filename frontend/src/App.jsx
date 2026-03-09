import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css'
import Register from "./pages/Register";
import Login from "./pages/Login";
import HomePage from './pages/HomePage';
import ProtectedRoute from "./components/ProtectedRoute";

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute><HomePage /></ProtectedRoute>
        } />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
