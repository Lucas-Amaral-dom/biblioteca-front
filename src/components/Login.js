import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Forms.css';

export default function Login() {
    const [cpf, setCpf] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const [showRecover, setShowRecover] = useState(false);
    const [recEmail, setRecEmail] = useState('');
    const [recSenha, setRecSenha] = useState('');
    const [msg, setMsg] = useState('');

    const formatarCPF = (valor) => {
        valor = valor.replace(/\D/g, '');
        if (valor.length <= 3) return valor;
        if (valor.length <= 6) return `${valor.slice(0,3)}.${valor.slice(3)}`;
        if (valor.length <= 9) return `${valor.slice(0,3)}.${valor.slice(3,6)}.${valor.slice(6)}`;
        return `${valor.slice(0,3)}.${valor.slice(3,6)}.${valor.slice(6,9)}-${valor.slice(9,11)}`;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!cpf || !senha) { setErrors({ geral: 'Preencha todos os campos' }); return; }
        setLoading(true);
        setMsg('');
        try {
            const cpfLimpo = cpf.replace(/\D/g, '');
            const response = await api.login({ cpf: cpfLimpo, senha });
            
            localStorage.setItem('token', response.token);
            localStorage.setItem('userLogged', JSON.stringify(response));

            if (response.tipoUsuario === 'ADMIN') navigate('/admin/dashboard');
            else if (response.tipoUsuario === 'PROFESSOR') navigate('/professor/dashboard');
            else navigate('/aluno/dashboard');
            
        } catch (error) {
            setErrors({ geral: error.message || 'Erro ao fazer login' });
        } finally {
            setLoading(false);
        }
    };

    const handleRecover = async (e) => {
        e.preventDefault();
        if (!cpf || !recEmail || !recSenha) { setErrors({ geral: 'Preencha todos os campos' }); return; }
        setLoading(true);
        setMsg('');
        try {
            const cpfLimpo = cpf.replace(/\D/g, '');
            const response = await api.recuperarSenha({ cpf: cpfLimpo, email: recEmail, novaSenha: recSenha });
            setMsg(response.mensagem || 'Senha alterada com sucesso!');
            setShowRecover(false);
            setSenha('');
            setRecEmail('');
            setRecSenha('');
        } catch (error) {
            setErrors({ geral: error.message || 'Erro ao recuperar senha' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">

                <div className="login-header">
                    <img src={require('../assets/sesi_senai_logo.png')} alt="SESI SENAI" className="login-logo-img" />
                    {showRecover && <h2>Recuperar Senha</h2>}
                </div>

                {errors.geral && <div className="error-alert">{errors.geral}</div>}
                {msg && <div className="success-alert" style={{color: 'green', marginBottom: '1rem', textAlign: 'center'}}>{msg}</div>}

                {!showRecover ? (
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <div className="input-icon-wrap">
                                <span className="input-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={cpf}
                                    onChange={(e) => { setCpf(formatarCPF(e.target.value)); if(errors.geral) setErrors({}); }}
                                    maxLength="14"
                                    placeholder="Login ou CPF"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="input-icon-wrap">
                                <span className="input-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                </span>
                                <input
                                    type={mostrarSenha ? 'text' : 'password'}
                                    value={senha}
                                    onChange={(e) => { setSenha(e.target.value); if(errors.geral) setErrors({}); }}
                                    placeholder="Senha"
                                />
                                <button type="button" className="input-eye" onClick={() => setMostrarSenha(v => !v)}>
                                    {mostrarSenha ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="login-btn">
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>

                        <a className="forgot-link" href="#!" onClick={(e) => {e.preventDefault(); setShowRecover(true); setErrors({}); setMsg('');}}>Esqueci minha senha</a>

                        <div className="signup-link" style={{ marginTop: '1rem' }}>
                            Não tem conta? <a href="/cadastro">Cadastre-se</a>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleRecover}>
                        <p style={{textAlign: 'center', marginBottom: '1rem', color: '#666'}}>Informe seu CPF, o e-mail cadastrado e a sua nova senha.</p>
                        
                        <div className="form-group">
                            <input
                                type="text"
                                value={cpf}
                                onChange={(e) => { setCpf(formatarCPF(e.target.value)); if(errors.geral) setErrors({}); }}
                                maxLength="14"
                                placeholder="Seu CPF"
                                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc'}}
                            />
                        </div>

                        <div className="form-group">
                            <input
                                type="email"
                                value={recEmail}
                                onChange={(e) => { setRecEmail(e.target.value); if(errors.geral) setErrors({}); }}
                                placeholder="Seu E-mail"
                                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc'}}
                            />
                        </div>

                        <div className="form-group">
                            <input
                                type="password"
                                value={recSenha}
                                onChange={(e) => { setRecSenha(e.target.value); if(errors.geral) setErrors({}); }}
                                placeholder="Nova Senha"
                                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc'}}
                            />
                        </div>

                        <button type="submit" disabled={loading} className="login-btn">
                            {loading ? 'Alterando...' : 'Alterar Senha'}
                        </button>

                        <div className="signup-link" style={{ marginTop: '1rem' }}>
                            <a href="#!" onClick={(e) => {e.preventDefault(); setShowRecover(false); setErrors({}); setMsg('');}}>Voltar para o Login</a>
                        </div>
                    </form>
                )}

                <div className="form-footer-links">
                    <a href="#termos">Termos de uso</a>
                    <a href="#privacidade">Política de privacidade</a>
                </div>
            </div>
        </div>
    );
}