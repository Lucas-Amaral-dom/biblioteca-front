import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children, allowedTypes = [] }) {
    const userLogged = JSON.parse(localStorage.getItem('userLogged'));
    
    if (!userLogged) {
        return <Navigate to="/login" replace />;
    }
    
    if (allowedTypes.length > 0 && !allowedTypes.includes(userLogged.tipoUsuario)) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return children;
}