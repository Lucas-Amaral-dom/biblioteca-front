import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Dashboard.css';
import logo from '../assets/sesi_senai_logo.png';

export default function AlunoDashboard() {
    const [userData, setUserData] = useState(null);
    const [reservas, setReservas] = useState([]);
    const [salas, setSalas] = useState([]);
    const [computadores, setComputadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedData, setSelectedData] = useState('');
    const [horarioInicio, setHorarioInicio] = useState('');
    const [horarioFim, setHorarioFim] = useState('');
    const [motivo, setMotivo] = useState('');
    const [justificativa, setJustificativa] = useState('');
    const [showNovaReservaModal, setShowNovaReservaModal] = useState(false);
    const [numeroPessoas, setNumeroPessoas] = useState(1);
    const [buscaPatrimonio, setBuscaPatrimonio] = useState('');
    const [filtroRecurso, setFiltroRecurso] = useState('todos');
    const [horariosOcupados, setHorariosOcupados] = useState([]);
    const [darkMode, setDarkMode] = useState(false);
    const [subTabReserva, setSubTabReserva] = useState('ativas');
    const [showCancelContaModal, setShowCancelContaModal] = useState(false);
    const [senhaConfirmaCancelamento, setSenhaConfirmaCancelamento] = useState('');
    const [presencaLoadingIds, setPresencaLoadingIds] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const savedMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(savedMode);
        if (savedMode) document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
    }, []);

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('darkMode', newMode);
        if (newMode) document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
    };

    const horarios = [
        '07:00', '08:00', '09:00', '10:00', '11:00',
        '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
        '18:00', '19:00', '20:00', '21:00', '22:00'
    ];

    const turnos = [
        { label: 'Manhã',  emoji: '🌤', slots: horarios.filter(h => parseInt(h) < 12) },
        { label: 'Tarde',  emoji: '☀️', slots: horarios.filter(h => parseInt(h) >= 12 && parseInt(h) < 18) },
        { label: 'Noite',  emoji: '🌙', slots: horarios.filter(h => parseInt(h) >= 18) },
    ];

    const podeCancelar = (reserva) => {
        if (reserva.status === 'PENDENTE') return true;
        if (reserva.status !== 'CONFIRMADA') return false;
        const confDate = reserva.confirmadoEm || reserva.updatedAt;
        if (!confDate) return true;
        return (new Date() - new Date(confDate)) <= 60 * 60 * 1000;
    };

    useEffect(() => {
        const userLogged = JSON.parse(localStorage.getItem('userLogged'));
        if (!userLogged) { navigate('/login'); return; }
        setUserData(userLogged);
        carregarDados();
    }, [navigate]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const recursosData = await api.getRecursos();
            setSalas(recursosData.filter(r => r.tipo === 'SALA_ESTUDO'));
            setComputadores(recursosData.filter(r => r.tipo === 'COMPUTADOR'));
            const minhasReservasData = await api.getMinhasReservas();
            setReservas(minhasReservasData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userLogged');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const cancelarConta = async () => {
        if (!senhaConfirmaCancelamento) { alert('Senha é obrigatória.'); return; }
        if (!window.confirm('Confirmar exclusão permanente da conta e todas as suas reservas?')) return;
        try {
            await api.cancelarMinhaConta(senhaConfirmaCancelamento);
            alert('Conta cancelada com sucesso.');
            handleLogout();
        } catch (error) {
            alert(error.message || 'Erro ao cancelar conta.');
        }
    };

    const abrirNovaReserva = () => {
        setSelectedItem(null);
        setSelectedData('');
        setHorarioInicio('');
        setHorarioFim('');
        setMotivo('');
        setJustificativa('');
        setNumeroPessoas(1);
        setHorariosOcupados([]);
        setShowNovaReservaModal(true);
    };

    const selecionarTipoReserva = (tipo) => {
        setShowNovaReservaModal(false);
        setActiveTab(tipo === 'sala' ? 'reservar-sala' : 'reservar-comp');
    };

    const formatTimeFromBackend = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return String(d.getHours()).padStart(2, '0') + ':00';
    };

    // Carregar horários ocupados quando recurso ou data mudar
    useEffect(() => {
        const carregarOcupados = async () => {
            if (!selectedItem || !selectedData) { setHorariosOcupados([]); return; }
            try {
                const res = await api.buscarPorDataERecurso(selectedItem.id, selectedData);
                let ocupados = [];
                res.forEach(r => {
                    if (r.status === 'CANCELADA' || r.status === 'RECUSADA') return;
                    const hInicio = parseInt(r.dataHoraInicio.substring(11, 13));
                    const hFim = parseInt(r.dataHoraFim.substring(11, 13));
                    for (let i = hInicio; i < hFim; i++) {
                        ocupados.push(String(i).padStart(2, '0') + ':00');
                    }
                });
                setHorariosOcupados(ocupados);
            } catch (error) {
                console.error('Erro ao buscar ocupados:', error);
            }
        };
        carregarOcupados();
    }, [selectedItem, selectedData]);

    // Verifica se um intervalo de horário está disponível (sem conflito)
    const verificarConflito = (inicio, fim) => {
        if (!inicio || !fim) return false;
        const hIni = parseInt(inicio);
        const hFim = parseInt(fim);
        for (let i = hIni; i < hFim; i++) {
            const slot = String(i).padStart(2, '0') + ':00';
            if (horariosOcupados.includes(slot)) return true; // há conflito
        }
        return false;
    };

    const isOcupado = (h) => horariosOcupados.includes(h);

    const handleHorarioClick = (h) => {
        if (!selectedData) { alert('Selecione uma data primeiro.'); return; }
        if (isOcupado(h)) { alert('Este horário já está ocupado.'); return; }

        if (!horarioInicio || (horarioInicio && horarioFim)) {
            setHorarioInicio(h);
            setHorarioFim('');
        } else {
            if (parseInt(h) <= parseInt(horarioInicio)) {
                setHorarioInicio(h);
                setHorarioFim('');
                return;
            }
            // Verifica conflito no intervalo selecionado
            if (verificarConflito(horarioInicio, h)) {
                alert('⚠️ Existem horários ocupados no intervalo selecionado. Por favor, escolha um intervalo diferente.');
                return;
            }
            setHorarioFim(h);
        }
    };

    const duracaoHoras = () => {
        if (!horarioInicio || !horarioFim) return 0;
        return parseInt(horarioFim) - parseInt(horarioInicio);
    };

    const fazerReserva = async () => {
        if (!selectedItem || !selectedData || !horarioInicio || !horarioFim) {
            alert('Selecione o recurso, a data e o horário.');
            return;
        }
        if (verificarConflito(horarioInicio, horarioFim)) {
            alert('⚠️ Conflito de horário detectado! Existem reservas no período selecionado.');
            return;
        }
        const tipoReservaAtual = activeTab === 'reservar-sala' ? 'sala' : 'computador';
        if (tipoReservaAtual === 'sala' && (numeroPessoas < 1 || numeroPessoas > selectedItem.capacidade)) {
            alert(`Número de pessoas inválido (máx ${selectedItem.capacidade})`);
            return;
        }
        if (duracaoHoras() > 2 && !justificativa.trim()) {
            alert('⚠️ Reservas acima de 2 horas exigem uma justificativa. Por favor, preencha o campo de justificativa.');
            return;
        }
        const dataInicio = new Date(`${selectedData}T${horarioInicio}:00`);
        const dataFim = new Date(`${selectedData}T${horarioFim}:00`);
        const motivoFinal = duracaoHoras() > 2
            ? `${motivo ? motivo + '\n' : ''}[JUSTIFICATIVA LONGA DURAÇÃO]: ${justificativa.trim()}`
            : motivo;
        try {
            await api.fazerReserva({
                recursoId: selectedItem.id,
                dataHoraInicio: dataInicio.toISOString(),
                dataHoraFim: dataFim.toISOString(),
                motivo: motivoFinal,
                numeroPessoas: tipoReservaAtual === 'sala' ? numeroPessoas : null
            });
            alert('✅ Reserva solicitada com sucesso!');
            setActiveTab('minhasreservas');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao fazer reserva.');
        }
    };

    const cancelarReserva = async (id) => {
        if (!window.confirm('Cancelar esta reserva?')) return;
        try {
            await api.cancelarReserva(id);
            alert('Reserva cancelada!');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao cancelar reserva.');
        }
    };

    const confirmarPresenca = async (id) => {
        if (!window.confirm('Confirmar sua presença nesta reserva?')) return;
        // Atualiza otimisticamente o estado local imediatamente
        setReservas(prev => prev.map(r => r.id === id ? { ...r, presencaConfirmada: true } : r));
        setPresencaLoadingIds(prev => [...prev, id]);
        try {
            await api.confirmarPresenca(id);
            carregarDados(); // sincroniza com backend em segundo plano
        } catch (error) {
            // Reverte em caso de erro
            setReservas(prev => prev.map(r => r.id === id ? { ...r, presencaConfirmada: false } : r));
            alert(error.message || 'Erro ao confirmar presença.');
        } finally {
            setPresencaLoadingIds(prev => prev.filter(i => i !== id));
        }
    };

    const handleCheckin = async (id) => {
        if (!window.confirm('Confirmar check-in?')) return;
        try {
            await api.fazerCheckin(id);
            alert('Check-in realizado!');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao fazer check-in.');
        }
    };

    const handleCheckout = async (id) => {
        if (!window.confirm('Confirmar check-out?')) return;
        try {
            await api.fazerCheckout(id);
            alert('Check-out realizado!');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao fazer check-out.');
        }
    };

    const StatusBadge = ({ reserva }) => {
        const map = {
            PENDENTE:   { cls: 'status-pendente',   label: 'Aguardando' },
            CONFIRMADA: { cls: 'status-confirmada',  label: 'Aprovada' },
            CANCELADA:  { cls: '', label: 'Cancelada', style: { color: '#c0392b', background: '#fee2e2', padding: '4px 12px', borderRadius: 40, fontSize: '0.72rem', fontWeight: 700 } },
            RECUSADA:   { cls: '', label: 'Recusada',  style: { color: '#c0392b', background: '#fee2e2', padding: '4px 12px', borderRadius: 40, fontSize: '0.72rem', fontWeight: 700 } },
        };
        const cfg = map[reserva.status] || { cls: 'status-pendente', label: reserva.status };
        return <span className={cfg.cls} style={cfg.style}>{cfg.label}</span>;
    };

    // Card de recurso interativo
    const RecursoCard = ({ recurso, tipo }) => {
        const isSelected = selectedItem?.id === recurso.id;
        const isDisponivel = recurso.status === 'DISPONIVEL';
        const icone = tipo === 'sala' ? '🏛️' : '💻';
        return (
            <div
                onClick={() => isDisponivel && setSelectedItem(recurso)}
                className="recurso-card-select"
                style={{
                    border: isSelected ? '2px solid #0d47a1' : '2px solid #e4e8ed',
                    background: isSelected ? '#e3f2fd' : isDisponivel ? '#fff' : '#f8f9fb',
                    cursor: isDisponivel ? 'pointer' : 'not-allowed',
                    borderRadius: 14,
                    padding: '16px 18px',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'all 0.18s',
                    opacity: isDisponivel ? 1 : 0.6,
                    boxShadow: isSelected ? '0 0 0 3px rgba(79,70,229,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
                    position: 'relative'
                }}
            >
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isSelected ? '#0d47a1' : '#f1f3f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', flexShrink: 0,
                    transition: 'all 0.18s'
                }}>{icone}</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? '#0a3578' : '#252d38' }}>
                        {recurso.nome}
                    </div>
                    {recurso.capacidade && (
                        <div style={{ fontSize: '0.78rem', color: '#8b95a3', marginTop: 2 }}>
                            👥 Capacidade: {recurso.capacidade} pessoas
                        </div>
                    )}
                    {recurso.codigo && (
                        <div style={{ fontSize: '0.78rem', color: '#8b95a3' }}>Patrimônio: {recurso.codigo}</div>
                    )}
                </div>
                <div style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    background: isDisponivel ? '#ecfdf5' : '#fee2e2',
                    color: isDisponivel ? '#10b981' : '#ef4444'
                }}>
                    {isDisponivel ? '● Disponível' : '● Ocupado'}
                </div>
                {isSelected && (
                    <div style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#0d47a1', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800
                    }}>✓</div>
                )}
            </div>
        );
    };

    if (loading && !userData) return (
        <div className="loading-container"><div className="spinner"></div><p>Carregando...</p></div>
    );

    const listaRecursos = activeTab === 'reservar-sala' ? salas : computadores;
    const tipoStr = activeTab === 'reservar-sala' ? 'sala' : 'computador';

    return (
        <div className="dashboard-container">
            {/* OVERLAY MOBILE */}
            <div className={`sidebar-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}></div>

            {/* TOP NAVBAR */}
            <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo-wrapper">
                        <img src={logo} alt="SESI SENAI" style={{ height: 44, objectFit: 'contain', maxWidth: 160 }} />
                    </div>
                    <button className="sidebar-close-btn" onClick={() => setMenuOpen(false)} title="Fechar menu">✕</button>
                </div>

                {/* Card do usuário — visível na sidebar mobile */}
                <div className="sidebar-user-card">
                    <div className="sidebar-user-avatar">
                        {userData?.nome?.charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{userData?.nome}</div>
                        <span className="sidebar-user-role role-aluno">🎒 Aluno</span>
                    </div>
                </div>
                <div className="sidebar-nav">
                    {[
                        ['dashboard',      '🏠 Painel'],
                        ['minhasreservas', '📋 Minhas Reservas'],
                        ['reservar-sala',  '🏛️ Reservar Sala'],
                        ['reservar-comp',  '💻 Reservar Computador']
                    ].map(([key, label]) => (
                        <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => {
                            if (key === 'reservar-sala' || key === 'reservar-comp') {
                                setSelectedItem(null); setSelectedData(''); setHorarioInicio(''); setHorarioFim(''); setMotivo(''); setHorariosOcupados([]);
                            }
                            setActiveTab(key);
                            setMenuOpen(false);
                        }}>
                            {label}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
                    <button onClick={toggleDarkMode} className="btn-icon" style={{ borderRadius: '50%', width: 36, height: 36, fontSize: '1rem', padding: 0, border: '1px solid #e4e8ed', background: 'none', cursor: 'pointer' }} title="Alternar Modo Escuro">
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    <button onClick={handleLogout} className="logout-btn">Sair</button>
                </div>
            </nav>

            {/* BOTÃO HAMBURGUER MOBILE */}
            <button className="hamburger-btn" onClick={() => setMenuOpen(prev => !prev)}>☰</button>

            {/* MAIN CONTENT */}
            <div className="main-content">
                {/* HEADER DA PÁGINA */}
                <div className="top-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h1>
                            {activeTab === 'dashboard' ? '🏠 Painel Principal'
                             : activeTab === 'minhasreservas' ? '📋 Minhas Reservas'
                             : activeTab === 'reservar-sala' ? '🏛️ Reservar Sala'
                             : '💻 Reservar Computador'}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.8rem', color: '#8b95a3' }} className="header-date">
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0d47a1' }}>
                            {userData?.nome?.split(' ')[0]}
                        </span>
                        <button onClick={() => setShowCancelContaModal(true)} className="cancel-account-btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Cancelar Conta</button>
                    </div>
                </div>

                {/* ABA: DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-number">{reservas.filter(r => r.status !== 'CANCELADA' && r.status !== 'RECUSADA').length}</div>
                                <div className="stat-label">Minhas Reservas</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">{salas.filter(s => s.status === 'DISPONIVEL').length}</div>
                                <div className="stat-label">Salas Disponíveis</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">{computadores.filter(c => c.status === 'DISPONIVEL').length}</div>
                                <div className="stat-label">Computadores Livres</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">{reservas.filter(r => r.presencaConfirmada).length}</div>
                                <div className="stat-label">Presenças Confirmadas</div>
                            </div>
                        </div>

                        <div className="welcome-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3>Bem-vindo(a), {userData?.nome?.split(' ')[0]}! 👋</h3>
                                <p>Faça sua reserva com antecedência e garanta seu espaço.</p>
                            </div>
                            <button onClick={abrirNovaReserva} style={{ background: '#fff', color: '#0d47a1', border: 'none', padding: '12px 24px', borderRadius: '9999px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                + Nova Reserva
                            </button>
                        </div>

                        {/* AÇÃO RÁPIDA: CHECK-IN DISPONÍVEL */}
                        {reservas.filter(r => r.status === 'CONFIRMADA' && r.presencaConfirmada && !r.checkedIn).length > 0 && (
                            <div className="section" style={{ border: '2px solid #0d47a1', background: 'linear-gradient(135deg, #e3f2fd 0%, #fff 100%)' }}>
                                <h2 style={{ color: '#0d47a1', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    🚪 Check-in Disponível
                                    <span style={{ background: '#0d47a1', color: '#fff', borderRadius: '9999px', fontSize: '0.72rem', padding: '2px 10px', fontWeight: 700 }}>
                                        {reservas.filter(r => r.status === 'CONFIRMADA' && r.presencaConfirmada && !r.checkedIn).length}
                                    </span>
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {reservas.filter(r => r.status === 'CONFIRMADA' && r.presencaConfirmada && !r.checkedIn).map(r => (
                                        <div key={r.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            background: '#fff', border: '1.5px solid #bbdefb', borderRadius: 12,
                                            padding: '14px 18px', gap: 12, flexWrap: 'wrap'
                                        }}>
                                            <div>
                                                <strong style={{ fontSize: '0.95rem', color: '#0a3578' }}>{r.recursoNome}</strong>
                                                <p style={{ fontSize: '0.82rem', color: '#8b95a3', marginTop: 2 }}>
                                                    📅 {new Date(r.dataHoraInicio).toLocaleDateString('pt-BR')} • ⏰ {formatTimeFromBackend(r.dataHoraInicio)} → {formatTimeFromBackend(r.dataHoraFim)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleCheckin(r.id)}
                                                style={{
                                                    background: '#0d47a1', color: '#fff', border: 'none',
                                                    padding: '10px 22px', borderRadius: '9999px',
                                                    fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                                                    boxShadow: '0 4px 12px rgba(13,71,161,0.3)', whiteSpace: 'nowrap'
                                                }}
                                            >
                                                🚪 Fazer Check-in
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AÇÃO RÁPIDA: CONFIRMAR PRESENÇA */}
                        {reservas.filter(r => r.status === 'CONFIRMADA' && !r.presencaConfirmada).length > 0 && (
                            <div className="section" style={{ border: '2px solid #f59e0b', background: 'linear-gradient(135deg, #fffbeb 0%, #fff 100%)' }}>
                                <h2 style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    ✋ Confirmação de Presença Pendente
                                    <span style={{ background: '#f59e0b', color: '#fff', borderRadius: '9999px', fontSize: '0.72rem', padding: '2px 10px', fontWeight: 700 }}>
                                        {reservas.filter(r => r.status === 'CONFIRMADA' && !r.presencaConfirmada).length}
                                    </span>
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {reservas.filter(r => r.status === 'CONFIRMADA' && !r.presencaConfirmada).map(r => (
                                        <div key={r.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            background: '#fff', border: '1.5px solid #fcd34d', borderRadius: 12,
                                            padding: '14px 18px', gap: 12, flexWrap: 'wrap'
                                        }}>
                                            <div>
                                                <strong style={{ fontSize: '0.95rem', color: '#92400e' }}>{r.recursoNome}</strong>
                                                <p style={{ fontSize: '0.82rem', color: '#8b95a3', marginTop: 2 }}>
                                                    📅 {new Date(r.dataHoraInicio).toLocaleDateString('pt-BR')} • ⏰ {formatTimeFromBackend(r.dataHoraInicio)} → {formatTimeFromBackend(r.dataHoraFim)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => confirmarPresenca(r.id)}
                                                disabled={presencaLoadingIds.includes(r.id)}
                                                style={{
                                                    background: '#f59e0b', color: '#fff', border: 'none',
                                                    padding: '10px 22px', borderRadius: '9999px',
                                                    fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                                                    opacity: presencaLoadingIds.includes(r.id) ? 0.7 : 1,
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {presencaLoadingIds.includes(r.id) ? '⏳...' : '✋ Confirmar Presença'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="section">
                            <h2>Últimas Reservas</h2>
                            {reservas.filter(r => r.status !== 'CANCELADA').slice(0, 5).map(r => (
                                <div key={r.id} className={`reserva-card ${r.presencaConfirmada ? 'presenca-confirmada' : ''}`}>
                                    <div>
                                        <strong style={{ fontSize: '0.95rem' }}>{r.recursoNome}</strong>
                                        <p style={{ fontSize: '0.82rem', color: '#8b95a3', marginTop: 4 }}>
                                            {new Date(r.dataHoraInicio).toLocaleDateString()} • {formatTimeFromBackend(r.dataHoraInicio)} às {formatTimeFromBackend(r.dataHoraFim)}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                        <StatusBadge reserva={r} />
                                        {r.checkedIn && !r.checkedOut && (
                                            <button onClick={() => handleCheckout(r.id)} className="btn-checkin" style={{ fontSize: '0.75rem', background: '#3498db' }}>Check-out</button>
                                        )}
                                        {podeCancelar(r) && (
                                            <button onClick={() => cancelarReserva(r.id)} className="btn-cancel-small" style={{ fontSize: '0.75rem' }}>Cancelar</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {reservas.filter(r => r.status !== 'CANCELADA').length === 0 && (
                                <p className="empty-message">Nenhuma reserva ativa. <button onClick={abrirNovaReserva} style={{background:'none',border:'none',color:'#0d47a1',fontWeight:700,cursor:'pointer'}}>Fazer uma agora →</button></p>
                            )}
                        </div>
                    </>
                )}

                {/* ABA: MINHAS RESERVAS */}
                {activeTab === 'minhasreservas' && (
                    <div className="section">
                        <div className="sub-tabs-container">
                            <button className={`sub-tab-btn ${subTabReserva === 'ativas' ? 'active' : ''}`} onClick={() => setSubTabReserva('ativas')}>
                                Ativas / Pendentes <span className="badge-count">{reservas.filter(r => r.status === 'PENDENTE' || r.status === 'CONFIRMADA').length}</span>
                            </button>
                            <button className={`sub-tab-btn ${subTabReserva === 'historico' ? 'active' : ''}`} onClick={() => setSubTabReserva('historico')}>
                                Histórico <span className="badge-count">{reservas.filter(r => r.status === 'CANCELADA' || r.status === 'RECUSADA' || (r.checkedIn && r.checkedOut)).length}</span>
                            </button>
                        </div>

                        {/* TABELA DESKTOP */}
                        <div className="desktop-table">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Recurso</th>
                                        <th>Data</th>
                                        <th>Horário</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reservas.filter(r =>
                                        subTabReserva === 'ativas'
                                        ? (r.status === 'PENDENTE' || r.status === 'CONFIRMADA') && !(r.checkedIn && r.checkedOut)
                                        : r.status === 'CANCELADA' || r.status === 'RECUSADA' || (r.checkedIn && r.checkedOut)
                                    ).map(r => (
                                        <tr key={r.id} style={{ opacity: r.status === 'CANCELADA' ? 0.6 : 1 }}>
                                            <td><strong>{r.recursoNome}</strong></td>
                                            <td>{new Date(r.dataHoraInicio).toLocaleDateString()}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatTimeFromBackend(r.dataHoraInicio)} às {formatTimeFromBackend(r.dataHoraFim)}</td>
                                            <td><StatusBadge reserva={r} /></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    {r.status === 'CONFIRMADA' && !r.presencaConfirmada && (
                                                        <button
                                                            onClick={() => confirmarPresenca(r.id)}
                                                            className="btn-checkin-small"
                                                            disabled={presencaLoadingIds.includes(r.id)}
                                                            style={{ background: '#e67e22', whiteSpace: 'nowrap', opacity: presencaLoadingIds.includes(r.id) ? 0.7 : 1 }}
                                                        >
                                                            {presencaLoadingIds.includes(r.id) ? '⏳...' : 'Confirmar Presença'}
                                                        </button>
                                                    )}
                                                    {r.presencaConfirmada && (
                                                        <button disabled className="btn-checkin-small" style={{ background: '#10b981', whiteSpace: 'nowrap', cursor: 'default', opacity: 1 }}>✅ Presença Confirmada</button>
                                                    )}
                                                    {r.presencaConfirmada && !r.checkedIn && (
                                                        <button onClick={() => handleCheckin(r.id)} className="btn-checkin-small">Check-in</button>
                                                    )}
                                                    {r.checkedIn && !r.checkedOut && (
                                                        <button onClick={() => handleCheckout(r.id)} className="btn-checkin-small" style={{ background: '#3498db' }}>Check-out</button>
                                                    )}
                                                    {r.checkedOut && <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700 }}>✅ Concluída</span>}
                                                    {podeCancelar(r) && r.status !== 'CANCELADA' && (
                                                        <button onClick={() => cancelarReserva(r.id)} className="btn-cancel-small">Cancelar</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {reservas.filter(r =>
                                        subTabReserva === 'ativas'
                                        ? (r.status === 'PENDENTE' || r.status === 'CONFIRMADA') && !(r.checkedIn && r.checkedOut)
                                        : r.status === 'CANCELADA' || r.status === 'RECUSADA' || (r.checkedIn && r.checkedOut)
                                    ).length === 0 && (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#8b95a3' }}>Nenhuma reserva nesta categoria.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* CARDS MOBILE */}
                        <div className="mobile-cards">
                            {reservas.filter(r =>
                                subTabReserva === 'ativas'
                                ? (r.status === 'PENDENTE' || r.status === 'CONFIRMADA') && !(r.checkedIn && r.checkedOut)
                                : r.status === 'CANCELADA' || r.status === 'RECUSADA' || (r.checkedIn && r.checkedOut)
                            ).map(r => (
                                <div key={r.id} className="reserva-card-mobile">
                                    <div className="card-header">
                                        <strong>{r.recursoNome}</strong>
                                        <StatusBadge reserva={r} />
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#636d7a' }}>{new Date(r.dataHoraInicio).toLocaleDateString()} • {formatTimeFromBackend(r.dataHoraInicio)} às {formatTimeFromBackend(r.dataHoraFim)}</p>
                                    <div className="card-actions">
                                        {r.status === 'CONFIRMADA' && !r.presencaConfirmada && (
                                            <button
                                                onClick={() => confirmarPresenca(r.id)}
                                                className="btn-checkin-mobile"
                                                disabled={presencaLoadingIds.includes(r.id)}
                                                style={{ background: '#e67e22', opacity: presencaLoadingIds.includes(r.id) ? 0.7 : 1 }}
                                            >
                                                {presencaLoadingIds.includes(r.id) ? '⏳ Confirmando...' : 'Confirmar Presença'}
                                            </button>
                                        )}
                                        {r.presencaConfirmada && (
                                            <button disabled className="btn-checkin-mobile" style={{ background: '#10b981', cursor: 'default', opacity: 1 }}>✅ Presença Confirmada</button>
                                        )}
                                        {r.presencaConfirmada && !r.checkedIn && (
                                            <button onClick={() => handleCheckin(r.id)} className="btn-checkin-mobile">Check-in</button>
                                        )}
                                        {r.checkedIn && !r.checkedOut && (
                                            <button onClick={() => handleCheckout(r.id)} className="btn-checkin-mobile" style={{ background: '#3498db' }}>Check-out</button>
                                        )}
                                        {podeCancelar(r) && r.status !== 'CANCELADA' && (
                                            <button onClick={() => cancelarReserva(r.id)} className="btn-cancel-mobile">Cancelar</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {reservas.filter(r =>
                                subTabReserva === 'ativas'
                                ? (r.status === 'PENDENTE' || r.status === 'CONFIRMADA') && !(r.checkedIn && r.checkedOut)
                                : r.status === 'CANCELADA' || r.status === 'RECUSADA' || (r.checkedIn && r.checkedOut)
                            ).length === 0 && (
                                <p style={{ textAlign: 'center', color: '#8b95a3', padding: 24 }}>Nenhuma reserva nesta categoria.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ABA: RESERVAR SALA / COMPUTADOR */}
                {(activeTab === 'reservar-sala' || activeTab === 'reservar-comp') && (
                    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                        <div className="reserva-page-container">
                            {/* COLUNA ESQUERDA: selecionar recurso */}
                            <div className="reserva-card-section">
                                <h3>
                                    {tipoStr === 'sala' ? '🏛️' : '💻'}
                                    {tipoStr === 'sala' ? ' Escolha a Sala' : ' Escolha o Computador'}
                                </h3>

                                {/* Barra de busca */}
                                <div style={{ position: 'relative', marginBottom: 16 }}>
                                    <input
                                        type="text"
                                        value={buscaPatrimonio}
                                        onChange={e => setBuscaPatrimonio(e.target.value)}
                                        placeholder="🔍 Buscar por nome ou patrimônio..."
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e4e8ed', borderRadius: 10, fontSize: '0.9rem' }}
                                    />
                                </div>

                                {/* Filtros */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                                    {['todos', 'livres', 'ocupados'].map(f => (
                                        <button key={f} onClick={() => setFiltroRecurso(f)} style={{
                                            padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                                            borderColor: filtroRecurso === f ? '#0d47a1' : '#e4e8ed',
                                            background: filtroRecurso === f ? '#e3f2fd' : '#fff',
                                            color: filtroRecurso === f ? '#0a3578' : '#636d7a',
                                            fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer'
                                        }}>
                                            {f === 'todos' ? 'Todos' : f === 'livres' ? '✅ Disponíveis' : '❌ Ocupados'}
                                        </button>
                                    ))}
                                </div>

                                {/* Lista de recursos como cards */}
                                <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                                    {listaRecursos
                                        .filter(r => {
                                            const matchBusca = !buscaPatrimonio || r.nome?.toLowerCase().includes(buscaPatrimonio.toLowerCase()) || r.codigo?.toLowerCase().includes(buscaPatrimonio.toLowerCase());
                                            const matchFiltro = filtroRecurso === 'todos' || (filtroRecurso === 'livres' && r.status === 'DISPONIVEL') || (filtroRecurso === 'ocupados' && r.status !== 'DISPONIVEL');
                                            return matchBusca && matchFiltro;
                                        })
                                        .map(r => <RecursoCard key={r.id} recurso={r} tipo={tipoStr} />)
                                    }
                                    {listaRecursos.length === 0 && (
                                        <div style={{ textAlign: 'center', color: '#8b95a3', padding: 24 }}>
                                            <p>Nenhum recurso disponível.</p>
                                            <p style={{ fontSize: '0.82rem' }}>Solicite ao administrador o cadastro de {tipoStr === 'sala' ? 'salas' : 'computadores'}.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Número de pessoas para sala */}
                                {selectedItem && tipoStr === 'sala' && (
                                    <div className="form-group" style={{ marginTop: 18 }}>
                                        <label>Número de pessoas (máx. {selectedItem.capacidade}):</label>
                                        <input type="range" min="1" max={selectedItem.capacidade} value={numeroPessoas}
                                            onChange={e => setNumeroPessoas(parseInt(e.target.value))} className="slider" />
                                        <div style={{ textAlign: 'center', marginTop: 4 }}>
                                            <span style={{ fontSize: '0.95rem', fontWeight: 700, background: '#e3f2fd', color: '#0a3578', padding: '4px 12px', borderRadius: 20 }}>
                                                {numeroPessoas} {numeroPessoas === 1 ? 'pessoa' : 'pessoas'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Motivo */}
                                <div className="form-group" style={{ marginTop: 18 }}>
                                    <label>Motivo (opcional):</label>
                                    <textarea rows="3" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Estudo para prova, reunião de grupo..."></textarea>
                                </div>

                                {/* Justificativa obrigatória para reservas > 2h */}
                                {horarioInicio && horarioFim && duracaoHoras() > 2 && (
                                    <div className="justificativa-section">
                                        <label>⚠️ Justificativa obrigatória — reserva acima de 2 horas ({duracaoHoras()}h)</label>
                                        <textarea
                                            value={justificativa}
                                            onChange={e => setJustificativa(e.target.value.slice(0, 500))}
                                            placeholder="Descreva detalhadamente o que será realizado neste período prolongado..."
                                            rows={4}
                                        />
                                        <div className="char-count">{justificativa.length}/500 caracteres</div>
                                    </div>
                                )}
                            </div>

                            {/* COLUNA DIREITA: data e horário */}
                            <div className="reserva-card-section">
                                <h3>📅 Data e Horário</h3>

                                {!selectedItem ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8b95a3' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>👈</div>
                                        <p style={{ fontWeight: 600 }}>Selecione um recurso primeiro</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-group">
                                            <label>Data da reserva:</label>
                                            <input type="date" value={selectedData}
                                                onChange={e => { setSelectedData(e.target.value); setHorarioInicio(''); setHorarioFim(''); }}
                                                min={new Date().toISOString().split('T')[0]} required />
                                        </div>

                                        {selectedData && (
                                            <div className="agenda-grid">
                                                {/* Status da seleção */}
                                                <div style={{
                                                    background: horarioInicio && horarioFim
                                                        ? verificarConflito(horarioInicio, horarioFim) ? '#fee2e2' : '#ecfdf5'
                                                        : '#f1f3f6',
                                                    borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                                                    fontSize: '0.9rem', fontWeight: 700, textAlign: 'center',
                                                    border: '1.5px solid',
                                                    borderColor: horarioInicio && horarioFim
                                                        ? verificarConflito(horarioInicio, horarioFim) ? '#ef4444' : '#10b981'
                                                        : '#e4e8ed',
                                                    color: horarioInicio && horarioFim
                                                        ? verificarConflito(horarioInicio, horarioFim) ? '#ef4444' : '#10b981'
                                                        : '#636d7a'
                                                }}>
                                                    {!horarioInicio
                                                        ? '⏰ Clique no horário de início'
                                                        : !horarioFim
                                                        ? `⏩ Início: ${horarioInicio} — clique no fim`
                                                        : verificarConflito(horarioInicio, horarioFim)
                                                        ? `⚠️ Conflito no intervalo ${horarioInicio}–${horarioFim}!`
                                                        : `✅ ${horarioInicio} → ${horarioFim} (${duracaoHoras()}h)`
                                                    }
                                                </div>

                                                {/* Legenda */}
                                                <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#636d7a' }}>
                                                        <span style={{ width: 12, height: 12, borderRadius: 3, background: '#e3f2fd', border: '1.5px solid #0d47a1', display: 'inline-block' }}></span> Disponível
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#636d7a' }}>
                                                        <span style={{ width: 12, height: 12, borderRadius: 3, background: '#0d47a1', display: 'inline-block' }}></span> Selecionado
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#636d7a' }}>
                                                        <span style={{ width: 12, height: 12, borderRadius: 3, background: '#fee2e2', border: '1.5px solid #ef4444', display: 'inline-block' }}></span> Ocupado
                                                    </span>
                                                </div>

                                                {turnos.map(turno => (
                                                    <div key={turno.label} style={{ marginBottom: 18 }}>
                                                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#8b95a3', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            {turno.emoji} {turno.label}
                                                        </p>
                                                        <div className="horarios-grid">
                                                            {turno.slots.map(h => {
                                                                const eInicio = h === horarioInicio;
                                                                const eFim = h === horarioFim;
                                                                const noIntervalo = horarioInicio && horarioFim &&
                                                                    parseInt(h) >= parseInt(horarioInicio) &&
                                                                    parseInt(h) < parseInt(horarioFim);
                                                                const marcado = eInicio || eFim || noIntervalo;
                                                                const ocupado = isOcupado(h);

                                                                return (
                                                                    <button key={h}
                                                                        className={`horario-btn ${marcado ? 'selecionado' : ''} ${ocupado ? 'ocupado' : ''}`}
                                                                        onClick={() => handleHorarioClick(h)}
                                                                        disabled={ocupado}
                                                                        title={ocupado ? 'Horário ocupado' : `Selecionar ${h}`}
                                                                    >
                                                                        <span style={{ fontWeight: 700 }}>{h}</span>
                                                                        {ocupado && <span style={{ display: 'block', fontSize: '0.6rem' }}>Ocupado</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                <button
                                    onClick={fazerReserva}
                                    className="btn-save"
                                    disabled={!selectedItem || !horarioInicio || !horarioFim || verificarConflito(horarioInicio, horarioFim)}
                                    style={{ marginTop: 24, fontSize: '1rem', padding: '14px', borderRadius: '9999px' }}
                                >
                                    {!selectedItem ? 'Selecione um recurso' : !horarioFim ? 'Selecione o horário' : verificarConflito(horarioInicio, horarioFim) ? '⚠️ Conflito detectado' : '✅ Confirmar Reserva'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL CANCELAR CONTA */}
            {showCancelContaModal && (
                <div className="modal">
                    <div className="modal-content" style={{ maxWidth: 440 }}>
                        <h2 style={{ color: '#ef4444', marginBottom: 12 }}>⚠️ Cancelar Conta</h2>
                        <p style={{ marginBottom: 20 }}>Confirme sua senha para cancelar sua conta permanentemente.</p>
                        <div className="form-group">
                            <label>Senha:</label>
                            <input type="password" value={senhaConfirmaCancelamento}
                                onChange={e => setSenhaConfirmaCancelamento(e.target.value)}
                                placeholder="Sua senha" />
                        </div>
                        <div className="modal-buttons">
                            <button onClick={cancelarConta} disabled={!senhaConfirmaCancelamento}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 30, cursor: 'pointer', fontWeight: 700 }}>
                                Excluir minha conta
                            </button>
                            <button onClick={() => setShowCancelContaModal(false)} className="btn-cancel">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Selecionar Tipo de Nova Reserva */}
            {showNovaReservaModal && (
                <div className="nova-reserva-modal-overlay" onClick={() => setShowNovaReservaModal(false)}>
                    <div className="nova-reserva-modal" onClick={e => e.stopPropagation()}>
                        <h2>📋 Nova Reserva</h2>
                        <p>Selecione o tipo de recurso que deseja reservar</p>
                        <div className="nova-reserva-choices">
                            <button className="nova-reserva-card" onClick={() => selecionarTipoReserva('sala')}>
                                <span className="card-icon">🏛️</span>
                                <span className="card-label">Sala de Estudo</span>
                                <span className="card-desc">Salas para grupos, aulas e reuniões</span>
                            </button>
                            <button className="nova-reserva-card" onClick={() => selecionarTipoReserva('computador')}>
                                <span className="card-icon">💻</span>
                                <span className="card-label">Computador</span>
                                <span className="card-desc">Estações individuais de trabalho</span>
                            </button>
                        </div>
                        <button className="nova-reserva-modal-close" onClick={() => setShowNovaReservaModal(false)}>✕ Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
}