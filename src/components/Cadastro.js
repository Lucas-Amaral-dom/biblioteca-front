import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Forms.css';

export default function Cadastro() {
    const [step, setStep] = useState(1);
    const [nome, setNome] = useState('');
    const [cpf, setCpf] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [categoria, setCategoria] = useState('');
    const [codigoVerificacao, setCodigoVerificacao] = useState('');
    const [dadosAdicionais, setDadosAdicionais] = useState({
        matricula: '',
        escolaridade: '',
        nomeFilho: '',
        matriculaFilho: '',
        parentesco: '',
        telefone: '',
        nomeEmpresa: '',
        cnpj: '',
        responsavel: '',
        telefoneEmpresa: '',
        emailEmpresa: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const validarCPF = (cpf) => {
        cpf = cpf.replace(/[^\d]/g, '');
        if (cpf.length !== 11) return false;
        if (/^(\d)\1+$/.test(cpf)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
        let digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(cpf.charAt(9))) return false;
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
        digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(cpf.charAt(10))) return false;
        return true;
    };

    const formatarCPF = (valor) => {
        valor = valor.replace(/\D/g, '');
        if (valor.length <= 11) {
            if (valor.length <= 3) return valor;
            if (valor.length <= 6) return `${valor.slice(0, 3)}.${valor.slice(3)}`;
            if (valor.length <= 9) return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6)}`;
            return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9, 11)}`;
        }
        return valor.slice(0, 14);
    };

    const handleCpfChange = (e) => {
        setCpf(formatarCPF(e.target.value));
        if (errors.cpf) setErrors({ ...errors, cpf: '' });
    };

    const handleDadosAdicionaisChange = (campo, valor) => {
        setDadosAdicionais({ ...dadosAdicionais, [campo]: valor });
        if (errors[campo]) setErrors({ ...errors, [campo]: '' });
    };

    const validarFormulario = () => {
        const newErrors = {};
        if (!nome.trim()) newErrors.nome = 'Nome é obrigatório';
        if (!cpf) newErrors.cpf = 'CPF é obrigatório';
        else if (!validarCPF(cpf)) newErrors.cpf = 'CPF inválido';
        if (!email) newErrors.email = 'E-mail é obrigatório';
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'E-mail inválido';
        if (!senha) newErrors.senha = 'Senha é obrigatória';
        else if (senha.length < 6) newErrors.senha = 'Mínimo 6 caracteres';
        if (!categoria) newErrors.categoria = 'Selecione o tipo de cadastro';

        if (categoria === 'aluno') {
            if (!dadosAdicionais.matricula) newErrors.matricula = 'Matrícula obrigatória';
            if (!dadosAdicionais.escolaridade) newErrors.escolaridade = 'Selecione a escolaridade';
        } else if (categoria === 'pai') {
            if (!dadosAdicionais.nomeFilho) newErrors.nomeFilho = 'Nome do filho obrigatório';
            if (!dadosAdicionais.matriculaFilho) newErrors.matriculaFilho = 'Matrícula do filho obrigatória';
            if (!dadosAdicionais.parentesco) newErrors.parentesco = 'Parentesco obrigatório';
            if (!dadosAdicionais.telefone) newErrors.telefone = 'Telefone obrigatório';
        } else if (categoria === 'empresa') {
            if (!dadosAdicionais.nomeEmpresa) newErrors.nomeEmpresa = 'Nome da empresa obrigatório';
            if (!dadosAdicionais.cnpj) newErrors.cnpj = 'CNPJ obrigatório';
            if (!dadosAdicionais.responsavel) newErrors.responsavel = 'Responsável obrigatório';
            if (!dadosAdicionais.telefoneEmpresa) newErrors.telefoneEmpresa = 'Telefone obrigatório';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSolicitarCodigo = async (e) => {
        e.preventDefault();
        if (!validarFormulario()) return;
        setLoading(true);
        try {
            await api.solicitarCodigo(email.trim());
            setStep(2);
            setErrors({});
        } catch (error) {
            console.error(error);
            setErrors({ geral: error.message || 'Erro ao solicitar código de verificação.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitCadastro = async (e) => {
        e.preventDefault();
        if (!codigoVerificacao) {
            setErrors({ codigoVerificacao: 'Informe o código enviado para o seu e-mail' });
            return;
        }
        setLoading(true);
        try {
            const dadosCadastro = {
                nome: nome.trim(),
                cpf: cpf.replace(/\D/g, ''),
                email: email.trim(),
                senha: senha,
                nivelAcesso: 'ALUNO',
                tipoUsuario: 'aluno',
                categoria: categoria,
                codigoVerificacao: codigoVerificacao.trim(),
                dadosAdicionais: JSON.stringify(dadosAdicionais)
            };
            
            await api.cadastro(dadosCadastro);
            
            alert('Cadastro realizado com sucesso!');
            navigate('/login');
        } catch (error) {
            console.error(error);
            setErrors({ geral: error.message || 'Erro ao realizar cadastro ou código inválido.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="cadastro-container">
            {step === 1 ? (
                <form onSubmit={handleSolicitarCodigo} className="cadastro-form">
                    <div className="login-header">
                        <img src={require('../assets/sesi_senai_logo.png')} alt="SESI SENAI" className="login-logo-img" />
                        <h2>Cadastro - Espaço do Estudante</h2>
                    </div>
                    {errors.geral && <div className="error-alert">{errors.geral}</div>}
                    <div className="form-group">
                        <label>Nome Completo:</label>
                        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className={errors.nome ? 'error' : ''} />
                        {errors.nome && <span className="error-message">{errors.nome}</span>}
                    </div>
                    <div className="form-group">
                        <label>CPF:</label>
                        <input type="text" value={cpf} onChange={handleCpfChange} maxLength="14" className={errors.cpf ? 'error' : ''} />
                        {errors.cpf && <span className="error-message">{errors.cpf}</span>}
                    </div>
                    <div className="form-group">
                        <label>E-mail:</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? 'error' : ''} />
                        {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>
                    <div className="form-group">
                        <label>Senha:</label>
                        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className={errors.senha ? 'error' : ''} />
                        {errors.senha && <span className="error-message">{errors.senha}</span>}
                    </div>
                    <div className="form-group">
                        <label>Tipo de Cadastro:</label>
                        <div className="radio-group">
                            <label><input type="radio" value="aluno" checked={categoria === 'aluno'} onChange={(e) => setCategoria(e.target.value)} /> Aluno</label>
                            <label><input type="radio" value="pai" checked={categoria === 'pai'} onChange={(e) => setCategoria(e.target.value)} /> Pai / Responsável</label>
                            <label><input type="radio" value="empresa" checked={categoria === 'empresa'} onChange={(e) => setCategoria(e.target.value)} /> Empresa</label>
                        </div>
                        {errors.categoria && <span className="error-message">{errors.categoria}</span>}
                    </div>

                    {categoria === 'aluno' && (
                        <div className="form-group-section">
                            <h3>Dados do Aluno</h3>
                            <div className="form-group">
                                <label>Matrícula:</label>
                                <input type="text" value={dadosAdicionais.matricula} onChange={(e) => handleDadosAdicionaisChange('matricula', e.target.value)} className={errors.matricula ? 'error' : ''} />
                                {errors.matricula && <span className="error-message">{errors.matricula}</span>}
                            </div>
                            <div className="form-group">
                                <label>Escolaridade:</label>
                                <select value={dadosAdicionais.escolaridade} onChange={(e) => handleDadosAdicionaisChange('escolaridade', e.target.value)} className={errors.escolaridade ? 'error' : ''}>
                                    <option value="">Selecione</option>
                                    <option value="Ensino Fundamental">Ensino Fundamental</option>
                                    <option value="Ensino Médio">Ensino Médio</option>
                                    <option value="Técnico">Técnico</option>
                                </select>
                                {errors.escolaridade && <span className="error-message">{errors.escolaridade}</span>}
                            </div>
                        </div>
                    )}

                    {categoria === 'pai' && (
                        <div className="form-group-section">
                            <h3>Dados do Responsável</h3>
                            <div className="form-group"><label>Nome do filho(a):</label><input type="text" value={dadosAdicionais.nomeFilho} onChange={(e) => handleDadosAdicionaisChange('nomeFilho', e.target.value)} className={errors.nomeFilho ? 'error' : ''} />{errors.nomeFilho && <span className="error-message">{errors.nomeFilho}</span>}</div>
                            <div className="form-group"><label>Matrícula do filho(a):</label><input type="text" value={dadosAdicionais.matriculaFilho} onChange={(e) => handleDadosAdicionaisChange('matriculaFilho', e.target.value)} className={errors.matriculaFilho ? 'error' : ''} />{errors.matriculaFilho && <span className="error-message">{errors.matriculaFilho}</span>}</div>
                            <div className="form-group"><label>Parentesco:</label><select value={dadosAdicionais.parentesco} onChange={(e) => handleDadosAdicionaisChange('parentesco', e.target.value)} className={errors.parentesco ? 'error' : ''}><option value="">Selecione</option><option value="Pai">Pai</option><option value="Mãe">Mãe</option><option value="Avô">Avô</option><option value="Avó">Avó</option><option value="Tio">Tio</option><option value="Tia">Tia</option><option value="Responsável Legal">Responsável Legal</option></select>{errors.parentesco && <span className="error-message">{errors.parentesco}</span>}</div>
                            <div className="form-group"><label>Telefone:</label><input type="tel" value={dadosAdicionais.telefone} onChange={(e) => handleDadosAdicionaisChange('telefone', e.target.value)} className={errors.telefone ? 'error' : ''} />{errors.telefone && <span className="error-message">{errors.telefone}</span>}</div>
                        </div>
                    )}

                    {categoria === 'empresa' && (
                        <div className="form-group-section">
                            <h3>Dados da Empresa</h3>
                            <div className="form-group"><label>Nome da Empresa:</label><input type="text" value={dadosAdicionais.nomeEmpresa} onChange={(e) => handleDadosAdicionaisChange('nomeEmpresa', e.target.value)} className={errors.nomeEmpresa ? 'error' : ''} />{errors.nomeEmpresa && <span className="error-message">{errors.nomeEmpresa}</span>}</div>
                            <div className="form-group"><label>CNPJ:</label><input type="text" value={dadosAdicionais.cnpj} onChange={(e) => handleDadosAdicionaisChange('cnpj', e.target.value)} className={errors.cnpj ? 'error' : ''} placeholder="00.000.000/0000-00" />{errors.cnpj && <span className="error-message">{errors.cnpj}</span>}</div>
                            <div className="form-group"><label>Responsável:</label><input type="text" value={dadosAdicionais.responsavel} onChange={(e) => handleDadosAdicionaisChange('responsavel', e.target.value)} className={errors.responsavel ? 'error' : ''} />{errors.responsavel && <span className="error-message">{errors.responsavel}</span>}</div>
                            <div className="form-group"><label>Telefone:</label><input type="tel" value={dadosAdicionais.telefoneEmpresa} onChange={(e) => handleDadosAdicionaisChange('telefoneEmpresa', e.target.value)} className={errors.telefoneEmpresa ? 'error' : ''} />{errors.telefoneEmpresa && <span className="error-message">{errors.telefoneEmpresa}</span>}</div>
                            <div className="form-group"><label>E-mail Comercial:</label><input type="email" value={dadosAdicionais.emailEmpresa} onChange={(e) => handleDadosAdicionaisChange('emailEmpresa', e.target.value)} /></div>
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="submit-btn">{loading ? 'Solicitando...' : 'Avançar e Verificar E-mail'}</button>
                    <div className="login-link">Já tem cadastro? <a href="/login">Faça login</a></div>
                </form>
            ) : (
                <form onSubmit={handleSubmitCadastro} className="cadastro-form">
                    <h2>Verificação de E-mail</h2>
                    <p style={{textAlign: 'center', marginBottom: 20}}>Um código de 6 dígitos foi enviado para <strong>{email}</strong>.</p>
                    {errors.geral && <div className="error-alert">{errors.geral}</div>}
                    <div className="form-group">
                        <label>Código de Verificação:</label>
                        <input type="text" value={codigoVerificacao} onChange={(e) => {
                            setCodigoVerificacao(e.target.value);
                            if (errors.codigoVerificacao) setErrors({ ...errors, codigoVerificacao: '' });
                        }} maxLength="6" style={{textAlign: 'center', letterSpacing: 4, fontSize: '1.2rem', padding: '15px'}} />
                        {errors.codigoVerificacao && <span className="error-message">{errors.codigoVerificacao}</span>}
                    </div>
                    <div style={{display: 'flex', gap: 10, marginTop: 20}}>
                        <button type="button" onClick={() => setStep(1)} className="submit-btn" style={{background: '#7f8c8d'}}>Voltar</button>
                        <button type="submit" disabled={loading} className="submit-btn">{loading ? 'Confirmando...' : 'Confirmar e Cadastrar'}</button>
                    </div>
                </form>
            )}
        </div>
    );
}