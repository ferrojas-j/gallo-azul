import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Edit2, Trash2, X, Check, Eye, EyeOff } from 'lucide-react';
import { dbAppUsers } from '../lib/supabaseService';
import type { AppUserRow } from '../lib/supabaseService';

export const UserManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUserRow | null>(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AppUserRow['role']>('Staff Hotel');
  
  const ROLES: AppUserRow['role'][] = ['Administrador', 'Encargado', 'Staff Hotel', 'Staff Resta', 'Servicios'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await dbAppUsers.getAll();
      if (error) console.error('Error loading users:', error);
      else if (data) setUsers(data as AppUserRow[]);
    } catch (err) {
      console.error('Exception loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) return alert('Debe ingresar un nombre de usuario');
    if (!editingUser && !password.trim()) return alert('Debe ingresar una contraseña para el nuevo usuario');

    const userData: any = { username, role };
    if (password.trim()) {
      userData.password = password.trim();
    }

    if (editingUser) {
      await dbAppUsers.update(editingUser.id, userData);
    } else {
      await dbAppUsers.insert(userData as any);
    }
    
    setShowModal(false);
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      await dbAppUsers.delete(id);
      fetchUsers();
    }
  };

  const openModal = (user?: AppUserRow) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setPassword(''); // Don't show existing password
      setRole(user.role);
    } else {
      setEditingUser(null);
      setUsername('');
      setPassword('');
      setRole('Staff Hotel');
    }
    setShowPassword(false);
    setShowModal(true);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>Control de Usuarios</h2>
        <button onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          <Plus size={18} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>No hay usuarios registrados</div>
        ) : (
          users.map((user) => (
            <div key={user.id} style={{ background: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{user.username}</div>
                <div>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '100px', 
                    fontSize: '13px', 
                    fontWeight: 600,
                    background: user.role === 'Administrador' ? '#fee2e2' : user.role === 'Encargado' ? '#fef3c7' : '#e0e7ff',
                    color: user.role === 'Administrador' ? '#991b1b' : user.role === 'Encargado' ? '#92400e' : '#3730a3'
                  }}>
                    {user.role}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => openModal(user)} style={{ background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(user.id)} style={{ background: '#fef2f2', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Nombre de usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                  placeholder="ej. juanperez"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Contraseña {editingUser && <span style={{ color: '#94a3b8', fontWeight: 400 }}>(dejar en blanco para no cambiar)</span>}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '12px', paddingRight: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                    placeholder="Contraseña de acceso"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)} 
                    style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Nivel de Acceso (Rol)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', backgroundColor: 'white' }}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#64748b' }}>
                  {role === 'Administrador' && 'Acceso total a todas las secciones.'}
                  {role === 'Encargado' && 'Acceso a Hotel y Restaurante. No puede ver finanzas ni usuarios ni data input.'}
                  {role === 'Staff Hotel' && 'Acceso exclusivo a la sección Hotel.'}
                  {role === 'Staff Resta' && 'Acceso exclusivo a la sección Restaurante.'}
                  {role === 'Servicios' && 'Acceso exclusivo a Staff y Registro de gastos.'}
                </div>
              </div>

              <button
                onClick={handleSave}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Check size={20} />
                <span>Guardar Usuario</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
