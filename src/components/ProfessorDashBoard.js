import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Dashboard.css';
import logo from '../assets/sesi_senai_logo.png';

export default function ProfessorDashboard() {
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
    const [horariosOcupados, setHorariosOcupados] = useState([]);
    const [darkMode, setDarkMode] = useState(false);
    const [subTabReserva, setSubTabReserva] = useState('ativas');
    const [buscaPatrimonio, setBuscaPatrimonio] = useState('');
    const [filtroRecurso, setFiltroRecurso] = useState('todos');
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

    const podeCancelar = (reserva) => {
        if (reserva.status === 'PENDENTE') return true;
        if (reserva.status !== 'CONFIRMADA') return false;
        const confDate = reserva.confirmadoEm || reserva.updatedAt;
        if (!confDate) return true;
        return (new Date() - new Date(confDate)) <= 60 * 60 * 1000;
    };

    useEffect(() => {
        const userLogged = JSON.parse(localStorage.getItem('userLogged'));
        if (!userLogged || userLogged.tipoUsuario !== 'PROFESSOR') {
            navigate('/login');
            return;
        }
        setUserData(userLogged);
        carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            if (error.message.includes('403')) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userLogged');
        localStorage.removeItem('token');
        navigate('/login');
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

    useEffect(() => {
        const carregarOcupados = async () => {
            if (!selectedItem || !selectedData) {
                setHorariosOcupados([]);
                return;
            }
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

    const isOcupado = (h) => horariosOcupados.includes(h);

    const verificarConflito = (inicio, fim) => {
        if (!inicio || !fim) return false;
        const hIni = parseInt(inicio);
        const hFim = parseInt(fim);
        for (let i = hIni; i < hFim; i++) {
            const slot = String(i).padStart(2, '0') + ':00';
            if (horariosOcupados.includes(slot)) return true;
        }
        return false;
    };

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
            setHorarioFim(h);
        }
    };

    const duracaoHoras = () => {
        if (!horarioInicio || !horarioFim) return 0;
        return parseInt(horarioFim) - parseInt(horarioInicio);
    };

    const turnos = [
        { label: 'Manhã',  emoji: '🌅', slots: ['07:00', '08:00', '09:00', '10:00', '11:00'] },
        { label: 'Tarde',  emoji: '☀️', slots: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'] },
        { label: 'Noite',  emoji: '🌙', slots: ['18:00', '19:00', '20:00', '21:00', '22:00'] },
    ];

    const formatTimeFromBackend = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return String(d.getHours()).padStart(2, '0') + ':00';
    };

    const fazerReserva = async () => {
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

    const StatusBadge = ({ reserva }) => {
        const map = {
            PENDENTE:   { cls: 'status-pendente',  label: 'Aguardando' },
            CONFIRMADA: { cls: 'status-confirmada', label: 'Aprovada' },
            CANCELADA:  { cls: '', label: 'Cancelada', style: { color: '#c0392b', background: '#fee2e2', padding: '4px 12px', borderRadius: 40, fontSize: '0.72rem', fontWeight: 700 } },
            RECUSADA:   { cls: '', label: 'Recusada',  style: { color: '#c0392b', background: '#fee2e2', padding: '4px 12px', borderRadius: 40, fontSize: '0.72rem', fontWeight: 700 } },
        };
        const cfg = map[reserva.status] || { cls: 'status-pendente', label: reserva.status };
        return <span className={cfg.cls} style={cfg.style}>{cfg.label}</span>;
    };

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
                    borderRadius: 14, padding: '16px 18px', marginBottom: 10,
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'all 0.18s', opacity: isDisponivel ? 1 : 0.6,
                    boxShadow: isSelected ? '0 0 0 3px rgba(79,70,229,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
                    position: 'relative'
                }}
            >
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isSelected ? '#0d47a1' : '#f1f3f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', flexShrink: 0, transition: 'all 0.18s'
                }}>{icone}</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? '#0a3578' : '#252d38' }}>{recurso.nome}</div>
                    {recurso.capacidade && <div style={{ fontSize: '0.78rem', color: '#8b95a3', marginTop: 2 }}>👥 Capacidade: {recurso.capacidade} pessoas</div>}
                    {recurso.codigo && <div style={{ fontSize: '0.78rem', color: '#8b95a3' }}>Patrimônio: {recurso.codigo}</div>}
                </div>
                <div style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    background: isDisponivel ? '#ecfdf5' : '#fee2e2',
                    color: isDisponivel ? '#10b981' : '#ef4444'
                }}>{isDisponivel ? '● Disponível' : '● Ocupado'}</div>
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

    // filtro de reservas para sub-abas
    const filtrarReservas = (lista) => lista.filter(r =>
        subTabReserva === 'ativas'
            ? (r.status === 'PENDENTE' || r.status === 'CONFIRMADA') && !(r.checkedIn && r.checkedOut)
            : r.status === 'CANCELADA' || r.status === 'RECUSADA' || (r.checkedIn && r.checkedOut)
    );

    return (
        <div className="dashboard-container">
            <div className={`sidebar-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}></div>
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
                        <span className="sidebar-user-role role-professor">🎓 Professor</span>
                    </div>
                </div>
                <div className="sidebar-nav">
                    {[
                        ['dashboard',      '🏠 Painel Principal'],
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

            <div className="main-content">
                <div className="top-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <h1>Painel do Professor</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <button onClick={toggleDarkMode} className="btn-icon" style={{ borderRadius: '50%', width: 40, height: 40, fontSize: '1.2rem', padding: 0 }} title="Alternar Modo Escuro">
                            {darkMode ? '☀️' : '🌙'}
                        </button>
                        <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }} className="header-date">
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* ABA: DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2>Painel Principal</h2>
                            <button onClick={abrirNovaReserva} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                + Nova Reserva
                            </button>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-card"><div className="stat-number">{reservas.filter(r => r.status !== 'CANCELADA' && r.status !== 'RECUSADA').length}</div><div className="stat-label">Minhas Reservas</div></div>
                            <div className="stat-card"><div className="stat-number">{salas.filter(s => s.status === 'DISPONIVEL').length}</div><div className="stat-label">Salas Disponíveis</div></div>
                            <div className="stat-card"><div className="stat-number">{computadores.filter(c => c.status === 'DISPONIVEL').length}</div><div className="stat-label">Computadores Livres</div></div>
                        </div>
                        <div className="section">
                            <h2>Últimas Reservas</h2>
                            {reservas.filter(r => r.status !== 'CANCELADA').slice(0, 4).map(r => (
                                <div key={r.id} className="reserva-card">
                                    <div>
                                        <strong style={{ fontSize: '0.95rem' }}>{r.recursoNome}</strong>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 4 }}>
                                            {new Date(r.dataHoraInicio).toLocaleDateString()} · {formatTimeFromBackend(r.dataHoraInicio)} às {formatTimeFromBackend(r.dataHoraFim)}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                        <StatusBadge reserva={r} />
                                    </div>
                                </div>
                            ))}
                            {reservas.filter(r => r.status !== 'CANCELADA').length === 0 && (
                                <p className="empty-message">Nenhuma reserva ativa. <button onClick={abrirNovaReserva} style={{ background: 'none', border: 'none', color: '#0d47a1', fontWeight: 700, cursor: 'pointer' }}>Fazer uma agora →</button></p>
                            )}
                        </div>
                    </>
                )}

                {/* ABA: MINHAS RESERVAS */}
                {activeTab === 'minhasreservas' && (
                    <div className="section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2>Minhas Reservas</h2>
                        </div>

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
                                    {filtrarReservas(reservas).map(r => (
                                        <tr key={r.id} style={{ opacity: r.status === 'CANCELADA' ? 0.6 : 1 }}>
                                            <td><strong>{r.recursoNome}</strong></td>
                                            <td>{new Date(r.dataHoraInicio).toLocaleDateString()}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatTimeFromBackend(r.dataHoraInicio)} às {formatTimeFromBackend(r.dataHoraFim)}</td>
                                            <td><StatusBadge reserva={r} /></td>
                                            <td>
                                                {podeCancelar(r) && r.status !== 'CANCELADA' && (
                                                    <button onClick={() => cancelarReserva(r.id)} className="btn-cancel-small" style={{ fontSize: '0.75rem' }}>Cancelar</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filtrarReservas(reservas).length === 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>Nenhuma reserva encontrada nesta aba.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* CARDS MOBILE */}
                        <div className="mobile-cards">
                            {filtrarReservas(reservas).map(r => (
                                <div key={r.id} className="reserva-card-mobile">
                                    <div className="card-header">
                                        <strong>{r.recursoNome}</strong>
                                        <StatusBadge reserva={r} />
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#636d7a' }}>
                                        {new Date(r.dataHoraInicio).toLocaleDateString()} • {formatTimeFromBackend(r.dataHoraInicio)} às {formatTimeFromBackend(r.dataHoraFim)}
                                    </p>
                                    <div className="card-actions">
                                        {podeCancelar(r) && r.status !== 'CANCELADA' && (
                                            <button onClick={() => cancelarReserva(r.id)} className="btn-cancel-mobile">Cancelar</button>
                                        )}
                                        {(r.status === 'CANCELADA' || r.status === 'RECUSADA') && (
                                            <span style={{ fontSize: '0.82rem', color: '#8b95a3' }}>Reserva encerrada</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filtrarReservas(reservas).length === 0 && (
                                <p style={{ textAlign: 'center', color: '#8b95a3', padding: 24 }}>Nenhuma reserva nesta categoria.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ABA: RESERVAR SALA / COMPUTADOR */}
                {(activeTab === 'reservar-sala' || activeTab === 'reservar-comp') && (
                    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                        <div className="reserva-page-container">
                            {/* COLUNA ESQUERDA */}
                            <div className="reserva-card-section">
                                <h3>{activeTab === 'reservar-sala' ? '🏛️ Escolha a Sala' : '💻 Escolha o Computador'}</h3>

                                {/* Busca */}
                                <div style={{ position: 'relative', marginBottom: 14 }}>
                                    <input
                                        type="text"
                                        value={buscaPatrimonio}
                                        onChange={e => setBuscaPatrimonio(e.target.value)}
                                        placeholder="🔍 Buscar por nome ou patrimônio..."
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e4e8ed', borderRadius: 10, fontSize: '0.9rem' }}
                                    />
                                </div>

                                {/* Filtros */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
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

                                {/* Cards de recursos */}
                                <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                                    {(activeTab === 'reservar-sala' ? salas : computadores)
                                        .filter(r => {
                                            const matchBusca = !buscaPatrimonio || r.nome?.toLowerCase().includes(buscaPatrimonio.toLowerCase()) || r.codigo?.toLowerCase().includes(buscaPatrimonio.toLowerCase());
                                            const matchFiltro = filtroRecurso === 'todos' || (filtroRecurso === 'livres' && r.status === 'DISPONIVEL') || (filtroRecurso === 'ocupados' && r.status !== 'DISPONIVEL');
                                            return matchBusca && matchFiltro;
                                        })
                                        .map(r => <RecursoCard key={r.id} recurso={r} tipo={activeTab === 'reservar-sala' ? 'sala' : 'computador'} />)
                                    }
                                </div>

                                {/* Número de pessoas para sala */}
                                {selectedItem && activeTab === 'reservar-sala' && (
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
                                    <textarea rows="3" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Aula, reunião de professores..."></textarea>
                                </div>

                                {/* Justificativa obrigatória para reservas > 2h */}
                                {horarioInicio && horarioFim && duracaoHoras() > 2 && (
                                    <div className="justificativa-section">
                                        <label>⚠️ Justificativa obrigatória — reserva acima de 2 horas ({duracaoHoras()}h)</label>
                                        <textarea
                                            value={justificativa}
                                            onChange={e => setJustificativa(e.target.value.slice(0, 500))}
                                            placeholder="Descreva o objetivo desta reserva prolongada (aula, workshop, evento...)"
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
