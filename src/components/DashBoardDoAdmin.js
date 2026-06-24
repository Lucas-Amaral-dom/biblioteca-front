import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Dashboard.css';
import logo from '../assets/sesi_senai_logo.png';

export default function AdminDashboard() {
    const [userData, setUserData] = useState(null);
    const [reservas, setReservas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [salas, setSalas] = useState([]);
    const [computadores, setComputadores] = useState([]);
    const [stats, setStats] = useState({ totalReservas: 0, usuariosAtivos: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [menuOpen, setMenuOpen] = useState(false);
    const [modalUser, setModalUser] = useState(null);
    const [modalRecurso, setModalRecurso] = useState(null);
    const [isEditingRecurso, setIsEditingRecurso] = useState(false);

    // Estados para Reservas
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedData, setSelectedData] = useState('');
    const [horarioInicio, setHorarioInicio] = useState('');
    const [horarioFim, setHorarioFim] = useState('');
    const [motivo, setMotivo] = useState('');
    const [numeroPessoas, setNumeroPessoas] = useState(1);
    const [reservaUsuarioId, setReservaUsuarioId] = useState('');
    const [horariosOcupados, setHorariosOcupados] = useState([]);
    const [buscaUsuario, setBuscaUsuario] = useState('');
    const [buscaReserva, setBuscaReserva] = useState('');
    const [buscaPatrimonio, setBuscaPatrimonio] = useState('');
    const [filtroRecurso, setFiltroRecurso] = useState('todos');
    const [filtroGerencia, setFiltroGerencia] = useState({ tipo: 'mes', valor: new Date().toISOString().substring(0, 7) });
    const [darkMode, setDarkMode] = useState(false);
    const [subTabReserva, setSubTabReserva] = useState('pendentes');
    const [showNovaReservaModal, setShowNovaReservaModal] = useState(false);
    const [justificativa, setJustificativa] = useState('');

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

    const turnos = [
        { label: 'Manhã', emoji: '🌅', slots: ['07:00', '08:00', '09:00', '10:00', '11:00'] },
        { label: 'Tarde', emoji: '☀️', slots: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'] },
        { label: 'Noite', emoji: '🌙', slots: ['18:00', '19:00', '20:00', '21:00', '22:00'] },
    ];

    const gerenciaStats = React.useMemo(() => {
        let reservasFiltradas = [];
        let usuariosFiltrados = [];

        if (filtroGerencia.tipo === 'mes' && filtroGerencia.valor) {
            const [ano, mes] = filtroGerencia.valor.split('-');
            reservasFiltradas = reservas.filter(r => {
                const d = new Date(r.dataHoraInicio);
                return d.getFullYear() === parseInt(ano) && (d.getMonth() + 1) === parseInt(mes);
            });
            usuariosFiltrados = usuarios.filter(u => {
                if (!u.createdAt) return true;
                const d = new Date(u.createdAt);
                return d.getFullYear() === parseInt(ano) && (d.getMonth() + 1) === parseInt(mes);
            });
        } else if (filtroGerencia.tipo === 'dia' && filtroGerencia.valor) {
            reservasFiltradas = reservas.filter(r => r.dataHoraInicio && r.dataHoraInicio.startsWith(filtroGerencia.valor));
            usuariosFiltrados = usuarios.filter(u => u.createdAt && u.createdAt.startsWith(filtroGerencia.valor));
        } else {
            reservasFiltradas = reservas;
            usuariosFiltrados = usuarios;
        }

        const mapRecursos = {};
        reservasFiltradas.forEach(r => {
            if (r.status !== 'CANCELADA' && r.status !== 'RECUSADA') {
                mapRecursos[r.recursoNome] = (mapRecursos[r.recursoNome] || 0) + 1;
            }
        });

        // Gráfico de linha do tempo para reservas (por dia se mes/total, por hora se dia)
        const timelineReservas = {};
        const timelineUsuarios = {};

        if (filtroGerencia.tipo === 'mes' && filtroGerencia.valor) {
            const [ano, mes] = filtroGerencia.valor.split('-');
            const diasNoMes = new Date(parseInt(ano), parseInt(mes), 0).getDate();
            for (let d = 1; d <= diasNoMes; d++) {
                timelineReservas[d] = 0;
                timelineUsuarios[d] = 0;
            }
            reservasFiltradas.forEach(r => {
                const d = new Date(r.dataHoraInicio).getDate();
                if (timelineReservas[d] !== undefined) timelineReservas[d]++;
            });
            usuariosFiltrados.forEach(u => {
                if (!u.createdAt) return;
                const d = new Date(u.createdAt).getDate();
                if (timelineUsuarios[d] !== undefined) timelineUsuarios[d]++;
            });
        } else if (filtroGerencia.tipo === 'dia' && filtroGerencia.valor) {
            for (let h = 7; h <= 22; h++) timelineReservas[h] = 0;
            reservasFiltradas.forEach(r => {
                const h = new Date(r.dataHoraInicio).getHours();
                if (timelineReservas[h] !== undefined) timelineReservas[h]++;
            });
        } else {
            // Total: agrupa por mês do ano atual
            const anoAtual = new Date().getFullYear();
            const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            meses.forEach((m, i) => { timelineReservas[m] = 0; timelineUsuarios[m] = 0; });
            reservasFiltradas.forEach(r => {
                const d = new Date(r.dataHoraInicio);
                if (d.getFullYear() === anoAtual) {
                    const label = meses[d.getMonth()];
                    timelineReservas[label]++;
                }
            });
            usuariosFiltrados.forEach(u => {
                if (!u.createdAt) return;
                const d = new Date(u.createdAt);
                if (d.getFullYear() === anoAtual) {
                    const label = meses[d.getMonth()];
                    timelineUsuarios[label]++;
                }
            });
        }

        return {
            totalReservas: reservasFiltradas.length,
            totalUsuarios: usuariosFiltrados.length,
            recursos: Object.entries(mapRecursos).sort((a, b) => b[1] - a[1]),
            timelineReservas: Object.entries(timelineReservas),
            timelineUsuarios: Object.entries(timelineUsuarios)
        };
    }, [reservas, usuarios, filtroGerencia]);

    useEffect(() => {
        const userLogged = JSON.parse(localStorage.getItem('userLogged'));
        if (!userLogged || userLogged.tipoUsuario !== 'ADMIN') {
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
            const [recursosData, reservasData, usuariosData, relatorioData] = await Promise.all([
                api.getRecursos(),
                api.getTodasReservas(),
                api.getUsuariosAtivos(),
                api.getOcupacao()
            ]);

            setSalas(recursosData.filter(r => r.tipo === 'SALA_ESTUDO'));
            setComputadores(recursosData.filter(r => r.tipo === 'COMPUTADOR'));
            setReservas(reservasData);
            setUsuarios(usuariosData);
            setStats(relatorioData);
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

    const aprovarReserva = async (id) => {
        if (!window.confirm('Aprovar esta reserva?')) return;
        try {
            await api.aprovarReserva(id);
            alert('Reserva aprovada!');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao aprovar reserva.');
        }
    };

    const recusarReserva = async (id) => {
        if (!window.confirm('Recusar esta reserva?')) return;
        try {
            await api.recusarReserva(id);
            alert('Reserva recusada.');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao recusar reserva.');
        }
    };

    const cancelarReserva = async (id) => {
        if (!window.confirm('Cancelar esta reserva?')) return;
        try {
            await api.cancelarReserva(id);
            alert('Reserva cancelada.');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao cancelar reserva.');
        }
    };

    const confirmarPresenca = async (id) => {
        if (!window.confirm('Confirmar presença nesta reserva?')) return;
        try {
            await api.confirmarPresenca(id);
            alert('Presença confirmada!');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao confirmar presença.');
        }
    };

    const abrirNovaReserva = () => {
        setReservaUsuarioId('');
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

    const isOcupado = (h) => {
        return horariosOcupados.includes(h);
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

    const fazerReservaAdmin = async () => {
        const tipoReservaAtual = activeTab === 'reservar-sala' ? 'sala' : 'computador';
        if (tipoReservaAtual === 'sala' && (numeroPessoas < 1 || numeroPessoas > selectedItem.capacidade)) {
            alert(`Número de pessoas inválido (máx ${selectedItem.capacidade})`);
            return;
        }
        // Validar justificativa quando reserva > 2h
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
                numeroPessoas: tipoReservaAtual === 'sala' ? numeroPessoas : null,
                usuarioId: reservaUsuarioId ? parseInt(reservaUsuarioId) : null
            });
            alert('Reserva solicitada com sucesso!');
            setActiveTab('reservas');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao fazer reserva.');
        }
    };

    const desativarUsuario = async (id) => {
        if (!window.confirm('Desativar este usuário? Ele não poderá mais acessar o sistema.')) return;
        try {
            await api.deletarUsuario(id);
            alert('Usuário desativado.');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao desativar usuário.');
        }
    };

    const excluirUsuarioFisicamente = async (id) => {
        if (!window.confirm('Excluir permanentemente este usuário? Isso apagará todos os seus dados e reservas.')) return;
        try {
            await api.hardDeletarUsuario(id);
            alert('Usuário excluído permanentemente.');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao excluir usuário.');
        }
    };

    const salvarEdicaoUsuario = async (e) => {
        e.preventDefault();
        try {
            await api.editarUsuario(modalUser.id, modalUser);
            alert('Usuário atualizado com sucesso.');
            setModalUser(null);
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao atualizar usuário.');
        }
    };

    const deletarRecurso = async (id) => {
        if (!window.confirm('Excluir este recurso?')) return;
        try {
            await api.deletarRecurso(id);
            alert('Recurso excluído.');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao excluir recurso.');
        }
    };

    const desativarRecurso = async (r) => {
        if (!window.confirm('Desativar este recurso?')) return;
        try {
            await api.editarRecurso(r.id, { ...r, status: 'INDISPONIVEL' });
            alert('Recurso desativado.');
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao desativar recurso.');
        }
    };

    const salvarRecurso = async (e) => {
        e.preventDefault();
        try {
            if (isEditingRecurso) {
                await api.editarRecurso(modalRecurso.id, modalRecurso);
                alert('Recurso atualizado.');
            } else {
                await api.criarRecurso(modalRecurso);
                alert('Recurso criado.');
            }
            setModalRecurso(null);
            carregarDados();
        } catch (error) {
            alert(error.message || 'Erro ao salvar recurso.');
        }
    };

    const formatTimeFromBackend = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return String(d.getHours()).padStart(2, '0') + ':00';
    };

    const StatusBadge = ({ reserva }) => {
        const map = {
            PENDENTE: { cls: 'status-pendente', label: 'Aguardando' },
            CONFIRMADA: { cls: 'status-confirmada', label: 'Aprovada' },
            CANCELADA: { cls: '', label: 'Cancelada', style: { color: '#c0392b', background: '#fee2e2', padding: '4px 12px', borderRadius: 40, fontSize: '0.72rem', fontWeight: 700 } },
        };
        const cfg = map[reserva.status] || { cls: 'status-pendente', label: reserva.status };
        return <span className={cfg.cls} style={cfg.style}>{cfg.label}</span>;
    };

    // Card de recurso interativo (igual ao do Aluno)
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

    // Verifica conflito no intervalo selecionado
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

    if (loading && !userData) return (
        <div className="loading-container"><div className="spinner"></div><p>Carregando...</p></div>
    );

    return (
        <div className="dashboard-container">
            <div className={`sidebar-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}></div>
            <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <img src={logo} alt="SESI SENAI" style={{ height: 56, objectFit: 'contain', borderRadius: 6, maxWidth: 180 }} />
                    <button className="sidebar-close-btn" onClick={() => setMenuOpen(false)} title="Fechar menu">✕</button>
                </div>
                <div className="sidebar-nav">
                    {[
                        ['dashboard', '🏠 Painel Principal'],
                        ['gerencia', '📊 Gerência Geral'],
                        ['reservar-sala', '🏛️ Reservar Sala'],
                        ['reservar-comp', '💻 Reservar Computador'],
                        ['reservas', '📋 Gerenciar Reservas'],
                        ['usuarios', '👥 Gerenciar Usuários'],
                        ['recursos', '🔧 Gerenciar Recursos']
                    ].map(([key, label]) => (
                        <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => {
                            if (key === 'reservar-sala' || key === 'reservar-comp') {
                                setSelectedItem(null); setSelectedData(''); setHorarioInicio(''); setHorarioFim(''); setMotivo(''); setJustificativa(''); setHorariosOcupados([]); setReservaUsuarioId('');
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
                        <h1>Painel Administrativo</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <button onClick={toggleDarkMode} className="btn-icon" style={{ borderRadius: '50%', width: 40, height: 40, fontSize: '1.2rem', padding: 0 }} title="Alternar Modo Escuro">
                            {darkMode ? '☀️' : '🌙'}
                        </button>
                        <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }} className="header-date">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                </div>

                {activeTab === 'dashboard' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2>Painel Principal</h2>
                            <button onClick={abrirNovaReserva} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                + Nova Reserva
                            </button>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-card"><div className="stat-number">{stats.totalReservas}</div><div className="stat-label">Total de Reservas</div></div>
                            <div className="stat-card"><div className="stat-number">{stats.reservasNoMes || 0}</div><div className="stat-label">Reservas neste mês</div></div>
                            <div className="stat-card"><div className="stat-number">{stats.usuariosAtivos}</div><div className="stat-label">Usuários Ativos</div></div>
                            <div className="stat-card"><div className="stat-number">{stats.usuariosNoMes || 0}</div><div className="stat-label">Registros neste mês</div></div>
                            <div className="stat-card"><div className="stat-number">{salas.length}</div><div className="stat-label">Salas Registradas</div></div>
                            <div className="stat-card"><div className="stat-number">{computadores.length}</div><div className="stat-label">Computadores</div></div>
                        </div>
                    </>
                )}

                {activeTab === 'gerencia' && (() => {
                    // ── helpers de gráfico SVG ──────────────────────────────────
                    const BAR_W = 600;
                    const BAR_H = 200;
                    const BAR_PAD = { top: 20, right: 16, bottom: 48, left: 40 };
                    const innerW = BAR_W - BAR_PAD.left - BAR_PAD.right;
                    const innerH = BAR_H - BAR_PAD.top - BAR_PAD.bottom;

                    const BarChart = ({ data, color, label }) => {
                        if (!data || data.length === 0) return <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '20px 0' }}>Sem dados para exibir.</p>;
                        const maxVal = Math.max(...data.map(([, v]) => v), 1);
                        const barGap = 6;
                        const barWidth = Math.max(8, (innerW - barGap * (data.length - 1)) / data.length);
                        const yTicks = [0, Math.round(maxVal / 2), maxVal];
                        return (
                            <svg viewBox={`0 0 ${BAR_W} ${BAR_H}`} style={{ width: '100%', maxWidth: BAR_W, display: 'block', margin: '0 auto' }}>
                                {/* Grade horizontal */}
                                {yTicks.map(tick => {
                                    const y = BAR_PAD.top + innerH - (tick / maxVal) * innerH;
                                    return (
                                        <g key={tick}>
                                            <line x1={BAR_PAD.left} x2={BAR_PAD.left + innerW} y1={y} y2={y}
                                                stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
                                            <text x={BAR_PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{tick}</text>
                                        </g>
                                    );
                                })}
                                {/* Barras */}
                                {data.map(([key, val], i) => {
                                    const bh = (val / maxVal) * innerH || 0;
                                    const x = BAR_PAD.left + i * (barWidth + barGap);
                                    const y = BAR_PAD.top + innerH - bh;
                                    return (
                                        <g key={key}>
                                            <rect x={x} y={y} width={barWidth} height={bh}
                                                rx="4" ry="4" fill={color} opacity="0.85" />
                                            {val > 0 && (
                                                <text x={x + barWidth / 2} y={y - 5}
                                                    textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>{val}</text>
                                            )}
                                            <text x={x + barWidth / 2} y={BAR_PAD.top + innerH + 16}
                                                textAnchor="middle" fontSize="9" fill="#64748b"
                                                style={{ fontFamily: 'inherit' }}>{String(key).length > 5 ? String(key).substring(0, 5) : key}</text>
                                        </g>
                                    );
                                })}
                                {/* Eixo X */}
                                <line x1={BAR_PAD.left} x2={BAR_PAD.left + innerW}
                                    y1={BAR_PAD.top + innerH} y2={BAR_PAD.top + innerH}
                                    stroke="#cbd5e1" strokeWidth="1.5" />
                            </svg>
                        );
                    };

                    const ResourceBarChart = ({ data, color }) => {
                        if (!data || data.length === 0) return <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '20px 0' }}>Nenhuma reserva para este período.</p>;
                        const maxVal = Math.max(...data.map(([, v]) => v), 1);
                        const CH = 40;
                        const totalH = data.length * CH + 20;
                        return (
                            <svg viewBox={`0 0 ${BAR_W} ${totalH}`} style={{ width: '100%', maxWidth: BAR_W, display: 'block', margin: '0 auto' }}>
                                {data.map(([nome, val], i) => {
                                    const bw = (val / maxVal) * (BAR_W - 180);
                                    const y = i * CH + 10;
                                    return (
                                        <g key={nome}>
                                            <text x={0} y={y + 22} fontSize="11" fill="#475569" fontWeight="600"
                                                style={{ fontFamily: 'inherit' }}>
                                                {nome.length > 18 ? nome.substring(0, 18) + '…' : nome}
                                            </text>
                                            <rect x={160} y={y + 8} width={bw} height={22}
                                                rx="4" ry="4" fill={color} opacity="0.82" />
                                            <text x={164 + bw} y={y + 22} fontSize="11" fontWeight="700" fill={color}> {val}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                        );
                    };

                    const periodoLabel = filtroGerencia.tipo === 'mes' ? 'no Mês' : filtroGerencia.tipo === 'dia' ? 'no Dia' : 'no Total';
                    const timelineLabel = filtroGerencia.tipo === 'mes' ? 'Reservas por Dia do Mês' : filtroGerencia.tipo === 'dia' ? 'Reservas por Hora' : 'Reservas por Mês (Ano Atual)';
                    const usersTimelineLabel = filtroGerencia.tipo === 'mes' ? 'Cadastros por Dia do Mês' : filtroGerencia.tipo === 'dia' ? '' : 'Cadastros por Mês (Ano Atual)';

                    return (
                        <>
                            {/* ── Cabeçalho com filtros ── */}
                            <div className="section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                                    <h2 style={{ margin: 0 }}>📊 Relatório de Gerência Geral</h2>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Filtrar por:</label>
                                        <select value={filtroGerencia.tipo} onChange={e => setFiltroGerencia({ tipo: e.target.value, valor: '' })} className="search-input" style={{ padding: '6px 12px', minWidth: 120 }}>
                                            <option value="total">Total Geral</option>
                                            <option value="mes">Mês</option>
                                            <option value="dia">Dia</option>
                                        </select>
                                        {filtroGerencia.tipo === 'mes' && (
                                            <input type="month" value={filtroGerencia.valor} onChange={e => setFiltroGerencia({ ...filtroGerencia, valor: e.target.value })} className="search-input" style={{ padding: '6px 12px' }} />
                                        )}
                                        {filtroGerencia.tipo === 'dia' && (
                                            <input type="date" value={filtroGerencia.valor} onChange={e => setFiltroGerencia({ ...filtroGerencia, valor: e.target.value })} className="search-input" style={{ padding: '6px 12px' }} />
                                        )}
                                    </div>
                                </div>

                                {/* Cards de resumo */}
                                <div className="stats-grid">
                                    <div className="stat-card" style={{ border: '2px solid var(--primary-light)' }}>
                                        <div className="stat-number">{gerenciaStats.totalUsuarios}</div>
                                        <div className="stat-label">👤 Usuários Cadastrados</div>
                                    </div>
                                    <div className="stat-card" style={{ border: '2px solid var(--primary-light)' }}>
                                        <div className="stat-number">{gerenciaStats.totalReservas}</div>
                                        <div className="stat-label">📅 Reservas Feitas</div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Gráfico de reservas ao longo do tempo ── */}
                            <div className="section" style={{ marginTop: 24 }}>
                                <h3 style={{ marginBottom: 4, fontSize: '1rem', color: 'var(--primary-dark)' }}>📈 {timelineLabel}</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 16, marginTop: 0 }}>Quantidade de reservas {periodoLabel.toLowerCase()}</p>
                                <BarChart data={gerenciaStats.timelineReservas} color="#3b82f6" label="Reservas" />
                            </div>

                            {/* ── Gráfico de cadastros de usuários ao longo do tempo ── */}
                            {filtroGerencia.tipo !== 'dia' && (
                                <div className="section" style={{ marginTop: 24 }}>
                                    <h3 style={{ marginBottom: 4, fontSize: '1rem', color: 'var(--primary-dark)' }}>👥 {usersTimelineLabel}</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 16, marginTop: 0 }}>Novos usuários registrados {periodoLabel.toLowerCase()}</p>
                                    <BarChart data={gerenciaStats.timelineUsuarios} color="#10b981" label="Usuários" />
                                </div>
                            )}

                            {/* ── Gráfico de recursos mais usados ── */}
                            <div className="section" style={{ marginTop: 24 }}>
                                <h3 style={{ marginBottom: 4, fontSize: '1rem', color: 'var(--primary-dark)' }}>🏆 Recursos Mais Reservados {periodoLabel}</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 16, marginTop: 0 }}>Ranking de salas e computadores por número de reservas</p>
                                <ResourceBarChart data={gerenciaStats.recursos} color="#8b5cf6" />

                                {/* Tabela complementar */}
                                {gerenciaStats.recursos.length > 0 && (
                                    <div className="desktop-table" style={{ marginTop: 20 }}>
                                        <table className="data-table" style={{ maxWidth: 500 }}>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Nome do Recurso</th>
                                                    <th>Qtd. Reservas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {gerenciaStats.recursos.map(([nome, qtd], i) => (
                                                    <tr key={nome}>
                                                        <td style={{ color: '#8b5cf6', fontWeight: 800 }}>{i + 1}º</td>
                                                        <td><strong>{nome}</strong></td>
                                                        <td>{qtd}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    );
                })()}

                {activeTab === 'reservas' && (
                    <div className="section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                            <h2>Gerenciar Todas as Reservas</h2>
                            <input type="text" placeholder="Buscar por recurso ou usuário..." value={buscaReserva} onChange={e => setBuscaReserva(e.target.value)} className="search-input" style={{ width: 300, maxWidth: '100%' }} />
                        </div>

                        <div className="sub-tabs-container">
                            <button className={`sub-tab-btn ${subTabReserva === 'pendentes' ? 'active' : ''}`} onClick={() => setSubTabReserva('pendentes')}>
                                Pendentes <span className="badge-count">{reservas.filter(r => r.status === 'PENDENTE').length}</span>
                            </button>
                            <button className={`sub-tab-btn ${subTabReserva === 'aprovadas' ? 'active' : ''}`} onClick={() => setSubTabReserva('aprovadas')}>
                                Aprovadas <span className="badge-count">{reservas.filter(r => r.status === 'CONFIRMADA').length}</span>
                            </button>
                            <button className={`sub-tab-btn ${subTabReserva === 'historico' ? 'active' : ''}`} onClick={() => setSubTabReserva('historico')}>
                                Histórico <span className="badge-count">{reservas.filter(r => r.status !== 'PENDENTE' && r.status !== 'CONFIRMADA').length}</span>
                            </button>
                        </div>

                        <div className="desktop-table">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Solicitante</th>
                                        <th>Recurso</th>
                                        <th>Data/Hora</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reservas.filter(r =>
                                        (subTabReserva === 'pendentes' ? r.status === 'PENDENTE' :
                                            subTabReserva === 'aprovadas' ? r.status === 'CONFIRMADA' :
                                                (r.status !== 'PENDENTE' && r.status !== 'CONFIRMADA')) &&
                                        (r.recursoNome?.toLowerCase().includes(buscaReserva.toLowerCase()) ||
                                            r.usuarioNome?.toLowerCase().includes(buscaReserva.toLowerCase()) ||
                                            r.status?.toLowerCase().includes(buscaReserva.toLowerCase()))
                                    ).map(r => (
                                        <tr key={r.id}>
                                            <td>{r.usuarioNome}</td>
                                            <td>{r.recursoNome}</td>
                                            <td>{new Date(r.dataHoraInicio).toLocaleDateString()} {formatTimeFromBackend(r.dataHoraInicio)}-{formatTimeFromBackend(r.dataHoraFim)}</td>
                                            <td><StatusBadge reserva={r} /></td>
                                            <td>
                                                {r.status === 'PENDENTE' && (
                                                    <div style={{ display: 'flex', gap: 5 }}>
                                                        <button onClick={() => aprovarReserva(r.id)} style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>Aprovar</button>
                                                        <button onClick={() => recusarReserva(r.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>Recusar</button>
                                                    </div>
                                                )}
                                                {r.status === 'CONFIRMADA' && !r.presencaConfirmada && (
                                                    <button onClick={() => confirmarPresenca(r.id)} className="btn-checkin-admin" title="Fazer check-in em nome do usuário">✓ Check-in pelo Admin</button>
                                                )}
                                                {r.presencaConfirmada && (
                                                    <button disabled style={{ marginRight: 5, background: '#27ae60', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'not-allowed', opacity: 0.8 }}>✅ Presença Confirmada</button>
                                                )}
                                                {podeCancelar(r) && r.status !== 'CANCELADA' && (
                                                    <button onClick={() => cancelarReserva(r.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>Cancelar</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {reservas.filter(r => (subTabReserva === 'pendentes' ? r.status === 'PENDENTE' : subTabReserva === 'aprovadas' ? r.status === 'CONFIRMADA' : (r.status !== 'PENDENTE' && r.status !== 'CONFIRMADA'))).length === 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>Nenhuma reserva encontrada nesta categoria.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* CARDS MOBILE — Reservas */}
                        <div className="mobile-cards">
                            {reservas.filter(r =>
                                (subTabReserva === 'pendentes' ? r.status === 'PENDENTE' :
                                    subTabReserva === 'aprovadas' ? r.status === 'CONFIRMADA' :
                                        (r.status !== 'PENDENTE' && r.status !== 'CONFIRMADA')) &&
                                (r.recursoNome?.toLowerCase().includes(buscaReserva.toLowerCase()) ||
                                    r.usuarioNome?.toLowerCase().includes(buscaReserva.toLowerCase()) ||
                                    r.status?.toLowerCase().includes(buscaReserva.toLowerCase()))
                            ).map(r => (
                                <div key={r.id} className="reserva-card-mobile">
                                    <div className="card-header">
                                        <strong>{r.recursoNome}</strong>
                                        <StatusBadge reserva={r} />
                                    </div>
                                    <p style={{ fontSize: '0.82rem', color: '#636d7a', margin: '4px 0' }}>
                                        👤 {r.usuarioNome}
                                    </p>
                                    <p style={{ fontSize: '0.82rem', color: '#636d7a', margin: '4px 0' }}>
                                        📅 {new Date(r.dataHoraInicio).toLocaleDateString()} • {formatTimeFromBackend(r.dataHoraInicio)}–{formatTimeFromBackend(r.dataHoraFim)}
                                    </p>
                                    <div className="card-actions">
                                        {r.status === 'PENDENTE' && (
                                            <>
                                                <button onClick={() => aprovarReserva(r.id)} style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Aprovar</button>
                                                <button onClick={() => recusarReserva(r.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Recusar</button>
                                            </>
                                        )}
                                        {r.status === 'CONFIRMADA' && !r.presencaConfirmada && (
                                            <button onClick={() => confirmarPresenca(r.id)} className="btn-checkin-admin" style={{ padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem' }} title="Confirmar presença em nome do usuário">✓ Check-in</button>
                                        )}
                                        {r.presencaConfirmada && (
                                            <button disabled style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'not-allowed', fontSize: '0.82rem', opacity: 0.85 }}>✅ Presença OK</button>
                                        )}
                                        {podeCancelar(r) && r.status !== 'CANCELADA' && (
                                            <button onClick={() => cancelarReserva(r.id)} className="btn-cancel-mobile">Cancelar</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {reservas.filter(r => subTabReserva === 'pendentes' ? r.status === 'PENDENTE' : subTabReserva === 'aprovadas' ? r.status === 'CONFIRMADA' : (r.status !== 'PENDENTE' && r.status !== 'CONFIRMADA')).length === 0 && (
                                <p style={{ textAlign: 'center', color: '#8b95a3', padding: 24 }}>Nenhuma reserva encontrada nesta categoria.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'usuarios' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2>Gerenciar Usuários</h2>
                            <input type="text" placeholder="Buscar por nome ou email..." value={buscaUsuario} onChange={e => setBuscaUsuario(e.target.value)} className="search-input" style={{ width: 300 }} />
                        </div>
                        <div className="desktop-table">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Tipo</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.filter(u =>
                                        u.nome?.toLowerCase().includes(buscaUsuario.toLowerCase()) ||
                                        u.email?.toLowerCase().includes(buscaUsuario.toLowerCase())
                                    ).map(u => (
                                        <tr key={u.id}>
                                            <td>{u.nome}</td>
                                            <td>{u.email}</td>
                                            <td>{u.nivelAcesso}</td>
                                            <td>
                                                {u.nivelAcesso !== 'ADMIN' && (
                                                    <>
                                                        <button onClick={() => setModalUser({ ...u })} style={{ marginRight: 5, background: '#3498db', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>Editar</button>
                                                        <button onClick={() => desativarUsuario(u.id)} style={{ marginRight: 5, background: '#f39c12', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>Desativar</button>
                                                        <button onClick={() => excluirUsuarioFisicamente(u.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>Excluir</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* CARDS MOBILE — Usuários */}
                        <div className="mobile-cards">
                            {usuarios.filter(u =>
                                u.nome?.toLowerCase().includes(buscaUsuario.toLowerCase()) ||
                                u.email?.toLowerCase().includes(buscaUsuario.toLowerCase())
                            ).map(u => (
                                <div key={u.id} className="reserva-card-mobile">
                                    <div className="card-header">
                                        <strong>{u.nome}</strong>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: u.nivelAcesso === 'ADMIN' ? '#dbeafe' : '#f0fdf4', color: u.nivelAcesso === 'ADMIN' ? '#1d4ed8' : '#15803d' }}>{u.nivelAcesso}</span>
                                    </div>
                                    <p style={{ fontSize: '0.82rem', color: '#636d7a', margin: '4px 0' }}>✉️ {u.email}</p>
                                    {u.nivelAcesso !== 'ADMIN' && (
                                        <div className="card-actions">
                                            <button onClick={() => setModalUser({ ...u })} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Editar</button>
                                            <button onClick={() => desativarUsuario(u.id)} style={{ background: '#f39c12', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Desativar</button>
                                            <button onClick={() => excluirUsuarioFisicamente(u.id)} className="btn-cancel-mobile">Excluir</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {usuarios.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#8b95a3', padding: 24 }}>Nenhum usuário encontrado.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'recursos' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Gerenciar Recursos (Salas e Computadores)</h2>
                            <button onClick={() => { setIsEditingRecurso(false); setModalRecurso({ nome: '', tipo: 'SALA_ESTUDO', capacidade: 1, status: 'DISPONIVEL' }); }} style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>+ Novo Recurso</button>
                        </div>
                        <div className="desktop-table" style={{ marginTop: 15 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Tipo</th>
                                        <th>Capacidade</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...salas, ...computadores].map(r => (
                                        <tr key={r.id}>
                                            <td>{r.nome}</td>
                                            <td>{r.tipo === 'SALA_ESTUDO' ? 'Sala' : 'Computador'}</td>
                                            <td>{r.capacidade}</td>
                                            <td>{r.status}</td>
                                            <td>
                                                <button onClick={() => { setIsEditingRecurso(true); setModalRecurso({ ...r }); }} style={{ marginRight: 5, background: '#3498db', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>Editar</button>
                                                <button onClick={() => desativarRecurso(r)} style={{ marginRight: 5, background: '#f39c12', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>Desativar</button>
                                                <button onClick={() => deletarRecurso(r.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>Excluir</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* CARDS MOBILE — Recursos */}
                        <div className="mobile-cards">
                            {[...salas, ...computadores].map(r => (
                                <div key={r.id} className="reserva-card-mobile">
                                    <div className="card-header">
                                        <strong>{r.nome}</strong>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: r.status === 'DISPONIVEL' ? '#f0fdf4' : '#fef2f2', color: r.status === 'DISPONIVEL' ? '#15803d' : '#dc2626' }}>
                                            {r.status === 'DISPONIVEL' ? '● Disponível' : r.status === 'INDISPONIVEL' ? '● Indisponível' : '● Manutenção'}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.82rem', color: '#636d7a', margin: '4px 0' }}>
                                        {r.tipo === 'SALA_ESTUDO' ? '🏛️ Sala de Estudo' : '💻 Computador'}
                                        {r.capacidade ? ` • 👥 ${r.capacidade} pessoas` : ''}
                                    </p>
                                    <div className="card-actions">
                                        <button onClick={() => { setIsEditingRecurso(true); setModalRecurso({ ...r }); }} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Editar</button>
                                        <button onClick={() => desativarRecurso(r)} style={{ background: '#f39c12', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Desativar</button>
                                        <button onClick={() => deletarRecurso(r.id)} className="btn-cancel-mobile">Excluir</button>
                                    </div>
                                </div>
                            ))}
                            {[...salas, ...computadores].length === 0 && (
                                <p style={{ textAlign: 'center', color: '#8b95a3', padding: 24 }}>Nenhum recurso cadastrado.</p>
                            )}
                        </div>
                    </div>
                )}

                {(activeTab === 'reservar-sala' || activeTab === 'reservar-comp') && (
                    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                        <div className="reserva-page-container">
                            {/* COLUNA ESQUERDA */}
                            <div className="reserva-card-section">
                                <h3>{activeTab === 'reservar-sala' ? '🏛️ Escolha a Sala' : '💻 Escolha o Computador'}</h3>

                                {/* Admin: seleção de usuário */}
                                <div className="form-group" style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--primary-pale)', borderRadius: 10, border: '1.5px solid var(--primary-lighter)' }}>
                                    <label style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.83rem' }}>👤 Reservar para qual usuário? (Opcional)</label>
                                    <select value={reservaUsuarioId} onChange={e => setReservaUsuarioId(e.target.value)} style={{ marginTop: 6 }}>
                                        <option value="">Minha própria reserva (Admin)</option>
                                        {usuarios.map(u => (
                                            <option key={u.id} value={u.id}>{u.nome} &mdash; {u.nivelAcesso}</option>
                                        ))}
                                    </select>
                                </div>

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
                                <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
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
                                    <div className="form-group" style={{ marginTop: 16 }}>
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
                                <div className="form-group" style={{ marginTop: 16 }}>
                                    <label>Motivo (opcional):</label>
                                    <textarea rows="3" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Reunião, aula de reforço..."></textarea>
                                </div>

                                {/* Justificativa obrigatória para reservas acima de 2h */}
                                {horarioInicio && horarioFim && duracaoHoras() > 2 && (
                                    <div className="justificativa-section">
                                        <label>⚠️ Justificativa obrigatória — reserva acima de 2 horas ({duracaoHoras()}h)</label>
                                        <textarea
                                            value={justificativa}
                                            onChange={e => setJustificativa(e.target.value.slice(0, 500))}
                                            placeholder="Descreva detalhadamente o motivo desta reserva prolongada e o que será realizado neste período..."
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
                                    onClick={fazerReservaAdmin}
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

                {modalUser && (
                    <div className="modal">
                        <div className="modal-content" style={{ maxWidth: 500 }}>
                            <h3>Editar Usuário</h3>
                            <form onSubmit={salvarEdicaoUsuario}>
                                <div className="form-group">
                                    <label>Nome</label>
                                    <input required type="text" value={modalUser.nome || ''} onChange={e => setModalUser({ ...modalUser, nome: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input required type="email" value={modalUser.email || ''} onChange={e => setModalUser({ ...modalUser, email: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                                    <button type="button" onClick={() => setModalUser(null)} style={{ padding: '8px 15px', borderRadius: 4, cursor: 'pointer' }}>Cancelar</button>
                                    <button type="submit" style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: 4, cursor: 'pointer' }}>Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {modalRecurso && (
                    <div className="modal">
                        <div className="modal-content" style={{ maxWidth: 500 }}>
                            <h3>{isEditingRecurso ? 'Editar Recurso' : 'Novo Recurso'}</h3>
                            <form onSubmit={salvarRecurso}>
                                <div className="form-group">
                                    <label>Nome</label>
                                    <input required type="text" value={modalRecurso.nome || ''} onChange={e => setModalRecurso({ ...modalRecurso, nome: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Tipo</label>
                                    <select value={modalRecurso.tipo} onChange={e => setModalRecurso({ ...modalRecurso, tipo: e.target.value })}>
                                        <option value="SALA_ESTUDO">Sala de Estudo</option>
                                        <option value="COMPUTADOR">Computador</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Capacidade</label>
                                    <input required type="number" min="1" value={modalRecurso.capacidade || 1} onChange={e => setModalRecurso({ ...modalRecurso, capacidade: parseInt(e.target.value) })} />
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select value={modalRecurso.status} onChange={e => setModalRecurso({ ...modalRecurso, status: e.target.value })}>
                                        <option value="DISPONIVEL">Disponível</option>
                                        <option value="INDISPONIVEL">Indisponível</option>
                                        <option value="MANUTENCAO">Manutenção</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                                    <button type="button" onClick={() => setModalRecurso(null)} style={{ padding: '8px 15px', borderRadius: 4, cursor: 'pointer' }}>Cancelar</button>
                                    <button type="submit" style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: 4, cursor: 'pointer' }}>Salvar</button>
                                </div>
                            </form>
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
        </div>
    );
}