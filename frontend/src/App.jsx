import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Register from "./pages/Register";
import Login from "./pages/Login";
import HomePage from './pages/HomePage';
import ProtectedRoute from "./components/ProtectedRoute";
import Events from "./pages/Events";
import EventSegment from "./pages/EventSegment";
import Messages from "./pages/Messages";
import Members from './pages/Members';
import Live from "./pages/Live";
import Layout from "./components/Layout";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>
        } />
        <Route path="/events" element={
          <ProtectedRoute><Layout><Events /></Layout></ProtectedRoute>
        } />
        <Route path="/events/:id" element={
          <ProtectedRoute><Layout><EventSegment /></Layout></ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>
        } />
        <Route path="/members" element={
          <ProtectedRoute><Layout><Members /></Layout></ProtectedRoute>
        } />
        <Route path="/live" element={
          <ProtectedRoute><Layout><Live /></Layout></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;