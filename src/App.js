import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import AlunoDashboard from './components/DashBoardDoAluno';
import ProfessorDashboard from './components/ProfessorDashBoard';
import AdminDashboard from './components/DashBoardDoAdmin';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Cadastro />} />
                <Route path="/aluno/dashboard" element={<AlunoDashboard />} />
                <Route path="/professor/dashboard" element={<ProfessorDashboard />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/" element={<Login />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;