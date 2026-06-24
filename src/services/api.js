const API_URL = process.env.REACT_APP_API || 'http://localhost:8080';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const handleResponse = async (response) => {
    // 401 = sessão expirada — redirecionar para login
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userLogged');
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    // 403 = acesso negado (permissão insuficiente) — mostrar mensagem sem deslogar
    if (response.status === 403) {
        let msg = 'Acesso negado. Você não tem permissão para esta ação.';
        try {
            const errorData = await response.json();
            msg = errorData.erro || errorData.message || msg;
        } catch (e) { /* ignora */ }
        throw new Error(msg);
    }

    if (!response.ok) {
        let errorMessage = 'Erro na requisição';
        try {
            const errorData = await response.json();
            errorMessage = errorData.erro || errorData.message || errorMessage;
        } catch (e) {
            errorMessage = response.statusText;
        }
        throw new Error(errorMessage);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1) {
        return response.json();
    }
    return response.text();
};

export const api = {
    // Auth
    login: async (credentials) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        return handleResponse(res);
    },
    
    cadastro: async (userData) => {
        const res = await fetch(`${API_URL}/auth/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return handleResponse(res);
    },

    solicitarCodigo: async (email) => {
        const res = await fetch(`${API_URL}/auth/solicitar-codigo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return handleResponse(res);
    },

    recuperarSenha: async (data) => {
        const res = await fetch(`${API_URL}/auth/recuperar-senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    // Usuarios
    getUsuariosAtivos: async () => {
        const res = await fetch(`${API_URL}/usuarios/ativos`, { headers: getAuthHeaders() });
        return handleResponse(res);
    },
    cancelarMinhaConta: async (senha) => {
        const res = await fetch(`${API_URL}/usuarios/minha-conta`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ senha })
        });
        return handleResponse(res);
    },
    deletarUsuario: async (id) => {
        const res = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    },
    criarUsuarioAdmin: async (userData) => {
        const res = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });
        return handleResponse(res);
    },
    editarUsuario: async (id, userData) => {
        const res = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });
        return handleResponse(res);
    },
    hardDeletarUsuario: async (id) => {
        const res = await fetch(`${API_URL}/usuarios/${id}/hard`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    },

    // Recursos
    getRecursos: async () => {
        const res = await fetch(`${API_URL}/recursos`, { headers: getAuthHeaders() });
        return handleResponse(res);
    },
    criarRecurso: async (recursoData) => {
        const res = await fetch(`${API_URL}/recursos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(recursoData)
        });
        return handleResponse(res);
    },
    editarRecurso: async (id, recursoData) => {
        const res = await fetch(`${API_URL}/recursos/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(recursoData)
        });
        return handleResponse(res);
    },
    deletarRecurso: async (id) => {
        const res = await fetch(`${API_URL}/recursos/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    },
    // Assuming the backend has a way to get salas/computadores, if not we filter on frontend
    
    // Reservas
    fazerReserva: async (reservaData) => {
        const res = await fetch(`${API_URL}/reservas`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(reservaData)
        });
        return handleResponse(res);
    },
    getMinhasReservas: async () => {
        const res = await fetch(`${API_URL}/reservas/minhas`, { headers: getAuthHeaders() });
        return handleResponse(res);
    },
    cancelarReserva: async (id) => {
        const res = await fetch(`${API_URL}/reservas/${id}/cancelar`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    },
    getTodasReservas: async () => {
        const res = await fetch(`${API_URL}/reservas/todas`, { headers: getAuthHeaders() });
        return handleResponse(res);
    },
    getPendentes: async () => {
        const res = await fetch(`${API_URL}/reservas/pendentes`, { headers: getAuthHeaders() });
        return handleResponse(res);
    },
    getConfirmadas: async () => {
        const res = await fetch(`${API_URL}/reservas/confirmadas`, { headers: getAuthHeaders() });
        return handleResponse(res);
    },
    aprovarReserva: async (id) => {
        const res = await fetch(`${API_URL}/reservas/${id}/aprovar`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    },
    recusarReserva: async (id) => {
        const res = await fetch(`${API_URL}/reservas/${id}/recusar`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    },
    fazerCheckin: async (id) => {
        const res = await fetch(`${API_URL}/reservas/${id}/checkin`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    },
    fazerCheckout: async (id) => {
        const res = await fetch(`${API_URL}/reservas/${id}/checkout`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    },
    confirmarPresenca: async (id) => {
        const res = await fetch(`${API_URL}/reservas/${id}/confirmar-presenca`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        return handleResponse(res);
    },
    bloquearHorario: async (reservaData) => {
        const res = await fetch(`${API_URL}/reservas/bloquear`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(reservaData)
        });
        return handleResponse(res);
    },
    buscarPorDataERecurso: async (recursoId, data) => {
        const res = await fetch(`${API_URL}/reservas/por-data?recursoId=${recursoId}&data=${data}`, { headers: getAuthHeaders() });
        return handleResponse(res);
    },

    // Relatorios
    getOcupacao: async () => {
        const res = await fetch(`${API_URL}/relatorios/ocupacao`, { headers: getAuthHeaders() });
        return handleResponse(res);
    }
};
