import React from 'react';
import { Link } from 'react-router-dom';

const Profile = () => {
  const user = JSON.parse(localStorage.getItem('wasoolUser') || '{}');
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Link to="/dashboard" style={styles.backBtn}>← رجوع</Link>
        <h2 style={styles.title}>👤 حسابي الشخصي</h2>
        <div style={styles.infoBox}>
          <p><strong>الاسم:</strong> {user.name}</p>
          <p><strong>رقم الجوال:</strong> {user.phone}</p>
          <p><strong>نوع الحساب:</strong> {user.type}</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0c1445, #3949ab)',
    padding: '20px',
    fontFamily: 'Cairo, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    padding: '30px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center'
  },
  backBtn: {
    display: 'inline-block',
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '16px',
    marginBottom: '20px'
  },
  title: { fontSize: '22px', color: '#1a237e', marginBottom: '15px' },
  infoBox: {
    background: '#f0f4ff',
    padding: '15px',
    borderRadius: '12px',
    textAlign: 'right'
  }
};

export default Profile;